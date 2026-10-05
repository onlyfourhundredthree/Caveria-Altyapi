const mongoose = require("mongoose");
const Settings = require("../../../Settings.json");
const ConfigManager = require("./ConfigManager");

mongoose.set("strictQuery", true);

let lastLogTime = 0;
function log(msg, type = "log") {
    const now = Date.now();
    if (now - lastLogTime > 10_000) {
        console[type](msg);
        lastLogTime = now;
    }
}

let isConnecting = false;

async function connectDB() {
    if (isConnecting) return;
    isConnecting = true;

    try {
        await mongoose.connect(Settings.MongoURL, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            family: 4
        });
    } catch (err) {
        log(`${ConfigManager.get("Emojis.toji_iptal") || "✨"} MongoDB bağlantı hatası: ${err.message}`, "error");

        setTimeout(() => {
            isConnecting = false;
            connectDB();
        }, 10_000);

        return;
    }

    isConnecting = false;
}

connectDB();

mongoose.connection.on("disconnected", () => {
    log("?? MongoDB disconnected");
});

mongoose.connection.on("error", (err) => {
    log(`?? MongoDB error: ${err.message}`, "error");
});

process.on("SIGINT", async () => {
    await mongoose.connection.close();
    console.warn("?? MongoDB bağlantısı kapatıldı");
    process.exit(0);
});

module.exports = mongoose;

