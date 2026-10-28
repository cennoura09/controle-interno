import {
  LayoutDashboard,
  ListTodo,
  Wallet,
  Megaphone,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Rótulo curto da barra inferior no celular. */
  short?: string;
}

/** Itens da navegação principal (sidebar e busca). */
export const NAV: NavItem[] = [
  { to: "/visao-geral", label: "Visão geral", icon: LayoutDashboard, short: "Início" },
  { to: "/tarefas", label: "Tarefas", icon: ListTodo },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/marketing", label: "Marketing", icon: Megaphone },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

/** Barra inferior do celular: 4 atalhos + "Mais". */
export const MOBILE_NAV = NAV.slice(0, 4);
export const MORE_NAV = NAV.slice(4);
