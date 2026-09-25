import ICAL from "ical.js";

export type CalendarEvent = {
  uid: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
};

const TRAINING_ICS_URL =
  "https://raw.githubusercontent.com/hannesassarsson/-training-calendar/main/training.ics";

export async function fetchTraining(): Promise<CalendarEvent[]> {
  const res = await fetch(TRAINING_ICS_URL, { cache: "no-store" });
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

type FamilyApiEvent = { uid: string; title: string; start: string; end: string };

export async function fetchFamilyEvents(): Promise<CalendarEvent[]> {
  const res = await fetch("/api/family-calendar", { cache: "no-store" });
  if (!res.ok) throw new Error("Kunde inte hämta familjekalendern");
  const data = (await res.json()) as { events: FamilyApiEvent[] };
  return data.events.map((e) => ({
    uid: e.uid,
    title: e.title,
    description: "",
    start: new Date(e.start),
    end: new Date(e.end),
  }));
}

export function dayLabel(date: Date) {
  const today = new Date();
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (isSameDay(date, today)) return "Idag";
  if (isSameDay(date, tomorrow)) return "Imorgon";
  return date.toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "short" });
}

export function timeLabel(start: Date, end: Date) {
  const fmt = (d: Date) => d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  return `${fmt(start)}–${fmt(end)}`;
}
