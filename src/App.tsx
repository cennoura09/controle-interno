import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { TarefasPage } from "./pages/TarefasPage";
import { FinanceiroPage } from "./pages/FinanceiroPage";
import { MarketingPage } from "./pages/MarketingPage";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/tarefas" replace />} />
        <Route path="/tarefas" element={<TarefasPage />} />
        <Route path="/financeiro" element={<FinanceiroPage />} />
        <Route path="/marketing" element={<MarketingPage />} />
        <Route path="*" element={<Navigate to="/tarefas" replace />} />
      </Routes>
    </AppShell>
  );
}
