import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dumbbell, Home, ListChecks, Moon, RefreshCw, ShoppingBasket, Sun, UtensilsCrossed } from "lucide-react";
import { MealPlanner } from "@/components/MealPlanner";
import { NotificationsCard } from "@/components/NotificationsCard";
import { Overview } from "@/components/Overview";
import { PersonPicker } from "@/components/PersonPicker";
import { ShoppingList } from "@/components/ShoppingList";
import { TodoLists } from "@/components/TodoLists";
import { Training } from "@/components/Training";
import { supabase } from "@/integrations/supabase";
import { usePerson } from "@/lib/person-context";
import { useTheme } from "@/lib/theme";

type Tab = "oversikt" | "handla" | "attgora" | "mat" | "traning";
const tabs = [
  ["oversikt", "Översikt", Home],
  ["handla", "Handla", ShoppingBasket],
  ["attgora", "Att göra", ListChecks],
  ["mat", "Mat", UtensilsCrossed],
  ["traning", "Träning", Dumbbell],
] as const;

export default function App() {
  const { person, ready, setPerson } = usePerson();
  const { theme, toggle } = useTheme();
  const [tab, setTab] = useState<Tab>("oversikt");
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("hemma-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "shopping_items" }, () => queryClient.invalidateQueries({ queryKey: ["shopping"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "todo_items" }, () => queryClient.invalidateQueries({ queryKey: ["todos"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "meal_plan" }, () => queryClient.invalidateQueries({ queryKey: ["mealPlan"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "meal_ideas" }, () => queryClient.invalidateQueries({ queryKey: ["mealIdeas"] }))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [queryClient]);

  if (!ready) return <div className="min-h-screen bg-background" />;
  if (!person) return <PersonPicker />;

  return <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-background">
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3"><div><h1 className="text-2xl leading-none text-foreground">Hemma</h1><p className="mt-1 text-xs text-muted-foreground">Inloggad som {person}</p></div>
        <div className="flex shrink-0 items-center gap-1"><button type="button" onClick={() => setPerson(null)} className="flex h-11 items-center gap-1.5 rounded-xl border border-border px-3 text-xs"><RefreshCw className="size-4" />Byt</button><button type="button" onClick={toggle} aria-label="Växla mörkt läge" className="flex size-11 items-center justify-center rounded-xl border border-border">{theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}</button></div>
      </div>
    </header>
    <main className="flex-1 space-y-5 px-4 pb-28 pt-4">{tab === "oversikt" && <Overview />}{tab === "handla" && <ShoppingList />}{tab === "attgora" && <><TodoLists /><NotificationsCard /></>}{tab === "mat" && <MealPlanner />}{tab === "traning" && <Training />}</main>
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-lg border-t border-border bg-background/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur"><div className="flex">{tabs.map(([key, label, Icon]) => <button key={key} type="button" onClick={() => setTab(key)} className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-xs ${tab === key ? "text-primary" : "text-muted-foreground"}`}><Icon className="size-5" />{label}</button>)}</div></nav>
  </div>;
}
