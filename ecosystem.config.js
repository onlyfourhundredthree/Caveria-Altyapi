module.exports = {
  apps: [
    {
      name: "caveria-bot",
      script: "index.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        TZ: "Europe/Istanbul"
      },
      env_development: {
        NODE_ENV: "development",
        TZ: "Europe/Istanbul"
      },
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true
    }
  ]
};
