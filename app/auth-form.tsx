"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

export default function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const signingIn = mode === "sign-in";
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!signingIn && password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setMessage("Password must contain at least 8 characters.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const result = signingIn
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
        });
    setPending(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (!signingIn && !result.data.session) {
      setMessage("Check your email to confirm your account, then sign in.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return <form className="freshly-auth-form" onSubmit={submit}>
    <label htmlFor={`${mode}-email`}>Email address</label>
    <input id={`${mode}-email`} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
    <label htmlFor={`${mode}-password`}>Password</label>
    <input id={`${mode}-password`} type="password" autoComplete={signingIn ? "current-password" : "new-password"} minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
    {!signingIn && <>
      <label htmlFor="sign-up-password-confirmation">Confirm password</label>
      <input id="sign-up-password-confirmation" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
    </>}
    {message && <p className="auth-message" role="alert">{message}</p>}
    <button type="submit" disabled={pending}>{pending ? "Please wait…" : signingIn ? "Sign in" : "Create my account"}</button>
    {!signingIn && <p className="auth-form-note">Use at least 8 characters. For this class project, your email is used as your sign-in name.</p>}
  </form>;
}
