const { ModalBuilder, TextInputBuilder, RoleSelectMenuBuilder, ChannelSelectMenuBuilder, UserSelectMenuBuilder, StringSelectMenuBuilder, LabelBuilder } = require("discord.js");

class V2ModalBuilder {
    constructor() {
        this.modal = new ModalBuilder();
        this.labelComponents = [];
    }

    setCustomId(id) {
        this.modal.setCustomId(id);
        return this;
    }

    setTitle(title) {
        this.modal.setTitle(title);
        return this;
    }

    addTextInput(options) {
        const input = new TextInputBuilder()
            .setCustomId(options.customId)
            .setStyle(options.style)
            .setRequired(options.required ?? false);

        if (options.placeholder) input.setPlaceholder(options.placeholder);
        if (options.value) input.setValue(options.value);
        if (options.maxLength) input.setMaxLength(options.maxLength);
        if (options.minLength) input.setMinLength(options.minLength);

        const label = new LabelBuilder()
            .setLabel(options.label || "Metin Girdisi:")
            .setTextInputComponent(input);

        this.labelComponents.push(label);
        return this;
    }

    addRoleSelect(options) {
        const select = new RoleSelectMenuBuilder()
            .setCustomId(options.customId);
        
        if (options.placeholder) select.setPlaceholder(options.placeholder);
        if (options.minValues !== undefined) select.setMinValues(options.minValues);
        if (options.maxValues !== undefined) select.setMaxValues(options.maxValues);
        if (options.required !== undefined) select.setRequired(options.required);

        const label = new LabelBuilder()
            .setLabel(options.label || "Lütfen bir rol seçiniz:")
            .setRoleSelectMenuComponent(select);

        this.labelComponents.push(label);
        return this;
    }

    addChannelSelect(options) {
        const select = new ChannelSelectMenuBuilder()
            .setCustomId(options.customId);

        if (options.placeholder) select.setPlaceholder(options.placeholder);
        if (options.minValues !== undefined) select.setMinValues(options.minValues);
        if (options.maxValues !== undefined) select.setMaxValues(options.maxValues);
        if (options.channelTypes) select.setChannelTypes(options.channelTypes);
        if (options.required !== undefined) select.setRequired(options.required);

        const label = new LabelBuilder()
            .setLabel(options.label || "Lütfen bir kanal seçiniz:")
            .setChannelSelectMenuComponent(select);

        this.labelComponents.push(label);
        return this;
    }

    addUserSelect(options) {
        const select = new UserSelectMenuBuilder()
            .setCustomId(options.customId);
        
        if (options.placeholder) select.setPlaceholder(options.placeholder);
        if (options.minValues !== undefined) select.setMinValues(options.minValues);
        if (options.maxValues !== undefined) select.setMaxValues(options.maxValues);
        if (options.required !== undefined) select.setRequired(options.required);

        const label = new LabelBuilder()
            .setLabel(options.label || "Lütfen bir kullanıcı seçiniz:")
            .setUserSelectMenuComponent(select);

        this.labelComponents.push(label);
        return this;
    }

    addStringSelect(options) {
        const select = new StringSelectMenuBuilder()
            .setCustomId(options.customId);
        
        if (options.placeholder) select.setPlaceholder(options.placeholder);
        if (options.minValues !== undefined) select.setMinValues(options.minValues);
        if (options.maxValues !== undefined) select.setMaxValues(options.maxValues);
        if (options.options) select.addOptions(options.options);
        if (options.required !== undefined) select.setRequired(options.required);

        const label = new LabelBuilder()
            .setLabel(options.label || "Lütfen bir seçenek seçiniz:")
            .setStringSelectMenuComponent(select);

        this.labelComponents.push(label);
        return this;
    }

    build() {
        if (this.labelComponents.length > 0) {
            this.modal.addLabelComponents(...this.labelComponents);
        }
        return this.modal;
    }
}

module.exports = { V2ModalBuilder };
