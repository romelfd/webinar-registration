const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  getEvents: () => request("/api/events"),
  register: (payload) =>
    request("/api/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (email, password) =>
    request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  getRegistrants: (token, search = "") =>
    request(`/api/admin/registrants${search ? `?search=${encodeURIComponent(search)}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  exportCsvUrl: () => `${API_BASE}/api/admin/registrants/export.csv`,
};
