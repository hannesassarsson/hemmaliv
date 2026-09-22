import { Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { usePerson } from "@/lib/person-context";
import { disablePush, enablePush, notificationPermission, pushSupported } from "@/lib/push";

export function NotificationsCard() {
  const { person } = usePerson();
  const [state, setState] = useState<NotificationPermission | "unsupported" | "loading">(
    "loading",
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setState(notificationPermission());
  }, []);

  if (state === "loading") return null;

  if (state === "unsupported") {
    return (
      <p className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground shadow-soft">
        Den här webbläsaren kan inte visa notiser. Lägg till appen på hemskärmen och öppna den
        därifrån för att få påminnelser.
      </p>
    );
  }

  const enable = async () => {
    setBusy(true);
    try {
      await enablePush(person);
      setState("granted");
      toast.success("Notiser påslagna");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kunde inte slå på notiser");
      setState(notificationPermission());
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await disablePush();
      toast.success("Notiser avstängda på den här enheten");
    } finally {
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
            {state === "granted"
              ? "Du får en notis när en deadline eller påminnelse infaller – även när appen är stängd."
              : state === "denied"
                ? "Notiser är blockerade i webbläsarens inställningar för den här sidan. Tillåt dem där för att få påminnelser."
                : "Slå på notiser för att bli påmind vid deadlines och varor med påminnelsedatum."}
          </p>
          {state === "granted" ? (
            <Button
              variant="secondary"
              className="mt-3 h-11 w-full rounded-xl"
              disabled={busy}
              onClick={disable}
            >
              <BellOff className="mr-2 size-4" /> Stäng av på denna enhet
            </Button>
          ) : state === "default" ? (
            <Button className="mt-3 h-11 w-full rounded-xl" disabled={busy} onClick={enable}>
              <Bell className="mr-2 size-4" /> Slå på notiser
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
