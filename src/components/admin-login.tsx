"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const response = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password })
    });
    const body = await response.json().catch(() => ({ error: "Login failed" }));
    setSubmitting(false);
    if (!response.ok) {
      setError(body.error ?? "Login failed");
      return;
    }
    router.replace("/admin/scenes");
    router.refresh();
  }

  return (
    <form className="admin-login" onSubmit={submit}>
      <span className="eyebrow">Internal access</span>
      <h1>Scene desk</h1>
      <p>Authenticate to ingest, review, and publish rights-cleared scenes.</p>
      <label><span>Admin password</span><input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button--full" type="submit" disabled={submitting}>{submitting ? "Checking…" : "Enter scene desk"}</button>
    </form>
  );
}
