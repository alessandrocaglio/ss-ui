export const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export async function fetchCert() {
  const res = await fetch(`${API_BASE}/cert`);
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function switchCertSource(source: string) {
  const res = await fetch(`${API_BASE}/cert/source`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source }),
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function uploadCert(pemFile: File | string) {
  let body: BodyInit;
  let headers: Record<string, string> = {};

  if (typeof pemFile === "string") {
    body = pemFile;
    headers["Content-Type"] = "text/plain";
  } else {
    const formData = new FormData();
    formData.append("cert", pemFile);
    body = formData;
  }

  const res = await fetch(`${API_BASE}/cert/upload`, {
    method: "POST",
    headers,
    body,
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function sealSecret(payload: any) {
  const res = await fetch(`${API_BASE}/seal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await res.json();
  return res.json();
}
