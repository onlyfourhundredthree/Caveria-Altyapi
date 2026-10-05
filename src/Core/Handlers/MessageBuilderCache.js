/**
 * MessageBuilderCache - V2 Components Draft State Manager
 * Container, Section, TextDisplay, Separator, MediaGallery, File, ActionRow desteği
 */
class MessageBuilderCache {
    constructor() {
        this.cache = new Map();
    }

    getDraft(userId) {
        if (!this.cache.has(userId)) {
            this.cache.set(userId, {
                containerColor: null,
                containerSpoiler: false,
                components: [],
                previewId: null,
                dashboardId: null,
                channelId: null,
                editIndex: null,
                // Düzenleme modu için
                editMode: false,
                editMessageId: null,
                editMessageChannelId: null
            });
        }
        return this.cache.get(userId);
    }

    updateDraft(userId, data) {
        const current = this.getDraft(userId);
        Object.assign(current, data);
        this.cache.set(userId, current);
    }

    addComponent(userId, component) {
        const draft = this.getDraft(userId);
        draft.components.push(component);
    }

    removeComponent(userId, index) {
        const draft = this.getDraft(userId);
        if (index >= 0 && index < draft.components.length) {
            draft.components.splice(index, 1);
        }
    }

    moveComponent(userId, fromIndex, direction) {
        const draft = this.getDraft(userId);
        const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
        if (toIndex < 0 || toIndex >= draft.components.length) return;
        [draft.components[fromIndex], draft.components[toIndex]] = [draft.components[toIndex], draft.components[fromIndex]];
    }

    clearDraft(userId) {
        this.cache.delete(userId);
    }

    /**
     * Taslağı Discord API V2 payload formatına çevirir.
     * Component ID'leri otomatik atanır.
     */
    buildPayload(userId) {
        const draft = this.getDraft(userId);
        if (draft.components.length === 0) return null;

        // Component ID'lerini ata (1'den başlayarak)
        let idCounter = 1;
        const taggedComponents = draft.components.map(c => {
            const comp = JSON.parse(JSON.stringify(c)); // deep clone
            comp.id = idCounter++;

            // İç bileşenlerin ID'lerini de ata
            if (comp.components) {
                comp.components = comp.components.map(inner => {
                    inner.id = idCounter++;
                    return inner;
                });
            }
            if (comp.accessory) {
                comp.accessory.id = idCounter++;
            }
            if (comp.items) {
                comp.items = comp.items.map(item => {
                    // MediaGallery items don't have ID, skip
                    return item;
                });
            }
            return comp;
        });

        const container = { type: 17, components: taggedComponents };
        container.id = idCounter++;
        if (draft.containerColor !== null) container.accent_color = draft.containerColor;
        if (draft.containerSpoiler) container.spoiler = true;

        return {
            components: [container],
            flags: 1 << 15 // IS_COMPONENTS_V2
        };
    }

    /**
     * Mevcut bir mesajın V2 bileşenlerini parse edip cache'e yükler.
     */
    loadFromMessage(userId, message) {
        const draft = this.getDraft(userId);

        if (!message.components || message.components.length === 0) return false;

        // İlk Container'ı bul
        const rawComponents = message.components.map(c => c.data || c);
        const container = rawComponents.find(c => c.type === 17);

        if (!container) return false;

        draft.containerColor = container.accent_color || null;
        draft.containerSpoiler = container.spoiler || false;
        draft.components = (container.components || []).map(c => this._cleanComponent(c));

        return true;
    }

    /**
     * Discord'dan gelen bileşeni temizler (gereksiz alanları kaldırır)
     */
    _cleanComponent(comp) {
        const c = { type: comp.type };

        switch (comp.type) {
            case 10: // TextDisplay
                c.content = comp.content || "";
                break;
            case 9: // Section
                c.components = (comp.components || []).map(inner => this._cleanComponent(inner));
                if (comp.accessory) {
                    c.accessory = this._cleanComponent(comp.accessory);
                }
                break;
            case 14: // Separator
                c.divider = comp.divider !== undefined ? comp.divider : true;
                c.spacing = comp.spacing || 1;
                break;
            case 12: // MediaGallery
                c.items = (comp.items || []).map(item => {
                    const i = { media: { url: item.media?.url || item.url || "" } };
                    if (item.description) i.description = item.description;
                    if (item.spoiler) i.spoiler = true;
                    return i;
                });
                break;
            case 13: // File
                c.file = { url: comp.file?.url || comp.url || "" };
                if (comp.spoiler) c.spoiler = true;
                break;
            case 1: // ActionRow
                c.components = (comp.components || []).map(inner => this._cleanComponent(inner));
                break;
            case 2: // Button
                c.style = comp.style || 5;
                c.label = comp.label || "";
                if (comp.url) c.url = comp.url;
                if (comp.custom_id) c.custom_id = comp.custom_id;
                if (comp.emoji) c.emoji = comp.emoji;
                break;
            case 11: // Thumbnail
                c.media = { url: comp.media?.url || comp.url || "" };
                if (comp.description) c.description = comp.description;
                break;
            default:
                return comp; // Bilinmeyen tipleri olduğu gibi sakla
        }

        return c;
    }

    /**
     * Bileşen listesini okunabilir bir özet olarak döndürür.
     */
    getComponentSummary(userId) {
        const draft = this.getDraft(userId);
        if (draft.components.length === 0) return "*(Henüz bileşen eklenmedi)*";

        return draft.components.map((c, i) => {
            const num = `\`${i + 1}.\``;
            switch (c.type) {
                case 10: {
                    const preview = (c.content || "").substring(0, 40).replace(/\n/g, " ");
                    return `${num} 📝 **Metin:** ${preview}${(c.content || "").length > 40 ? "..." : ""}`;
                }
                case 9: {
                    const texts = (c.components || []).filter(x => x.type === 10).map(x => x.content || "");
                    const preview = texts.join(" | ").substring(0, 35);
                    let accLabel = "Yok";
                    if (c.accessory) {
                        if (c.accessory.type === 11) accLabel = "🖼️ Thumbnail";
                        else if (c.accessory.type === 2) accLabel = `🔘 Buton: ${c.accessory.label || ""}`;
                    }
                    return `${num} 📋 **Bölüm:** ${preview}... → ${accLabel}`;
                }
                case 14:
                    return `${num} ➖ **Ayırıcı** (${c.divider ? "Çizgili" : "Boşluk"}, ${c.spacing === 2 ? "Büyük" : "Küçük"})`;
                case 12: {
                    const imgCount = c.items?.length || 0;
                    return `${num} 🖼️ **Medya Galerisi** (${imgCount} görsel)`;
                }
                case 13:
                    return `${num} 📎 **Dosya:** ${c.file?.url || ""}`;
                case 1: {
                    const btnCount = c.components?.length || 0;
                    const labels = (c.components || []).map(b => b.label || "?").join(", ");
                    return `${num} 🔳 **Buton Satırı** (${btnCount}): ${labels}`;
                }
                default:
                    return `${num} ❓ **Bilinmeyen** (type: ${c.type})`;
            }
        }).join("\n");
    }
}

module.exports = new MessageBuilderCache();
