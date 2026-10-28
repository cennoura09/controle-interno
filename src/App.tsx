import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { UIProvider } from "./context/UIContext";
import { TasksProvider } from "./context/TasksContext";
import { VisaoGeralPage } from "./pages/VisaoGeralPage";
import { TarefasPage } from "./pages/TarefasPage";
import { FinanceiroPage } from "./pages/FinanceiroPage";
import { MarketingPage } from "./pages/MarketingPage";
import { RelatoriosPage } from "./pages/RelatoriosPage";
import { ConfiguracoesPage } from "./pages/ConfiguracoesPage";

export default function App() {
  return (
    <UIProvider>
      <TasksProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<Navigate to="/tarefas" replace />} />
            <Route path="/visao-geral" element={<VisaoGeralPage />} />
            <Route path="/tarefas" element={<TarefasPage />} />
            <Route path="/financeiro" element={<FinanceiroPage />} />
            <Route path="/marketing" element={<MarketingPage />} />
            <Route path="/relatorios" element={<RelatoriosPage />} />
            <Route path="/configuracoes" element={<ConfiguracoesPage />} />
            <Route path="*" element={<Navigate to="/tarefas" replace />} />
          </Routes>
        </AppShell>
      </TasksProvider>
    </UIProvider>
  );
}
