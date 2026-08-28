"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { api } from "../lib/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegistrationForm() {
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [form, setForm] = useState({ sessionId: "", fullName: "", email: "", company: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { status: 'confirmed' | 'waitlisted' } | null
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    api
      .getEvents()
      .then(setEvents)
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoadingEvents(false));
  }, []);

  function validate() {
    const errors = {};
    if (!form.sessionId) errors.sessionId = "Choose a session";
    if (!form.fullName.trim()) errors.fullName = "Full name is required";
    if (!EMAIL_RE.test(form.email)) errors.email = "Enter a valid email address";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError(null);
    setResult(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const data = await api.register({
        sessionId: Number(form.sessionId),
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        company: form.company.trim(),
      });
      setResult(data);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingEvents) {
    return (
      <Box display="flex" justifyContent="center" p={6}>
        <CircularProgress />
      </Box>
    );
  }

  if (loadError) {
    return (
      <Box p={4}>
        <Alert severity="error">Couldn't load events: {loadError}</Alert>
      </Box>
    );
  }

  const sessionOptions = events.flatMap((event) =>
    event.sessions.map((session) => ({
      id: session.id,
      label: `${event.title} — ${session.name}${session.isFull ? " (full, joins waitlist)" : ""}`,
    }))
  );

  if (result) {
    return (
      <Box maxWidth={480} mx="auto" mt={8} px={2}>
        <Alert severity={result.status === "confirmed" ? "success" : "info"}>
          {result.status === "confirmed"
            ? "You're registered! We'll email you the joining details."
            : "This session is full — you've been added to the waitlist and we'll notify you if a spot opens up."}
        </Alert>
      </Box>
    );
  }

  return (
    <Box maxWidth={480} mx="auto" mt={8} px={2}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Register for a session
          </Typography>

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2} mt={1}>
              <TextField
                select
                label="Session"
                value={form.sessionId}
                onChange={(e) => setForm({ ...form, sessionId: e.target.value })}
                error={Boolean(fieldErrors.sessionId)}
                helperText={fieldErrors.sessionId}
                fullWidth
              >
                {sessionOptions.map((opt) => (
                  <MenuItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Full name"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                error={Boolean(fieldErrors.fullName)}
                helperText={fieldErrors.fullName}
                fullWidth
              />

              <TextField
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                error={Boolean(fieldErrors.email)}
                helperText={fieldErrors.email}
                fullWidth
              />

              <TextField
                label="Company (optional)"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                fullWidth
              />

              {submitError && <Alert severity="error">{submitError}</Alert>}

              <Button type="submit" variant="contained" size="large" disabled={submitting}>
                {submitting ? "Submitting…" : "Register"}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
