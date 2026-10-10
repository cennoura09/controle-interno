// TODO(backend): substituir por GET /api/marketing/* (Meta Ads, Google Ads, GA4).
import type { ChannelPerformance, FunnelStage, TrendPoint } from "../lib/types";

export const MARKETING_KPIS = {
  leads: 1_428,
  leadsDelta: 0.184,
  cpl: 16.4, // custo por lead (R$)
  cplDelta: -0.092, // caiu = bom
  investimento: 23_360, // R$ em ads no mês
  investimentoDelta: 0.051,
  roas: 4.8, // retorno sobre investimento em ads
  roasDelta: 0.121,
  vendas: 74,
  vendasDelta: 0.12,
  cac: 316, // custo de aquisição (R$)
  cacDelta: -0.047,
  conversao: 0.052, // lead -> venda
  conversaoDelta: 0.008,
};

export const CHANNELS: ChannelPerformance[] = [
  { id: "c-1", channel: "Google Ads", kind: "pago", invested: 11_200, leads: 612, sales: 34, revenue: 84_320 },
  { id: "c-2", channel: "Meta Ads", kind: "pago", invested: 9_800, leads: 498, sales: 22, revenue: 54_560 },
  { id: "c-3", channel: "LinkedIn Ads", kind: "pago", invested: 2_360, leads: 86, sales: 6, revenue: 29_880 },
  { id: "c-4", channel: "Instagram (orgânico)", kind: "organico", invested: 0, leads: 142, sales: 7, revenue: 17_360 },
  { id: "c-5", channel: "SEO / Blog", kind: "organico", invested: 0, leads: 68, sales: 4, revenue: 9_920 },
  { id: "c-6", channel: "Indicação", kind: "organico", invested: 0, leads: 22, sales: 1, revenue: 4_980 },
];

export const FUNNEL: FunnelStage[] = [
  { stage: "Leads", value: 1_428 },
  { stage: "Qualificados", value: 612 },
  { stage: "Reuniões", value: 268 },
  { stage: "Propostas", value: 132 },
  { stage: "Vendas", value: 74 },
];

export const LEADS_TREND: TrendPoint[] = [
  { day: "01", value: 38 }, { day: "05", value: 44 }, { day: "09", value: 41 },
  { day: "13", value: 52 }, { day: "17", value: 58 }, { day: "21", value: 55 },
  { day: "25", value: 67 }, { day: "29", value: 82 },
];
