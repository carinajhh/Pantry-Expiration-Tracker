import AuthShell from "../../auth-shell";
import AuthForm from "../../auth-form";

export default function SignUpPage() {
  return <AuthShell mode="sign-up"><AuthForm mode="sign-up" /></AuthShell>;
}
