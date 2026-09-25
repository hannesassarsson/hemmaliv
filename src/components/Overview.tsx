import { useQuery } from "@tanstack/react-query";
import {
  CalendarHeart,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Cloud,
  Droplets,
  ListChecks,
  Loader2,
  ShoppingBasket,
  Sun,
  Wind,
} from "lucide-react";

import { fetchShopping, fetchTodos } from "@/lib/hemma";
import { dayLabel, fetchFamilyEvents, fetchTraining, timeLabel, type CalendarEvent } from "@/lib/calendars";
import { fetchWeather, HOME_LOCATION, weatherText } from "@/lib/weather";
import { usePerson } from "@/lib/person-context";

function WeatherIcon({ code, className }: { code: number; className?: string }) {
  if (code === 0 || code === 1) return <Sun className={className} />;
  if (code === 45 || code === 48) return <CloudFog className={className} />;
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code))
    return <CloudRain className={className} />;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return <CloudSnow className={className} />;
  if ([95, 96, 99].includes(code)) return <CloudLightning className={className} />;
  return <Cloud className={className} />;
}

function greeting(person: string | null) {
  const hour = new Date().getHours();
  const time = hour < 6 ? "God natt" : hour < 10 ? "God morgon" : hour < 17 ? "Hej" : "God kväll";
  return person ? `${time}, ${person}` : time;
}

export function Overview() {
  const { person } = usePerson();

  const weather = useQuery({ queryKey: ["weather"], queryFn: fetchWeather, staleTime: 10 * 60_000 });
  const training = useQuery({ queryKey: ["training"], queryFn: fetchTraining, staleTime: 5 * 60_000 });
  const family = useQuery({
    queryKey: ["family-calendar"],
    queryFn: fetchFamilyEvents,
    staleTime: 5 * 60_000,
  });
  const todos = useQuery({ queryKey: ["todos"], queryFn: fetchTodos });
  const shopping = useQuery({ queryKey: ["shopping"], queryFn: fetchShopping });

  const now = Date.now();
  const agenda: (CalendarEvent & { source: "Träning" | "Familj" })[] = [
    ...(training.data ?? []).map((e) => ({ ...e, source: "Träning" as const })),
    ...(family.data ?? []).map((e) => ({ ...e, source: "Familj" as const })),
  ]
    .filter((e) => e.end.getTime() >= now)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 6);

  const todoLeft = (todos.data ?? []).filter((t) => !t.done).length;
  const shoppingLeft = (shopping.data ?? []).filter((s) => !s.done).length;

  let lastDay = "";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl text-foreground">{greeting(person)}</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        {weather.isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Hämtar väder för {HOME_LOCATION.name}…
          </div>
        )}
        {weather.isError && (
          <p className="text-sm text-muted-foreground">Kunde inte hämta vädret just nu.</p>
        )}
        {weather.data && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <WeatherIcon code={weather.data.now.weatherCode} className="size-10 text-primary" />
                <div>
                  <p className="text-3xl leading-none text-foreground">{weather.data.now.temperature}°</p>
                  <p className="text-sm text-muted-foreground">
                    {weatherText(weather.data.now.weatherCode)} · {HOME_LOCATION.name}
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>Känns som {weather.data.now.apparentTemperature}°</p>
                <p className="mt-1 flex items-center justify-end gap-1">
                  <Wind className="size-3" /> {weather.data.now.windSpeed} m/s
                </p>
                {weather.data.now.precipitation > 0 && (
                  <p className="mt-1 flex items-center justify-end gap-1">
                    <Droplets className="size-3" /> {weather.data.now.precipitation} mm
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {weather.data.hours.map((h) => (
                <div
                  key={h.time}
                  className="flex shrink-0 flex-col items-center gap-1 rounded-xl bg-muted px-3 py-2"
                >
                  <span className="text-xs text-muted-foreground">
                    {new Date(h.time).toLocaleTimeString("sv-SE", { hour: "2-digit" })}
                  </span>
                  <WeatherIcon code={h.weatherCode} className="size-4 text-foreground" />
                  <span className="text-sm text-foreground">{h.temperature}°</span>
                </div>
              ))}
            </div>

            <div className="mt-3 flex justify-between border-t border-border pt-3">
              {weather.data.days.slice(0, 5).map((d) => (
                <div key={d.date} className="flex flex-col items-center gap-1 text-xs">
                  <span className="text-muted-foreground">
                    {new Date(`${d.date}T12:00:00`).toLocaleDateString("sv-SE", { weekday: "short" })}
                  </span>
                  <WeatherIcon code={d.weatherCode} className="size-4 text-foreground" />
                  <span className="text-foreground">{d.tempMax}°</span>
                  <span className="text-muted-foreground">{d.tempMin}°</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft">
          <ShoppingBasket className="size-5 text-primary" />
          <div>
            <p className="text-lg leading-none text-foreground">{shoppingLeft}</p>
            <p className="text-xs text-muted-foreground">kvar att handla</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft">
          <ListChecks className="size-5 text-primary" />
          <div>
            <p className="text-lg leading-none text-foreground">{todoLeft}</p>
            <p className="text-xs text-muted-foreground">kvar att göra</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-2 flex items-center gap-2 text-lg text-foreground">
          <CalendarHeart className="size-5" />
          Kommande
        </h2>
        {(training.isLoading || family.isLoading) && (
          <p className="text-sm text-muted-foreground">Hämtar kalendrar…</p>
        )}
        {!training.isLoading && !family.isLoading && agenda.length === 0 && (
          <p className="text-sm text-muted-foreground">Inget planerat just nu.</p>
        )}
        <ul className="space-y-2">
          {agenda.map((event) => {
            const label = dayLabel(event.start);
            const showDayHeader = label !== lastDay;
            lastDay = label;
            return (
              <li key={`${event.source}-${event.uid}`}>
                {showDayHeader && (
                  <p className="mb-1 mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground first:mt-0">
                    {label}
                  </p>
                )}
                <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3 shadow-soft">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{event.source}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {timeLabel(event.start, event.end)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
