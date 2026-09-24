import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import App from "./App";
import { PersonProvider } from "./lib/person-context";
import { PasswordGate } from "./lib/password-gate";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10_000, retry: 1 } },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PasswordGate>
      <QueryClientProvider client={queryClient}>
        <PersonProvider>
          <App />
          <Toaster position="top-center" />
        </PersonProvider>
      </QueryClientProvider>
    </PasswordGate>
  </StrictMode>,
);
