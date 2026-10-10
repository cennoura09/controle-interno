// TODO(backend): substituir por GET /api/finance/* (gateway: Stripe/Pagar.me).
import type { MonthlyPoint, Transaction } from "../lib/types";

export const FINANCE_KPIS = {
  faturamento: 184_320, // R$ no mês
  faturamentoDelta: 0.142, // +14,2%
  despesas: 97_540,
  despesasDelta: 0.061,
  lucroLiquido: 86_780,
  lucroDelta: 0.283,
  ticketMedio: 2_480,
  ticketDelta: -0.031,
  mrr: 142_900,
  inadimplencia: 0.038,
};

export const REVENUE_SERIES: MonthlyPoint[] = [
  { month: "Mai", receita: 132_000, despesa: 88_000 },
  { month: "Jun", receita: 141_500, despesa: 90_200 },
  { month: "Jul", receita: 155_800, despesa: 92_400 },
  { month: "Ago", receita: 162_300, despesa: 95_100 },
  { month: "Set", receita: 171_900, despesa: 96_800 },
  { month: "Out", receita: 184_320, despesa: 97_540 },
];

export const TRANSACTIONS: Transaction[] = [
  { id: "f-1", date: "2026-10-08", description: "Assinatura — Plano Enterprise (OdontoPrime)", category: "Receita recorrente", type: "receita", amount: 4_980, source: "gateway" },
  { id: "f-2", date: "2026-10-08", description: "Google Ads — investimento", category: "Marketing", type: "despesa", amount: 6_200, source: "gateway" },
  { id: "f-3", date: "2026-10-07", description: "Assinatura — Plano Pro (x14)", category: "Receita recorrente", type: "receita", amount: 13_860, source: "gateway" },
  { id: "f-4", date: "2026-10-07", description: "Folha de pagamento — parcial", category: "Pessoal", type: "despesa", amount: 42_300, source: "manual" },
  { id: "f-5", date: "2026-10-06", description: "Setup + implementação (projeto único)", category: "Serviços", type: "receita", amount: 9_500, source: "manual" },
  { id: "f-6", date: "2026-10-05", description: "Ferramentas SaaS (stack interno)", category: "Software", type: "despesa", amount: 3_140, source: "gateway" },
  { id: "f-7", date: "2026-10-04", description: "Meta Ads — investimento", category: "Marketing", type: "despesa", amount: 5_480, source: "gateway" },
  { id: "f-8", date: "2026-10-03", description: "Assinatura — Plano Enterprise (x3)", category: "Receita recorrente", type: "receita", amount: 14_940, source: "gateway" },
];
