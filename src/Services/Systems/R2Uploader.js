const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { NodeHttpHandler } = require("@smithy/node-http-handler");
const http = require("http");
const https = require("https");
const crypto = require("crypto");
const Settings = require("../../../Settings.json");

class R2Uploader {
    constructor() {
        this.enabled = false;
        
        const r2Config = Settings.R2;
        if (r2Config && r2Config.Endpoint && !r2Config.Endpoint.includes("<account-id>")) {
            this.client = new S3Client({
                region: "auto",
                endpoint: r2Config.Endpoint,
                credentials: {
                    accessKeyId: r2Config.AccessKey,
                    secretAccessKey: r2Config.SecretKey
                },
                requestHandler: new NodeHttpHandler({
                    httpAgent: new http.Agent({ maxSockets: 300 }),
                    httpsAgent: new https.Agent({ maxSockets: 300 }),
                    socketAcquisitionWarningTimeout: 30000
                })
            });
            this.bucket = r2Config.BucketName;
            this.enabled = true;
            console.log("[R2Uploader] Cloudflare R2 Client initialized.");
        } else {
            console.log("[R2Uploader] R2 configuration is missing or default. Uploads will be skipped.");
        }
    }

    /**
     * Discord üzerinden gelen attachment url'sini fetch edip R2'ye yükler
     * @param {string} attachmentUrl Discord attachment URL'si
     * @param {string} filename Orijinal dosya adı
     * @returns {Promise<string|null>} Yüklenen dosyanın R2 public URL'si veya hata durumunda null
     */
    async uploadFromDiscord(attachmentUrl, filename, customFolder = null) {
        if (!this.enabled) return attachmentUrl; // R2 kapalıysa orijinal discord linkini döndür

        try {
            // Dosyayı indir
            const response = await fetch(attachmentUrl);
            if (!response.ok) throw new Error(`Failed to fetch attachment: ${response.statusText}`);
            
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const contentType = response.headers.get('content-type') || 'application/octet-stream';
            
            // Dosyanın MD5 özetini çıkarıyoruz (aynı dosya daha önce yüklendiyse hash'i aynı olur)
            const fileHash = crypto.createHash('md5').update(buffer).digest('hex');
            const fileExt = filename.includes('.') ? `.${filename.split('.').pop()}` : '';
            const folderName = customFolder ? customFolder : (filename.includes('_icon') ? 'role_icons' : 'ticket_uploads');
            
            // Yeni dosya adı olarak Hash kullanıyoruz (örn: ticket_uploads/a1b2c3d4e5f6g7h8.png)
            const uniqueFilename = `${folderName}/${fileHash}${fileExt}`;
            const publicDomain = Settings.R2.PublicDomain || Settings.R2.Endpoint;
            const finalUrl = `${publicDomain}/${uniqueFilename}`;

            const { HeadObjectCommand } = require("@aws-sdk/client-s3");
            try {
                // R2'ye sor: Bu isimde bir dosya zaten var mı?
                await this.client.send(new HeadObjectCommand({
                    Bucket: this.bucket,
                    Key: uniqueFilename
                }));
                // Eğer hata atmazsa dosya var demektir, tekrar yüklemeden linki ver!
                return finalUrl;
            } catch (headErr) {
                // Hata attıysa (404) dosya yoktur, normal şekilde yükle
                const command = new PutObjectCommand({
                    Bucket: this.bucket,
                    Key: uniqueFilename,
                    Body: buffer,
                    ContentType: contentType,
                });
                await this.client.send(command);
                return finalUrl;
            }

        } catch (error) {
            console.error("[R2Uploader] Error uploading file to R2:", error);
            return attachmentUrl; // Hata durumunda en azından orijinal linki koruyalım
        }
    }
}

module.exports = new R2Uploader();
