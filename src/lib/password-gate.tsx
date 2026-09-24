import { useState } from "react";
import type { ReactNode } from "react";

const STORAGE_KEY = "hemma.unlocked";
const APP_PASSWORD = import.meta.env["VITE_APP_PASSWORD"] ?? "";

export function PasswordGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(
    () => !APP_PASSWORD || window.localStorage.getItem(STORAGE_KEY) === "true",
  );
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  if (unlocked) return children;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value === APP_PASSWORD) {
      window.localStorage.setItem(STORAGE_KEY, "true");
      setUnlocked(true);
    } else {
      setError(true);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-xs space-y-3">
        <h1 className="text-center text-2xl text-foreground">Hemma</h1>
        <input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          placeholder="Lösenord"
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground"
        />
        {error && <p className="text-sm text-destructive">Fel lösenord.</p>}
        <button
          type="submit"
          className="h-11 w-full rounded-xl bg-primary text-primary-foreground"
        >
          Lås upp
        </button>
      </form>
    </div>
  );
}
