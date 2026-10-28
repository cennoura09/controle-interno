import { useEffect, useRef, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileHeader, BottomNav } from "./MobileChrome";
import { CommandPalette } from "./CommandPalette";
import { NovaTarefaModal } from "../tarefas/NovaTarefaModal";
import { TaskDrawer } from "../tarefas/TaskDrawer";
import { GerenciarEquipeModal } from "../equipe/GerenciarEquipeModal";
import { useUI } from "../../context/UIContext";
import { useTasks } from "../../context/TasksContext";

export function AppShell({ children }: { children: ReactNode }) {
  const { newTask, closeNewTask, teamOpen, setTeamOpen } = useUI();
  const { create, actionError, clearActionError } = useTasks();
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  // Cada página começa do topo.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="flex h-full bg-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <MobileHeader />
        <main ref={mainRef} className="relative flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto max-w-[1360px] px-4 pb-32 pt-6 sm:px-6 sm:pt-8 lg:px-10 lg:pb-12 lg:pt-10">{children}</div>
        </main>
      </div>
      <BottomNav />

      {/* Camadas globais */}
      <CommandPalette />
      <TaskDrawer />
      <NovaTarefaModal
        open={newTask.open}
        initialStatus={newTask.status}
        initialDueDate={newTask.dueDate}
        onClose={closeNewTask}
        onCreate={async (inputs) => {
          await create(inputs);
        }}
      />
      <GerenciarEquipeModal open={teamOpen} onClose={() => setTeamOpen(false)} />

      {actionError && (
        <div
          role="alert"
          className="fixed bottom-28 left-1/2 z-[70] flex max-w-[92vw] -translate-x-1/2 items-start gap-3 rounded-xl border border-danger/40 bg-[#1A0F10] px-4 py-3 text-sm text-danger shadow-2xl lg:bottom-6"
        >
          <span>{actionError}</span>
          <button onClick={clearActionError} aria-label="Fechar aviso" className="text-danger/70 hover:text-danger">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
