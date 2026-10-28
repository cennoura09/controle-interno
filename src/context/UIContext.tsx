import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { TaskStatus } from "../lib/types";

// Estado de interface global: paleta de busca (⌘K), modal "Nova tarefa",
// sidebar recolhida e painel de equipe.

interface UIValue {
  paletteOpen: boolean;
  openPalette: () => void;
  closePalette: () => void;
  /** Abre "Nova tarefa" (opcionalmente já numa coluna e/ou com prazo). */
  newTask: { open: boolean; status: TaskStatus; dueDate?: string };
  openNewTask: (status?: TaskStatus, dueDate?: string) => void;
  closeNewTask: () => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  teamOpen: boolean;
  setTeamOpen: (open: boolean) => void;
}

const UIContext = createContext<UIValue | null>(null);
const COLLAPSE_KEY = "ci.sidebarCollapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [newTask, setNewTask] = useState<{ open: boolean; status: TaskStatus; dueDate?: string }>({ open: false, status: "todo" });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readCollapsed);
  const [teamOpen, setTeamOpen] = useState(false);

  // ⌘K / Ctrl+K abre a busca de qualquer lugar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((v) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, v ? "0" : "1");
      } catch {
        /* armazenamento indisponível: só não lembra a preferência */
      }
      return !v;
    });
  }, []);

  const value = useMemo<UIValue>(
    () => ({
      paletteOpen,
      openPalette: () => setPaletteOpen(true),
      closePalette: () => setPaletteOpen(false),
      newTask,
      openNewTask: (status = "todo", dueDate) => setNewTask({ open: true, status, dueDate }),
      closeNewTask: () => setNewTask((s) => ({ ...s, open: false })),
      sidebarCollapsed,
      toggleSidebar,
      teamOpen,
      setTeamOpen,
    }),
    [paletteOpen, newTask, sidebarCollapsed, toggleSidebar, teamOpen]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI deve ser usado dentro de UIProvider");
  return ctx;
}
