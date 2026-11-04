import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";
import AuthShell from "../../auth-shell";

export default function SignInPage() {
  return <AuthShell mode="sign-in"><Suspense><SignIn forceRedirectUrl="/" signUpUrl="/sign-up" appearance={{ variables: { colorPrimary: "#1f6e58", colorBackground: "#fffdf8", borderRadius: "0.75rem", fontFamily: "DM Sans, sans-serif" } }} /></Suspense></AuthShell>;
}
