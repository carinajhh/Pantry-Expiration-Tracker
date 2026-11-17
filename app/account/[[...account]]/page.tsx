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

  if (loading || !user) return <main className="auth-loading"><span className="spinner" />Opening account settings…</main>;

  return <main className="account-page">
    <header className="account-header">
      <Link className="auth-brand" href="/"><span className="brand-mark">F</span><span>freshly<span className="brand-dot">.</span></span></Link>
      <Link className="account-back" href="/">← Back to my kitchen</Link>
    </header>
    <section className="account-intro">
      <p className="eyebrow">ACCOUNT SETTINGS</p>
      <h1>Your kitchen profile</h1>
      <p>Review your sign-in email, update your password, or securely sign out.</p>
    </section>
    <div className="account-profile-card supabase-account-card">
      <div className="account-email-row"><span>Email address</span><strong>{user.email}</strong></div>
      <form onSubmit={updatePassword}>
        <label htmlFor="new-password">New password</label>
        <input id="new-password" type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required />
        <button type="submit" disabled={pending}>{pending ? "Saving…" : "Update password"}</button>
      </form>
      {message && <p className="account-message" role="status">{message}</p>}
      <button className="account-sign-out" type="button" onClick={signOut} disabled={pending}>Sign out</button>
    </div>
  </main>;
}
