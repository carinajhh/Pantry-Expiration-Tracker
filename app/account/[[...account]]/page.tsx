import { RedirectToSignIn, Show, UserProfile } from "@clerk/nextjs";
import Link from "next/link";
import { Suspense } from "react";

export default function AccountPage() {
  return <Suspense fallback={null}><Show when="signed-in" fallback={<RedirectToSignIn />}>
    <main className="account-page">
    <header className="account-header">
      <Link className="auth-brand" href="/"><span className="brand-mark">F</span><span>freshly<span className="brand-dot">.</span></span></Link>
      <Link className="account-back" href="/">← Back to my kitchen</Link>
    </header>
    <section className="account-intro">
      <p className="eyebrow">ACCOUNT SETTINGS</p>
      <h1>Your kitchen profile</h1>
      <p>Manage your username and password. Adding an email is optional and can help with account recovery.</p>
    </section>
    <div className="account-profile-card">
      <Suspense><UserProfile path="/account" routing="path" /></Suspense>
    </div>
    </main>
  </Show></Suspense>;
}
