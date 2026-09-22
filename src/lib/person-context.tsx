import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

import type { Person } from "./hemma";

const STORAGE_KEY = "hemma.person";

type PersonContextValue = {
  person: Person | null;
  ready: boolean;
  setPerson: (person: Person | null) => void;
};

const PersonContext = createContext<PersonContextValue>({
  person: null,
  ready: false,
  setPerson: () => {},
});

export function PersonProvider({ children }: { children: ReactNode }) {
  const [person, setPersonState] = useState<Person | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "Hannes" || stored === "Elvira") setPersonState(stored);
    setReady(true);
  }, []);

  const setPerson = useCallback((next: Person | null) => {
    setPersonState(next);
    if (next) window.localStorage.setItem(STORAGE_KEY, next);
    else window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <PersonContext.Provider value={{ person, ready, setPerson }}>
      {children}
    </PersonContext.Provider>
  );
}

export function usePerson() {
  return useContext(PersonContext);
}
