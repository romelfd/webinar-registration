// Usage: node scripts/create-admin.js admin@example.com adminpass
// Avoids all shell-quoting issues with bcrypt hashes by inserting directly
// through Node instead of building a SQL string by hand in PowerShell/bash.
require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("../src/db/pool");

async function main() {
  const [, , email, password] = process.argv;
  if (!email || !password) {
    console.error("Usage: node scripts/create-admin.js <email> <password>");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    "INSERT INTO admins (email, password_hash) VALUES (:email, :hash) " +
      "ON DUPLICATE KEY UPDATE password_hash = :hash",
    { email, hash }
  );
  console.log(`Admin ready: ${email}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});