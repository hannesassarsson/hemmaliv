import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, CornerDownLeft, Loader2, ShoppingBasket, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  DAYS,
  addDays,
  addShoppingMany,
  fetchShopping,
  fetchMealIdeas,
  fetchMealPlan,
  formatWeekLabel,
  isoDate,
  mondayOf,
  saveMeal,
  saveMealIdea,
} from "@/lib/hemma";
import { notifyOthers } from "@/lib/notify";
import { authFetch, usePerson } from "@/lib/person-context";
import { CATEGORY_LABEL, categoryIndex, normalizeCategory } from "@/lib/store-order";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function DayField({
  day,
  date,
  value,
  ideas,
  onSave,
}: {
  day: string;
  date: string;
  value: string;
  ideas: string[];
  onSave: (dish: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const [dirty, setDirty] = useState(false);

  const shown = dirty ? draft : value;

  const matches = useMemo(() => {
    const q = shown.trim().toLowerCase();
    if (!focused || q.length < 1) return [];
    return ideas.filter((i) => i.toLowerCase().includes(q) && i.toLowerCase() !== q).slice(0, 5);
  }, [focused, ideas, shown]);

  const commit = (next: string) => {
    setDirty(false);
    setFocused(false);
    if (next.trim() !== value.trim()) onSave(next.trim());
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-soft">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-base capitalize text-foreground">{day}</span>
        <span className="text-xs text-muted-foreground">{date}</span>
      </div>
      <div className="relative mt-2">
        <Input
          value={shown}
          onChange={(e) => {
            setDraft(e.target.value);
            setDirty(true);
          }}
          onFocus={() => {
            setDraft(value);
            setFocused(true);
          }}
          onBlur={() => window.setTimeout(() => commit(dirty ? draft : value), 120)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          placeholder="Vad äter vi?"
          className="h-12 rounded-xl"
          aria-label={`Middag ${day}`}
        />
        {matches.length > 0 ? (
          <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-border bg-popover shadow-soft">
            {matches.map((m) => (
              <li key={m}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setDraft(m);
                    setDirty(true);
                    commit(m);
                  }}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm text-popover-foreground active:bg-accent"
                >
                  {m}
                  <CornerDownLeft className="size-3.5 opacity-50" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

type Ingredient = { text: string; category: string; dishes: string[] };

function ShoppingFromMenu({ dishes }: { dishes: string[] }) {
  const { person } = usePerson();
  const queryClient = useQueryClient();
  const [suggestions, setSuggestions] = useState<Ingredient[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const suggest = useMutation({
    mutationFn: async () => {
      const shopping = await queryClient.fetchQuery({ queryKey: ["shopping"], queryFn: fetchShopping });
      const res = await authFetch("/api/meal-ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dishes,
          existing: shopping.filter((s) => !s.done).map((s) => s.text),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { items?: Ingredient[]; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Kunde inte ta fram ingredienser");
      return body.items ?? [];
    },
    onSuccess: (items) => {
      setSuggestions(items);
      setSelected(new Set(items.map((_, i) => i)));
      if (!items.length) toast.info("Allt som behövs verkar redan stå på listan");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Något gick fel"),
  });

  const add = useMutation({
    mutationFn: () =>
      addShoppingMany(
        (suggestions ?? [])
          .filter((_, i) => selected.has(i))
          .map((item) => {
            const category = normalizeCategory(item.category);
            return { text: item.text, category, sort_order: categoryIndex(category) };
          }),
        person ?? "Hannes",
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopping"] });
      toast.success(`${selected.size} varor tillagda i handlarlistan`);
      setSuggestions(null);
    },
    onError: () => toast.error("Kunde inte lägga till varorna"),
  });

  if (!dishes.length) return null;

  if (!suggestions) {
    return (
      <Button
        variant="secondary"
        className="h-12 w-full rounded-xl"
        disabled={suggest.isPending}
        onClick={() => suggest.mutate()}
      >
        {suggest.isPending ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 size-4" />
        )}
        {suggest.isPending ? "Tar fram ingredienser…" : "Handla till veckans middagar"}
      </Button>
    );
  }

  const toggle = (index: number) => {
    const next = new Set(selected);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelected(next);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div>
        <p className="font-display text-base text-foreground">Förslag till handlarlistan</p>
        <p className="text-xs text-muted-foreground">Bocka ur det ni redan har hemma.</p>
      </div>
      <ul className="space-y-1">
        {suggestions.map((item, index) => (
          <li key={`${item.text}-${index}`}>
            <label className="flex items-start gap-3 rounded-xl px-1 py-2">
              <input
                type="checkbox"
                checked={selected.has(index)}
                onChange={() => toggle(index)}
                className="mt-0.5 size-5 accent-primary"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-foreground">{item.text}</span>
                <span className="block text-xs text-muted-foreground">
                  {CATEGORY_LABEL[normalizeCategory(item.category)]}
                  {item.dishes.length ? ` · ${item.dishes.join(", ")}` : ""}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button variant="ghost" className="h-11 rounded-xl" onClick={() => setSuggestions(null)}>
          Avbryt
        </Button>
        <Button
          className="h-11 flex-1 rounded-xl"
          disabled={!selected.size || add.isPending}
          onClick={() => add.mutate()}
        >
          <ShoppingBasket className="mr-2 size-4" />
          Lägg till {selected.size} varor
        </Button>
      </div>
    </div>
  );
}

export function MealPlanner() {
  const queryClient = useQueryClient();
  const { person } = usePerson();
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const currentWeek = isoDate(weekStart);

  const { data: plan = [] } = useQuery({ queryKey: ["mealPlan"], queryFn: fetchMealPlan });
  const { data: ideas = [] } = useQuery({ queryKey: ["mealIdeas"], queryFn: fetchMealIdeas });

  const save = useMutation({
    mutationFn: async ({ day, dish }: { day: string; dish: string }) => {
      await saveMeal(currentWeek, day, dish);
      if (dish) await saveMealIdea(dish);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["mealPlan"] });
      queryClient.invalidateQueries({ queryKey: ["mealIdeas"] });
      notifyOthers(
        person,
        variables.dish
          ? `${person ?? "Någon"} satte ${variables.dish} på ${variables.day}`
          : `${person ?? "Någon"} rensade middagen på ${variables.day}`,
        `meal-${currentWeek}-${variables.day}`,
      );
    },
    onError: () => toast.error("Kunde inte spara middagen"),
  });

  const reuse = useMutation({
    mutationFn: async (week: string) => {
      const rows = plan.filter((p) => p.week_start === week && p.dish_text);
      for (const row of rows) {
        await saveMeal(currentWeek, row.day, row.dish_text);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mealPlan"] });
      toast.success("Veckan återanvänd");
    },
  });

  const dishFor = (day: string) =>
    plan.find((p) => p.week_start === currentWeek && p.day === day)?.dish_text ?? "";

  const archive = useMemo(() => {
    const weeks = Array.from(new Set(plan.map((p) => p.week_start)))
      .filter((w) => w !== currentWeek)
      .sort()
      .reverse();
    return weeks.map((w) => ({
      week: w,
      dishes: plan.filter((p) => p.week_start === w && p.dish_text).map((p) => p.dish_text),
    }));
  }, [plan, currentWeek]);

  const ideaTexts = ideas.map((i) => i.text);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-2 shadow-soft">
        <Button
          variant="ghost"
          size="icon"
          className="size-11 rounded-xl"
          aria-label="Föregående vecka"
          onClick={() => setWeekStart(addDays(weekStart, -7))}
        >
          <ChevronLeft className="size-5" />
        </Button>
        <div className="text-center">
          <p className="font-display text-base text-foreground">{formatWeekLabel(currentWeek)}</p>
          <p className="text-xs text-muted-foreground">
            {currentWeek === isoDate(mondayOf(new Date())) ? "Denna vecka" : "Vecka"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 rounded-xl"
          aria-label="Nästa vecka"
          onClick={() => setWeekStart(addDays(weekStart, 7))}
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>

      <div className="space-y-2">
        {DAYS.map((day, index) => (
          <DayField
            key={`${currentWeek}-${day}`}
            day={day}
            date={addDays(weekStart, index).toLocaleDateString("sv-SE", {
              day: "numeric",
              month: "short",
            })}
            value={dishFor(day)}
            ideas={ideaTexts}
            onSave={(dish) => save.mutate({ day, dish })}
          />
        ))}
      </div>

      <ShoppingFromMenu
        key={currentWeek}
        dishes={DAYS.map(dishFor).filter(Boolean)}
      />

      <section className="space-y-2 pt-2">
        <h2 className="text-lg text-foreground">Arkiv</h2>
        {archive.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inga tidigare veckor sparade än.</p>
        ) : (
          <ul className="space-y-2">
            {archive.map(({ week, dishes }) => (
              <li
                key={week}
                className="rounded-2xl border border-border bg-card p-3 shadow-soft"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display text-sm text-foreground">
                      {formatWeekLabel(week)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {dishes.join(" · ") || "Tom vecka"}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    className="h-10 shrink-0 rounded-xl px-3 text-xs"
                    onClick={() => reuse.mutate(week)}
                  >
                    Återanvänd
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
