"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../login/login.module.css";

export default function AcceptAdminInvitePage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fragment = window.location.hash.replace(/^#/, "");
    const inviteToken = new URLSearchParams(fragment).get("token") || "";
    setToken(inviteToken);
    // Remove the bearer token from browser history after capturing it.
    if (inviteToken) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  async function acceptInvite(event) {
    event.preventDefault();
    setError("");
    if (!token) return setError("The invitation link is missing its token. Ask an administrator to send a new invitation.");
    if (password !== confirmation) return setError("The passwords do not match.");
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/admin-accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Unable to accept invitation");
      setAccepted(true);
    } catch (acceptError) {
      setError(acceptError?.message || "Unable to accept invitation");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="accept-invite-title">
        <div className={styles.brandMark}>IN</div>
        <p className={styles.eyebrow}>Restricted operations access</p>
        <h1 id="accept-invite-title">{accepted ? "Account activated" : "Set your password"}</h1>
        <p className={styles.description}>
          {accepted ? "Your administrator account is ready. Sign in with your invited email and new password." : "Choose a password with at least 12 characters. This invitation can only be used once."}
        </p>
        {accepted ? (
          <div className={styles.form}><button type="button" onClick={() => router.replace("/admin/login")}>Continue to sign in</button></div>
        ) : (
          <form onSubmit={acceptInvite} className={styles.form}>
            <label htmlFor="admin-new-password">New password</label>
            <input id="admin-new-password" type="password" autoComplete="new-password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} required />
            <label htmlFor="admin-confirm-password">Confirm password</label>
            <input id="admin-confirm-password" type="password" autoComplete="new-password" minLength={12} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
            {error ? <div className={styles.error} role="alert">{error}</div> : null}
            <button type="submit" disabled={submitting || !token}>{submitting ? "Activating account..." : "Activate account"}</button>
          </form>
        )}
        <p className={styles.notice}>Invitation links expire after 24 hours. Contact the administrator who invited you if this link no longer works.</p>
      </section>
    </main>
  );
}
