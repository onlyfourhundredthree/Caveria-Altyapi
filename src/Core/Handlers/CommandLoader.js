const fs = require("fs");

module.exports = (client) => {
    const loadCommands = (dir) => {
        if (!fs.existsSync(dir)) return;
        fs.readdir(dir, (err, files) => {
            if (err) return console.error(err);
            files.forEach(file => {
                const filePath = `${dir}/${file}`;
                fs.stat(filePath, (err, stats) => {
                    if (err) return console.error(err);
                    if (stats.isDirectory()) {
                        loadCommands(filePath);
                    } else if (file.endsWith(".js")) {
                        try {
                            const props = require("../../../" + filePath.replace('./', ''));
                            if (props.conf) {
                                let mainName = props.conf.name;
                                let aliasList = props.conf.aliases || [];

                                if (props.conf.usages && props.conf.usages.length > 0) {
                                    mainName = props.conf.usages[0];
                                    aliasList = props.conf.usages.slice(1);
                                }

                                if (mainName) {
                                    client.commands.set(mainName, props);
                                    aliasList.forEach(alias => {
                                        client.aliases.set(alias, mainName);
                                    });
                                }
                            } else if (props.name && Array.isArray(props.name)) {
                                const primaryName = props.name[0];
                                client.commands.set(primaryName, props);
                                props.name.slice(1).forEach(alias => {
                                    client.aliases.set(alias, primaryName);
                                });
                            } else if (props.name && typeof props.name === "string") {
                                client.commands.set(props.name, props);
                            }
                        } catch (e) {
                            console.error(`Failed to load command ${file}:`, e);
                        }
                    }
                });
            });
        });
    };

    loadCommands("./src/Commands/Prefix");
};
