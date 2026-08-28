"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";
import { api } from "../../../lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { token } = await api.login(email, password);
      // Demo-simple: store the JWT in localStorage. For production, prefer an
      // httpOnly cookie set by the server so the token isn't reachable from JS.
      localStorage.setItem("adminToken", token);
      router.push("/admin/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box maxWidth={400} mx="auto" mt={10} px={2}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Admin login
          </Typography>
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2} mt={1}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
              />
              {error && <Alert severity="error">{error}</Alert>}
              <Button type="submit" variant="contained" disabled={submitting}>
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
