const fs = require("fs");
const client = global.bot;

const files = fs.readdirSync("./src/Events").filter((file) => file.endsWith(".js"));

files.forEach((file) => {
  try {
    let prop = require(`../../Events/${file}`);
    if (!prop.conf || !prop.conf.name) return;

    client.on(prop.conf.name, (...args) => {
      if (prop.conf.name === "interactionCreate") {
        global.interactionStore.run(args[0], () => prop(...args));
      } else {
        prop(...args);
      }
    });

  } catch (err) {
    console.error(`[EventLoader] ${file} yüklenirken hata oluştu:`, err);
  }
});
