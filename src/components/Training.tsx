import { useQuery } from "@tanstack/react-query";
import ICAL from "ical.js";
import { CalendarX2, Dumbbell, RefreshCw } from "lucide-react";

const ICS_URL =
  "https://raw.githubusercontent.com/hannesassarsson/-training-calendar/main/training.ics";

type TrainingEvent = {
  uid: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
};

async function fetchTraining(): Promise<TrainingEvent[]> {
  const res = await fetch(ICS_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Kunde inte hämta träningsschemat");
  const text = await res.text();
  const jcal = ICAL.parse(text);
  const comp = new ICAL.Component(jcal);
  const events = comp.getAllSubcomponents("vevent").map((ve) => {
    const event = new ICAL.Event(ve);
    return {
      uid: event.uid,
      title: event.summary || "Träning",
      description: event.description || "",
      start: event.startDate.toJSDate(),
      end: event.endDate.toJSDate(),
    };
  });
  return events.sort((a, b) => a.start.getTime() - b.start.getTime());
}

function dayLabel(date: Date) {
  const today = new Date();
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (isSameDay(date, today)) return "Idag";
  if (isSameDay(date, tomorrow)) return "Imorgon";
  return date.toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "short" });
}

function timeLabel(start: Date, end: Date) {
  const fmt = (d: Date) => d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  return `${fmt(start)}–${fmt(end)}`;
}

export function Training() {
  const { data: events = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["training"],
    queryFn: fetchTraining,
    staleTime: 5 * 60_000,
  });

  const now = Date.now();
  const upcoming = events.filter((e) => e.end.getTime() >= now);
  const past = events.filter((e) => e.end.getTime() < now).slice(-5).reverse();

  let lastDay = "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg text-foreground">
          <Dumbbell className="size-5" />
          Hannes träning
        </h2>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex size-9 items-center justify-center rounded-xl border border-border text-muted-foreground disabled:opacity-50"
          aria-label="Uppdatera"
        >
          <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Hämtar schema…</p>}

      {isError && (
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3 text-sm text-muted-foreground shadow-soft">
          <CalendarX2 className="size-4 shrink-0" />
          Kunde inte hämta träningsschemat just nu.
        </div>
      )}

      {!isLoading && !isError && upcoming.length === 0 && (
        <p className="text-sm text-muted-foreground">Inga kommande pass i schemat.</p>
      )}

      <ul className="space-y-2">
        {upcoming.map((event) => {
          const label = dayLabel(event.start);
          const showDayHeader = label !== lastDay;
          lastDay = label;
          return (
            <li key={event.uid}>
              {showDayHeader && (
                <p className="mb-1 mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground first:mt-0">
                  {label}
                </p>
              )}
              <div className="rounded-2xl border border-border bg-card p-3 shadow-soft">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-medium text-foreground">{event.title}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {timeLabel(event.start, event.end)}
                  </span>
                </div>
                {event.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {past.length > 0 && (
        <details className="pt-2">
          <summary className="cursor-pointer text-xs text-muted-foreground">
            Tidigare pass
          </summary>
          <ul className="mt-2 space-y-2">
            {past.map((event) => (
              <li
                key={event.uid}
                className="rounded-2xl border border-border bg-card p-3 opacity-60 shadow-soft"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-medium text-foreground">{event.title}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {event.start.toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
