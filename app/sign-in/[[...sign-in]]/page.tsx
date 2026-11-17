import AuthShell from "../../auth-shell";
import AuthForm from "../../auth-form";

export default function SignInPage() {
  return <AuthShell mode="sign-in"><AuthForm mode="sign-in" /></AuthShell>;
}
