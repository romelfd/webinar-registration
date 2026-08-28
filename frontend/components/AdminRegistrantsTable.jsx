"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { api } from "../lib/api";

export default function AdminRegistrantsTable() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("adminToken");
    if (!stored) {
      router.replace("/admin/login");
      return;
    }
    setToken(stored);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api
      .getRegistrants(token, search)
      .then(setRows)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, search]);

  if (!token) return null;

  return (
    <Box maxWidth={900} mx="auto" mt={6} px={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Registrants</Typography>
        <Button
          variant="outlined"
          component="a"
          href={api.exportCsvUrl()}
          onClick={(e) => {
            // The export endpoint also requires auth, so a plain <a href> won't
            // carry the bearer token — fetch it manually and trigger a download.
            e.preventDefault();
            fetch(api.exportCsvUrl(), { headers: { Authorization: `Bearer ${token}` } })
              .then((res) => res.blob())
              .then((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "registrants.csv";
                a.click();
                URL.revokeObjectURL(url);
              });
          }}
        >
          Export CSV
        </Button>
      </Box>

      <TextField
        label="Search name, email, or company"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        fullWidth
        size="small"
        sx={{ mb: 2 }}
      />

      {error && <Alert severity="error">{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Registered</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.full_name}</TableCell>
                  <TableCell>{r.email}</TableCell>
                  <TableCell>{r.company}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={r.status}
                      color={r.status === "confirmed" ? "success" : "warning"}
                    />
                  </TableCell>
                  <TableCell>{new Date(r.registered_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
