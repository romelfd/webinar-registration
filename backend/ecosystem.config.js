// pm2 process definition — deployed alongside the app so `pm2 startOrReload`
// always has a config to read, even for the very first release.
module.exports = {
  apps: [
    {
      name: "webinar-api",
      script: "src/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
        DB_HOST: "127.0.0.1",
        DB_USER: "webinar_app",
        DB_PASSWORD: process.env.DB_PASSWORD || "CHANGE_ME_SEE_README",
        DB_NAME: "webinar_registration",
        JWT_SECRET: process.env.JWT_SECRET || "CHANGE_ME_SEE_README",
      },
    },
  ],
};
