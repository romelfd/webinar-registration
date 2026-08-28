const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");
const { JWT_SECRET } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

// POST /api/auth/login  { email, password } -> { token }
router.post("/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const [rows] = await pool.query(
    "SELECT id, email, password_hash FROM admins WHERE email = :email",
    { email }
  );
  const admin = rows[0];
  if (!admin) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { sub: admin.id, email: admin.email, role: "admin" },
    JWT_SECRET,
    { expiresIn: "8h" }
  );
  res.json({ token });
}));

module.exports = router;
