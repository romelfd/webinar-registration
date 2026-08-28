require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const eventRoutes = require("./routes/events");
const registrantRoutes = require("./routes/registrants");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api", registrantRoutes); // exposes /api/register and /api/admin/*

// Centralized error handler — keeps route handlers free of try/catch boilerplate
// for anything that isn't already handled locally.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
