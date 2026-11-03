"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { login } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="tr-surface flex flex-col gap-4 p-5 sm:p-6">
      <TextField label="Password" name="password" type="password" autoComplete="current-password" required error={state?.error} />
      <Button type="submit" loading={pending} loadingLabel="Signing in…" className="self-start">
        Sign in
      </Button>
    </form>
  );
}
