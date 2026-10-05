const axios = require("axios");
const Settings = require("../../../Settings.json");

class RiotManager {
    constructor() {
        this.riotKey = Settings.RiotApiKey;
        this.henrikKey = Settings.HenrikApiKey;

        if (!this.riotKey || this.riotKey.includes("YOUR")) {
            console.error("[RiotManager] UYARI: Riot API Key henüz ayarlanmamış veya varsayılan değerde!");
        }

        this.henrikBase = "https://api.henrikdev.xyz/valorant";
        this.riotBase = "https://europe.api.riotgames.com";
        this.lolBase = "https://tr1.api.riotgames.com";
    }


    async getAccountInfo(gameName, tagLine) {
        try {
            const url = `${this.riotBase}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
            const response = await axios.get(url, {
                headers: { "X-Riot-Token": this.riotKey }
            });
            return response.data; 
        } catch (err) {
            if (err.response?.status === 429) return "RATE_LIMIT";
            console.error("Account API Hatası:", err.response?.data || err.message);
            return null;
        }
    }


    async getSummonerIconId(puuid, region = "tr1") {
        try {
            const response = await axios.get(`https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`, {
                headers: { "X-Riot-Token": this.riotKey }
            });
            return response.data?.profileIconId;
        } catch (err) {
            if (err.response?.status === 429) return "RATE_LIMIT";
            console.error("Summoner Icon API Hatası:", err.response?.data || err.message);
            return null;
        }
    }


    async getLolRank(puuid, region = "tr1") {
        try {
            const leagueRes = await axios.get(`https://${region}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`, {
                headers: { "X-Riot-Token": this.riotKey }
            });

            const soloQ = leagueRes.data.find(x => x.queueType === "RANKED_SOLO_5x5");
            const flexQ = leagueRes.data.find(x => x.queueType === "RANKED_FLEX_SR");

            return {
                solo: soloQ ? `${soloQ.tier} ${soloQ.rank} (${soloQ.leaguePoints} LP)` : "Unranked",
                flex: flexQ ? `${flexQ.tier} ${flexQ.rank} (${flexQ.leaguePoints} LP)` : "Unranked"
            };
        } catch (err) {
            if (err.response?.status === 429) return "RATE_LIMIT";
            console.error("League API Hatası:", err.response?.data || err.message);
            return null;
        }
    }


    async getValoRank(gameName, tagLine, region = "eu", platform = "pc") {
        try {
            const url = `${this.henrikBase}/v3/mmr/${region}/${platform}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
            const response = await axios.get(url, {
                headers: { "Authorization": this.henrikKey }
            });

            if (response.data?.status === 200) {
                const data = response.data.data;
                return {
                    tier: data.current?.tier?.name || "Unrated",
                    point: data.current?.rr || 0,
                    image: null
                };
            }
            return null;
        } catch (err) {
            if (err.response?.status === 429) return "RATE_LIMIT";
            console.error("Henrik API V3 Hatası:", err.response?.data || err.message);
            return null;
        }
    }


    async getValoPlayerCard(gameName, tagLine) {
        try {
            const url = `${this.henrikBase}/v2/account/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?force=true`;
            const response = await axios.get(url, {
                headers: { "Authorization": this.henrikKey }
            });

            if (response.data?.status === 200) {
                return {
                    card: response.data.data.card,
                    title: response.data.data.title,
                    updated_at: response.data.data.updated_at
                };
            }
            return null;
        } catch (err) {
            if (err.response?.status === 429) return "RATE_LIMIT";
            console.error("Henrik API V2 Account Hatası:", err.response?.data || err.message);
            return null;
        }
    }
}

module.exports = new RiotManager();
