// One-shot migration runner: splits schema.sql on ";" and executes each statement.
// Usage: npm run migrate
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("./pool");

async function migrate() {
  const sqlPath = path.join(__dirname, "schema.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  const conn = await pool.getConnection();
  try {
    for (const statement of statements) {
      console.log(`Running: ${statement.slice(0, 60)}...`);
      await conn.query(statement);
    }
    console.log(`Migration complete — ${statements.length} statements executed.`);
  } finally {
    conn.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
