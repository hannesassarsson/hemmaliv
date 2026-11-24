import { Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { usePerson } from "@/lib/person-context";
import { currentSubscription, disablePush, enablePush, notificationPermission } from "@/lib/push";

type State = "loading" | "unsupported" | "denied" | "off" | "on";

async function readState(): Promise<State> {
  const permission = notificationPermission();
  if (permission === "unsupported") return "unsupported";
  if (permission === "denied") return "denied";
  if (permission === "default") return "off";
  return (await currentSubscription()) ? "on" : "off";
}

/** `promptOnly` visar kortet bara när notiser inte är påslagna (används på översikten). */
export function NotificationsCard({ promptOnly = false }: { promptOnly?: boolean }) {
  const { person } = usePerson();
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void readState().then(setState);
  }, []);

  if (state === "loading") return null;
  if (promptOnly && state !== "off") return null;

  if (state === "unsupported") {
    return (
      <p className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground shadow-soft">
        Den här webbläsaren kan inte visa notiser. På iPhone: tryck på Dela → Lägg till på
        hemskärmen och öppna appen därifrån för att få påminnelser.
      </p>
    );
  }

  const enable = async () => {
    setBusy(true);
    try {
      await enablePush(person);
      toast.success("Notiser påslagna");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kunde inte slå på notiser");
    } finally {
      setState(await readState());
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await disablePush();
      toast.success("Notiser avstängda på den här enheten");
    } finally {
      setState(await readState());
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-xl bg-accent p-2 text-accent-foreground">
          <Bell className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base text-foreground">Påminnelser</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {state === "on"
              ? "Du får notiser för gemensamma uppgifter, din egen lista och handlingspåminnelser – även när appen är stängd."
              : state === "denied"
                ? "Notiser är blockerade i webbläsarens inställningar för den här sidan. Tillåt dem där för att få påminnelser."
                : "Slå på notiser för att bli påmind vid deadlines och varor med påminnelsedatum."}
          </p>
          {state === "on" ? (
            <Button variant="secondary" className="mt-3 h-11 w-full rounded-xl" disabled={busy} onClick={disable}>
              <BellOff className="mr-2 size-4" /> Stäng av på denna enhet
            </Button>
          ) : state === "off" ? (
            <Button className="mt-3 h-11 w-full rounded-xl" disabled={busy} onClick={enable}>
              <Bell className="mr-2 size-4" /> Slå på notiser
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
