import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in · Traccoon PayAgent" };

export default function LoginPage() {
  return (
    <div className="flex max-w-measure flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold">Sign in</h1>
        <p className="text-muted">This workspace holds private conversations, so it&apos;s locked to its owner.</p>
      </div>
      <LoginForm />
    </div>
  );
}
