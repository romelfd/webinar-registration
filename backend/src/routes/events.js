const express = require("express");
const pool = require("../db/pool");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

// GET /api/events -> events with their sessions and remaining capacity
router.get("/", asyncHandler(async (req, res) => {
  const [events] = await pool.query(
    "SELECT id, title, description, event_date FROM events ORDER BY event_date ASC"
  );

  const [sessions] = await pool.query(`
    SELECT
      s.id, s.event_id, s.name, s.capacity, s.starts_at,
      COUNT(CASE WHEN r.status = 'confirmed' THEN 1 END) AS confirmed_count
    FROM sessions s
    LEFT JOIN registrants r ON r.session_id = s.id
    GROUP BY s.id, s.event_id, s.name, s.capacity, s.starts_at
  `);

  const byEvent = events.map((event) => ({
    ...event,
    sessions: sessions
      .filter((s) => s.event_id === event.id)
      .map((s) => ({
        id: s.id,
        name: s.name,
        startsAt: s.starts_at,
        capacity: s.capacity,
        remaining: Math.max(s.capacity - s.confirmed_count, 0),
        isFull: s.confirmed_count >= s.capacity,
      })),
  }));

  res.json(byEvent);
}));

module.exports = router;
