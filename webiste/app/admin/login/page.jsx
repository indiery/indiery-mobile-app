"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Unable to sign in");

      router.replace("/admin");
      router.refresh();
    } catch (loginError) {
      setError(loginError?.message || "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="admin-login-title">
        <div className={styles.brandMark}>IN</div>
        <p className={styles.eyebrow}>Restricted operations access</p>
        <h1 id="admin-login-title">Admin sign in</h1>
        <p className={styles.description}>Use your Indiery administrator credentials to continue.</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label htmlFor="admin-email">Email address</label>
          <input
            id="admin-email"
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoFocus
          />

          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error && <div className={styles.error} role="alert">{error}</div>}

          <button type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className={styles.notice}>Access attempts are rate limited and administrator actions require an active session.</p>
      </section>
    </main>
  );
}
