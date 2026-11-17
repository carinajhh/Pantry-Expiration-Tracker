"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "../../../lib/supabase/client";
import { useAuth } from "../../auth-provider";

export default function AccountPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/sign-in");
  }, [loading, router, user]);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setMessage("Password must contain at least 8 characters.");
      return;
    }
    setPending(true);
    const { error } = await createClient().auth.updateUser({ password });
    setPending(false);
    setMessage(error ? error.message : "Your password has been updated.");
    if (!error) setPassword("");
  }

  async function signOut() {
    setPending(true);
    await createClient().auth.signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (deleteConfirmation !== "DELETE") {
      setMessage("Type DELETE exactly to confirm account deletion.");
      return;
    }

    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: deleteConfirmation }),
      });
      const result = await response.json() as { deleted?: boolean; error?: string };
      if (!response.ok || !result.deleted) {
        setMessage(result.error ?? "We could not delete your account.");
        return;
      }

      await createClient().auth.signOut({ scope: "local" });
      window.location.assign("/sign-up?accountDeleted=1");
    } catch {
      setMessage("We could not delete your account. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (loading || !user) return <main className="auth-loading"><span className="spinner" />Opening account settings…</main>;

  return <main className="account-page">
    <header className="account-header">
      <Link className="auth-brand" href="/"><span className="brand-mark">F</span><span>freshly<span className="brand-dot">.</span></span></Link>
      <Link className="account-back" href="/">← Back to my kitchen</Link>
    </header>
    <section className="account-intro">
      <p className="eyebrow">ACCOUNT SETTINGS</p>
      <h1>Your kitchen profile</h1>
      <p>Review your sign-in email, update your password, or manage your account.</p>
    </section>
    <div className="account-profile-card">
      <section className="supabase-account-card" aria-label="Account settings">
        <div className="account-email-row"><span>Email address</span><strong>{user.email}</strong></div>
        <form onSubmit={updatePassword}>
          <label htmlFor="new-password">New password</label>
          <input id="new-password" type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required />
          <button type="submit" disabled={pending}>{pending ? "Saving…" : "Update password"}</button>
        </form>
        {message && <p className="account-message" role="status">{message}</p>}
        <button className="account-sign-out" type="button" onClick={signOut} disabled={pending}>Sign out</button>

        <div className="account-danger-zone">
          <div>
            <p className="account-section-label">DELETE MY ACCOUNT</p>
            <h2>Delete your account and pantry</h2>
            <p>This permanently removes your sign-in, pantry items, and impact history. This action cannot be undone.</p>
          </div>
          {!showDeleteConfirmation ? (
            <button className="account-delete-trigger" type="button" onClick={() => { setShowDeleteConfirmation(true); setMessage(""); }} disabled={pending}>Delete my account</button>
          ) : (
            <form className="account-delete-form" onSubmit={deleteAccount}>
              <label htmlFor="delete-confirmation">Type <strong>DELETE</strong> to confirm</label>
              <input id="delete-confirmation" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder="DELETE" autoComplete="off" disabled={pending} />
              <div>
                <button className="account-cancel-delete" type="button" onClick={() => { setShowDeleteConfirmation(false); setDeleteConfirmation(""); setMessage(""); }} disabled={pending}>Cancel</button>
                <button className="account-confirm-delete" type="submit" disabled={pending || deleteConfirmation !== "DELETE"}>{pending ? "Deleting…" : "Permanently delete"}</button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  </main>;
}
