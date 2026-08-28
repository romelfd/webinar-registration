-- MySQL schema for the Webinar Registration Platform
-- Run via: npm run migrate  (see src/db/migrate.js)

CREATE TABLE IF NOT EXISTS events (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  event_date    DATETIME NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  event_id      INT NOT NULL,
  name          VARCHAR(255) NOT NULL,
  capacity      INT NOT NULL DEFAULT 100,
  starts_at     DATETIME NOT NULL,
  CONSTRAINT fk_sessions_event
    FOREIGN KEY (event_id) REFERENCES events(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS registrants (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  session_id    INT NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  company       VARCHAR(255),
  status        ENUM('confirmed', 'waitlisted') NOT NULL DEFAULT 'confirmed',
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_registrants_session
    FOREIGN KEY (session_id) REFERENCES sessions(id)
    ON DELETE CASCADE,
  CONSTRAINT uq_registrant_per_session UNIQUE (session_id, email)
);

CREATE TABLE IF NOT EXISTS admins (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL
);

CREATE INDEX idx_registrants_session ON registrants (session_id);
CREATE INDEX idx_sessions_event ON sessions (event_id);
