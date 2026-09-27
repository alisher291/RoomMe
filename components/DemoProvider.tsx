"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { emptyState, restoreState, STORAGE_KEY } from "@/lib/storage";
import type { DemoState } from "@/lib/types";
const Context = createContext<{
  state: DemoState;
  setState: Dispatch<SetStateAction<DemoState>>;
  ready: boolean;
  notice: string;
} | null>(null);
export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(emptyState);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  // Browser storage must be read after hydration; this one-time synchronization is intentional.
  useEffect(() => {
    let restored;
    try {
      restored = restoreState(localStorage.getItem(STORAGE_KEY));
    } catch {
      restored = {
        state: emptyState(),
        notice:
          "Browser storage is unavailable. Progress will last only for this visit.",
      };
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate browser-only saved state once after mount.
    setState(restored.state);
    setNotice(restored.notice);
    setReady(true);
  }, []);
  // Surface storage failures without losing the in-memory state.
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Report a failed write to browser storage.
        setNotice(
          "Progress could not be saved. Browser storage may be full or disabled.",
        );
      }
  }, [state, ready]);
  return (
    <Context.Provider value={{ state, setState, ready, notice }}>
      {children}
    </Context.Provider>
  );
}
export function useDemo() {
  const value = useContext(Context);
  if (!value) throw Error("DemoProvider missing");
  return value;
}
