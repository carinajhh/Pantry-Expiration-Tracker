import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthShell({ children, mode }: { children: ReactNode; mode: "sign-in" | "sign-up" }) {
  const signingIn = mode === "sign-in";
  return <main className="auth-page">
    <section className="auth-story" aria-label="Freshly benefits">
      <Link className="auth-brand" href="/"><span className="brand-mark">F</span><span>freshly<span className="brand-dot">.</span></span></Link>
      <div className="auth-story-copy">
        <p className="auth-kicker">YOUR FOOD, REMEMBERED</p>
        <h1>Waste less.<br />Cook with what you have.</h1>
        <p>Keep your fridge, freezer, and pantry organized in one private kitchen.</p>
        <ul>
          <li><span>✓</span> See what expires first</li>
          <li><span>✓</span> Get recipes from your ingredients</li>
          <li><span>✓</span> Access your pantry on any device</li>
        </ul>
      </div>
      <div className="auth-fridge" aria-hidden="true"><span>🥬</span><span>🍅</span><span>🥛</span><i /><i /></div>
      <p className="auth-privacy"><span>⌾</span> Your pantry is private to your account.</p>
    </section>
    <section className="auth-form-side">
      <div className="auth-form-intro">
        <p className="eyebrow">{signingIn ? "WELCOME BACK" : "CREATE YOUR KITCHEN"}</p>
        <h2>{signingIn ? "Sign in to your pantry" : "Start saving your food"}</h2>
        <p>{signingIn ? "Enter your username and password to open your kitchen." : "Choose a username and password. You can add an email later in settings."}</p>
      </div>
      <div className="auth-clerk-card">{children}</div>
      <p className="auth-switch">{signingIn ? "New to Freshly?" : "Already have a kitchen?"} <Link href={signingIn ? "/sign-up" : "/sign-in"}>{signingIn ? "Create an account" : "Sign in"}</Link></p>
    </section>
  </main>;
}
