import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase";
import type { Person } from "./hemma";

type AuthStatus = "loading" | "signedOut" | "notMember" | "ready";

type PersonContextValue = {
  status: AuthStatus;
  person: Person | null;
  email: string | null;
  ready: boolean;
  signOut: () => Promise<void>;
  recheck: () => Promise<void>;
};

const PersonContext = createContext<PersonContextValue>({
  status: "loading",
  person: null,
  email: null,
  ready: false,
  signOut: async () => {},
  recheck: async () => {},
});

/** Inloggning via Supabase Auth. Personen kommer från hushållets medlemslista, inte från ett val i appen. */
export function PersonProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [person, setPerson] = useState<Person | null>(null);

  const resolveMember = useCallback(async (next: Session | null) => {
    setSession(next);
    if (!next) {
      setPerson(null);
      setStatus("signedOut");
      return;
    }
    const { data, error } = await supabase.rpc("hemma_person");
    if (error || (data !== "Hannes" && data !== "Elvira")) {
      setPerson(null);
      setStatus("notMember");
      return;
    }
    setPerson(data);
    setStatus("ready");
  }, []);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => resolveMember(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      // Tokenförnyelse ändrar inte vem som är inloggad.
      if (event === "TOKEN_REFRESHED") {
        setSession(next);
        return;
      }
      // Supabase rekommenderar att inte göra egna anrop direkt i callbacken.
      setTimeout(() => void resolveMember(next), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [resolveMember]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const recheck = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await resolveMember(data.session);
  }, [resolveMember]);

  return (
    <PersonContext.Provider
      value={{
        status,
        person,
        email: session?.user.email ?? null,
        ready: status !== "loading",
        signOut,
        recheck,
      }}
    >
      {children}
    </PersonContext.Provider>
  );
}

export function usePerson() {
  return useContext(PersonContext);
}

/** fetch mot appens egna API med inloggningstoken. */
export async function authFetch(input: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (data.session) headers.set("Authorization", `Bearer ${data.session.access_token}`);
  return fetch(input, { ...init, headers });
}
