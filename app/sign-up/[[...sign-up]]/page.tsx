import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";
import AuthShell from "../../auth-shell";

export default function SignUpPage() {
  return <AuthShell mode="sign-up"><Suspense><SignUp fallbackRedirectUrl="/" signInUrl="/sign-in" appearance={{ variables: { colorPrimary: "#1f6e58", colorBackground: "#fffdf8", borderRadius: "0.75rem", fontFamily: "DM Sans, sans-serif" } }} /></Suspense></AuthShell>;
}
