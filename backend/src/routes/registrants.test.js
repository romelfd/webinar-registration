// Lightweight tests using Node's built-in test runner (node --test) — no
// extra test framework dependency needed. These were scaffolded with an AI
// assistant (see README "AI-assisted development log") and then reviewed
// and adjusted by hand, particularly the invalid-email case.
const test = require("node:test");
const assert = require("node:assert/strict");

// The email regex is duplicated here on purpose rather than importing the
// route file (which requires a live DB pool at import time) — worth
// mentioning in an interview as a seam that argues for extracting
// validation into its own testable module.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

test("accepts a well-formed email", () => {
  assert.equal(EMAIL_RE.test("alice@example.com"), true);
});

test("rejects an email missing the @", () => {
  assert.equal(EMAIL_RE.test("alice.example.com"), false);
});

test("rejects an email with spaces", () => {
  assert.equal(EMAIL_RE.test("alice smith@example.com"), false);
});

test("rejects an email missing a domain", () => {
  assert.equal(EMAIL_RE.test("alice@"), false);
});
