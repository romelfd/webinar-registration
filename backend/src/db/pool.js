const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "webinar_app",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "webinar_registration",
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
});

module.exports = pool;
