import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dumbbell, FileText, Home, ListChecks, LogOut, Moon, Settings, ShoppingBasket, Sun, UtensilsCrossed, X } from "lucide-react";
import { Documents } from "@/components/Documents";
import { LoginScreen, NotMemberScreen } from "@/components/LoginScreen";
import { MealPlanner } from "@/components/MealPlanner";
import { NotificationsCard } from "@/components/NotificationsCard";
import { Overview } from "@/components/Overview";
import { ShoppingList } from "@/components/ShoppingList";
import { TodoLists } from "@/components/TodoLists";
import { Training } from "@/components/Training";
import { supabase } from "@/integrations/supabase";
import { usePerson } from "@/lib/person-context";
import { refreshPushPerson } from "@/lib/push";
import { useTheme } from "@/lib/theme";

type Tab = "oversikt" | "handla" | "attgora" | "mat" | "traning" | "dokument";
const tabs = [
  ["oversikt", "Översikt", Home],
  ["handla", "Handla", ShoppingBasket],
  ["attgora", "Att göra", ListChecks],
  ["mat", "Mat", UtensilsCrossed],
  ["traning", "Träning", Dumbbell],
  ["dokument", "Dokument", FileText],
] as const;

const isTab = (value: string): value is Tab => tabs.some(([key]) => key === value);
const tabFromHash = (): Tab => {
  const hash = window.location.hash.replace("#", "");
  return isTab(hash) ? hash : "oversikt";
};

export default function App() {
  const { status, person, email, signOut } = usePerson();
  const { theme, toggle } = useTheme();
  const [tab, setTabState] = useState<Tab>(tabFromHash);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fliken ligger i URL:en så att den överlever omladdning och bakåtknappen fungerar.
  useEffect(() => {
    const onHash = () => setTabState(tabFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const setTab = (next: Tab) => {
    if (next !== tab) window.location.hash = next;
    setSettingsOpen(false);
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    if (person) void refreshPushPerson(person).catch(() => {});
  }, [person]);

  useEffect(() => {
    if (status !== "ready") {
      queryClient.clear();
      return;
    }
    const invalidate = (key: string) => () => queryClient.invalidateQueries({ queryKey: [key] });
    const channel = supabase
      .channel("hemma-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "shopping_items" }, invalidate("shopping"))
      .on("postgres_changes", { event: "*", schema: "public", table: "todo_items" }, invalidate("todos"))
      .on("postgres_changes", { event: "*", schema: "public", table: "meal_plan" }, invalidate("mealPlan"))
      .on("postgres_changes", { event: "*", schema: "public", table: "meal_ideas" }, invalidate("mealIdeas"))
      .on("postgres_changes", { event: "*", schema: "public", table: "documents" }, invalidate("documents"))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [queryClient, status]);

  if (status === "loading") return <div className="min-h-screen bg-background" />;
  if (status === "signedOut") return <LoginScreen />;
  if (status === "notMember") return <NotMemberScreen />;

  return <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-background">
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3"><div><h1 className="text-2xl leading-none text-foreground">Hemma</h1><p className="mt-1 text-xs text-muted-foreground">Inloggad som {person}</p></div>
        <div className="flex shrink-0 items-center gap-1"><button type="button" onClick={toggle} aria-label="Växla mörkt läge" className="flex size-11 items-center justify-center rounded-xl border border-border">{theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}</button><button type="button" onClick={() => setSettingsOpen(!settingsOpen)} aria-label="Inställningar" aria-expanded={settingsOpen} className="flex size-11 items-center justify-center rounded-xl border border-border">{settingsOpen ? <X className="size-4" /> : <Settings className="size-4" />}</button></div>
      </div>
    </header>
    <main className="flex-1 space-y-5 px-4 pb-28 pt-4">
      {settingsOpen && <section className="space-y-3">
        <h2 className="text-lg text-foreground">Inställningar</h2>
        <NotificationsCard />
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <p className="text-sm text-foreground">{email}</p>
          <button type="button" onClick={() => void signOut()} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm"><LogOut className="size-4" />Logga ut</button>
        </div>
      </section>}
      {!settingsOpen && <>{tab === "oversikt" && <Overview onNavigate={setTab} />}{tab === "handla" && <ShoppingList />}{tab === "attgora" && <TodoLists />}{tab === "mat" && <MealPlanner />}{tab === "traning" && <Training />}{tab === "dokument" && <Documents />}</>}
    </main>
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-lg border-t border-border bg-background/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur"><div className="flex">{tabs.map(([key, label, Icon]) => <button key={key} type="button" onClick={() => setTab(key)} className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-xs ${tab === key && !settingsOpen ? "text-primary" : "text-muted-foreground"}`}><Icon className="size-5" />{label}</button>)}</div></nav>
  </div>;
}
