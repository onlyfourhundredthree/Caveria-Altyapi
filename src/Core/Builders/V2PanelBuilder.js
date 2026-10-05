const { ActionRowBuilder } = require("discord.js");

class V2PanelBuilder {
    constructor() {
        this.data = {
            type: 17,
            components: []
        };
        this.rootComponents = [];
    }

    setAccentColor(color) {
        this.data.accent_color = color;
        return this;
    }

    addText(content) {
        this.data.components.push({
            type: 10,
            content: content
        });
        return this;
    }

    addDivider(spacing = 1) {
        this.data.components.push({
            type: 14,
            divider: true,
            spacing: spacing
        });
        return this;
    }

    addAccessory(mediaUrl, textContent) {
        this.data.components.push({
            type: 9,
            accessory: {
                type: 11,
                media: { url: mediaUrl }
            },
            components: [
                {
                    type: 10,
                    content: textContent
                }
            ]
        });
        return this;
    }

    addActionRow(actionRowBuilder) {
        if (typeof actionRowBuilder.toJSON === 'function') {
            this.data.components.push(actionRowBuilder.toJSON());
        } else {
            this.data.components.push(actionRowBuilder);
        }
        return this;
    }

    addMediaGallery(items) {
        if (!items || !Array.isArray(items) || items.length === 0) return this;
        const formattedItems = items.map(item => {
            let rawUrl = typeof item === 'string' ? item : (item?.url || item?.media?.url || "");
            rawUrl = String(rawUrl).trim();
            let isValid = false;
            try {
                const u = new URL(rawUrl);
                isValid = u.protocol === 'http:' || u.protocol === 'https:';
            } catch (e) {
                isValid = false;
            }
            return isValid ? { media: { url: rawUrl } } : null;
        }).filter(Boolean);

        if (formattedItems.length > 0) {
            this.data.components.push({
                type: 12,
                items: formattedItems
            });
        }
        return this;
    }

    addImage(mediaUrl) {
        return this.addMediaGallery([mediaUrl]);
    }

    addFile(url, spoiler = false) {
        this.data.components.push({
            type: 13,
            file: { url: url },
            spoiler: spoiler
        });
        return this;
    }

    addFileUpload(options) {
        let FileUploadBuilder;
        try {
            FileUploadBuilder = require("discord.js").FileUploadBuilder;
        } catch (e) {}

        let fileUploadComponent;
        if (FileUploadBuilder) {
            fileUploadComponent = new FileUploadBuilder(options);
        } else {
            fileUploadComponent = Object.assign({ type: 19 }, options); 
        }

        const jsonFormat = typeof fileUploadComponent.toJSON === "function" ? fileUploadComponent.toJSON() : fileUploadComponent;
        this.rootComponents.push(jsonFormat);
        return this;
    }

    toJSON() {
        return [this.data, ...this.rootComponents];
    }
}

module.exports = { V2PanelBuilder };
