// TODO(backend): substituir por GET /api/users (retornar User[]).
import type { User } from "../lib/types";

export const USERS: User[] = [
  // Executivo (acesso global)
  { id: "u-founder", name: "Eduardo Prado", role: "Founder", sector: "Executivo", title: "Founder", initials: "EP" },
  { id: "u-ceo", name: "Helena Castro", role: "CEO", sector: "Executivo", title: "CEO", initials: "HC" },

  // Diretores (C-level por setor)
  { id: "u-cmo", name: "Marina Alves", role: "CMO", sector: "Marketing", title: "Diretora de Marketing", initials: "MA" },
  { id: "u-cco", name: "Rafael Nunes", role: "CCO", sector: "Comercial", title: "Diretor Comercial", initials: "RN" },
  { id: "u-cfo", name: "Beatriz Lima", role: "CFO", sector: "Financeiro", title: "Diretora Financeira", initials: "BL" },
  { id: "u-coo", name: "Diego Ramos", role: "COO", sector: "Operacional", title: "Diretor de Operações", initials: "DR" },

  // Colaboradores — Marketing
  { id: "u-mkt-1", name: "Júlia Takahashi", role: "Colaborador", sector: "Marketing", title: "Analista de Tráfego Pago", initials: "JT" },
  { id: "u-mkt-2", name: "Pedro Rocha", role: "Colaborador", sector: "Marketing", title: "Social Media", initials: "PR" },

  // Colaboradores — Comercial
  { id: "u-com-1", name: "Rodrigo Mendes", role: "Colaborador", sector: "Comercial", title: "SDR", initials: "RM" },
  { id: "u-com-2", name: "Camila Vasconcelos", role: "Colaborador", sector: "Comercial", title: "Closer", initials: "CV" },

  // Colaboradores — Financeiro
  { id: "u-fin-1", name: "Lucas Moraes", role: "Colaborador", sector: "Financeiro", title: "Analista Financeiro", initials: "LM" },

  // Colaboradores — Operacional
  { id: "u-ops-1", name: "Ana Figueiredo", role: "Colaborador", sector: "Operacional", title: "Analista de CS", initials: "AF" },
  { id: "u-ops-2", name: "Bruno Carvalho", role: "Colaborador", sector: "Operacional", title: "Suporte Técnico", initials: "BC" },
];

export function getUser(id: string): User | undefined {
  return USERS.find((u) => u.id === id);
}
