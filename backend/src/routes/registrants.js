const express = require("express");
const pool = require("../db/pool");
const { requireAdmin } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/register  { sessionId, fullName, email, company }
// Public endpoint. Confirms the registrant, or waitlists them if the session is full.
router.post("/register", async (req, res) => {
  const { sessionId, fullName, email, company } = req.body;

  if (!sessionId || !fullName || !email) {
    return res.status(400).json({ error: "sessionId, fullName, and email are required" });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "email is not a valid address" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lock the session row so two concurrent registrations can't both slip
    // past capacity — this is the kind of race condition worth calling out
    // explicitly in an interview.
    const [sessionRows] = await conn.query(
      "SELECT id, capacity FROM sessions WHERE id = :sessionId FOR UPDATE",
      { sessionId }
    );
    const session = sessionRows[0];
    if (!session) {
      await conn.rollback();
      return res.status(404).json({ error: "Session not found" });
    }

    const [[{ confirmedCount }]] = await conn.query(
      `SELECT COUNT(*) AS confirmedCount FROM registrants
       WHERE session_id = :sessionId AND status = 'confirmed'`,
      { sessionId }
    );

    const status = confirmedCount < session.capacity ? "confirmed" : "waitlisted";

    await conn.query(
      `INSERT INTO registrants (session_id, full_name, email, company, status)
       VALUES (:sessionId, :fullName, :email, :company, :status)`,
      { sessionId, fullName, email, company: company || null, status }
    );

    await conn.commit();
    res.status(201).json({ status });
  } catch (err) {
    await conn.rollback();
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "This email is already registered for this session" });
    }
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  } finally {
    conn.release();
  }
});

// GET /api/admin/registrants?search=&sessionId=  (auth required)
router.get("/admin/registrants", requireAdmin, asyncHandler(async (req, res) => {
  const { search, sessionId } = req.query;
  const conditions = [];
  const params = {};

  if (search) {
    conditions.push("(full_name LIKE :search OR email LIKE :search OR company LIKE :search)");
    params.search = `%${search}%`;
  }
  if (sessionId) {
    conditions.push("session_id = :sessionId");
    params.sessionId = sessionId;
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [rows] = await pool.query(
    `SELECT id, session_id, full_name, email, company, status, registered_at
     FROM registrants ${where} ORDER BY registered_at DESC`,
    params
  );
  res.json(rows);
}));

// GET /api/admin/registrants/export.csv  (auth required)
router.get("/admin/registrants/export.csv", requireAdmin, asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT full_name, email, company, status, registered_at FROM registrants ORDER BY registered_at DESC`
  );

  const header = "full_name,email,company,status,registered_at";
  const lines = rows.map((r) =>
    [r.full_name, r.email, r.company || "", r.status, r.registered_at.toISOString()]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=registrants.csv");
  res.send([header, ...lines].join("\n"));
}));

module.exports = router;
