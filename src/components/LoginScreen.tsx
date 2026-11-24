import { useState } from "react";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase";
import { usePerson } from "@/lib/person-context";

export function LoginScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (!data.session) {
          setMessage({
            kind: "info",
            text: "Kontot är skapat. Bekräfta via länken i mejlet och logga sedan in här.",
          });
          setMode("login");
        }
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "Något gick fel";
      setMessage({
        kind: "error",
        text: text.includes("Invalid login credentials") ? "Fel e-post eller lösenord." : text,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-xs space-y-3">
        <div className="mb-6 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Välkommen till</p>
          <h1 className="mt-2 text-5xl text-foreground">Hemma</h1>
        </div>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-post"
          className="h-12 w-full rounded-xl border border-border bg-card px-3 text-foreground"
        />
        <input
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Lösenord (minst 8 tecken)"
          className="h-12 w-full rounded-xl border border-border bg-card px-3 text-foreground"
        />
        {message && (
          <p className={`text-sm ${message.kind === "error" ? "text-destructive" : "text-muted-foreground"}`}>
            {message.text}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-60"
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          {mode === "login" ? "Logga in" : "Skapa konto"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setMessage(null);
          }}
          className="h-11 w-full text-sm text-muted-foreground"
        >
          {mode === "login" ? "Första gången? Skapa konto" : "Har du redan ett konto? Logga in"}
        </button>
      </form>
    </div>
  );
}

export function NotMemberScreen() {
  const { email, signOut, recheck } = usePerson();
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <div className="w-full max-w-xs space-y-4 text-center">
        <h1 className="text-3xl text-foreground">Nästan klart</h1>
        <p className="text-sm text-muted-foreground">
          Du är inloggad som <span className="text-foreground">{email}</span>, men kontot är inte
          kopplat till hushållet än. När det är gjort kommer du in direkt.
        </p>
        <button
          type="button"
          onClick={() => void recheck()}
          className="h-12 w-full rounded-xl bg-primary text-primary-foreground"
        >
          Försök igen
        </button>
        <button type="button" onClick={() => void signOut()} className="h-11 w-full text-sm text-muted-foreground">
          Logga ut
        </button>
      </div>
    </div>
  );
}
