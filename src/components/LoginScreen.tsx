import { useState } from "react";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase";
import { usePerson } from "@/lib/person-context";

/** Översätter Supabase Auth-fel till svenska. */
function authErrorText(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  if (/invalid login credentials/i.test(text)) return "Fel e-post eller lösenord.";
  if (/already registered|already been registered|already exists/i.test(text))
    return "Det finns redan ett konto med den e-posten. Logga in, eller tryck på Glömt lösenordet.";
  if (/rate limit|too many/i.test(text)) return "För många försök just nu. Vänta en stund och försök igen.";
  if (/email not confirmed/i.test(text)) return "Bekräfta e-posten via länken i mejlet först.";
  if (/password should be|weak password/i.test(text)) return "Lösenordet är för svagt. Använd minst 8 tecken.";
  if (/same.*password|different from the old/i.test(text)) return "Välj ett annat lösenord än det gamla.";
  return text || "Något gick fel";
}

const redirectTo = () => `${window.location.origin}/`;

export function LoginScreen() {
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
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
      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: redirectTo(),
        });
        if (error) throw error;
        setMessage({
          kind: "info",
          text: "Om kontot finns har vi skickat en länk för att välja nytt lösenord. Kolla även skräpposten.",
        });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: redirectTo() },
        });
        if (error) throw error;
        // Supabase svarar utan fel men utan identitet när e-posten redan har ett konto.
        if (data.user && data.user.identities?.length === 0) {
          throw new Error("already registered");
        }
        if (!data.session) {
          setMessage({
            kind: "info",
            text: "Kontot är skapat. Bekräfta via länken i mejlet och logga sedan in här.",
          });
          setMode("login");
        }
      }
    } catch (error) {
      setMessage({ kind: "error", text: authErrorText(error) });
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
        {mode !== "reset" && (
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
        )}
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
          {mode === "login" ? "Logga in" : mode === "signup" ? "Skapa konto" : "Skicka återställningslänk"}
        </button>
        {mode === "login" && (
          <button
            type="button"
            onClick={() => {
              setMode("reset");
              setMessage(null);
            }}
            className="h-11 w-full text-sm text-muted-foreground"
          >
            Glömt lösenordet?
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setMessage(null);
          }}
          className="h-11 w-full text-sm text-muted-foreground"
        >
          {mode === "login" ? "Första gången? Skapa konto" : "Tillbaka till inloggning"}
        </button>
      </form>
    </div>
  );
}

export function NewPasswordScreen() {
  const { recheck } = usePerson();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(authErrorText(updateError));
      return;
    }
    window.history.replaceState(null, "", window.location.pathname);
    await recheck();
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-xs space-y-3">
        <h1 className="mb-4 text-center text-3xl text-foreground">Välj nytt lösenord</h1>
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nytt lösenord (minst 8 tecken)"
          className="h-12 w-full rounded-xl border border-border bg-card px-3 text-foreground"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-60"
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          Spara lösenord
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
