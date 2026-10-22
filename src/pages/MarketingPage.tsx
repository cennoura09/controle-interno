import { Card, SectionHeader, SectionLabel } from "../components/ui/Card";
import { StatCard } from "../components/ui/StatCard";
import { Badge } from "../components/ui/Badge";
import { Sparkline } from "../components/ui/Sparkline";
import { ProgressBar } from "../components/ui/ProgressBar";
import { ConnectBanner } from "../components/ui/ConnectBanner";
import { Loading, LoadError } from "../components/ui/Loading";
import { data } from "../services";
import { useAsync } from "../lib/useAsync";
import type { ChannelPerformance } from "../lib/types";
import { brl, delta, num, pct } from "../lib/format";

export function MarketingPage() {
  const { data: loaded, loading, error, reload } = useAsync(
    () =>
      Promise.all([
        data.getMarketingKpis(),
        data.listChannels(),
        data.getFunnel(),
        data.getLeadsTrend(),
      ]).then(([kpis, channels, funnel, trend]) => ({
        kpis,
        channels,
        funnel,
        trend,
      })),
    []
  );

  const header = (
    <SectionHeader
      title="Marketing"
      description="Controle das métricas orgânicas e pagas: leads, canais, ROAS e conversão em vendas."
    />
  );

  const banner = (
    <ConnectBanner
      title="Conecte suas fontes de marketing"
      description="Puxe métricas de campanhas, leads e conversões automaticamente."
      integrations={["Meta Ads", "Google Ads", "Google Analytics 4", "RD Station"]}
    />
  );

  if (error) {
    return (
      <div className="space-y-6">
        {header}
        {banner}
        <LoadError error={error} onRetry={reload} />
      </div>
    );
  }

  if (!loaded || loading) {
    return (
      <div className="space-y-6">
        {header}
        {banner}
        <Loading label="Carregando marketing…" />
      </div>
    );
  }

  const K = loaded.kpis;
  const CHANNELS = loaded.channels;
  const FUNNEL = loaded.funnel;
  const LEADS_TREND = loaded.trend;

  const sum = (arr: ChannelPerformance[], k: "leads" | "revenue") =>
    arr.reduce((a, c) => a + c[k], 0);
  const pago = CHANNELS.filter((c) => c.kind === "pago");
  const organico = CHANNELS.filter((c) => c.kind === "organico");
  const leadsTotal = sum(CHANNELS, "leads");
  const totals = {
    pagoLeads: sum(pago, "leads"),
    orgLeads: sum(organico, "leads"),
    pagoRev: sum(pago, "revenue"),
    orgRev: sum(organico, "revenue"),
    leadsTotal,
    pagoShare: leadsTotal > 0 ? sum(pago, "leads") / leadsTotal : 0,
  };

  const maxFunnel = FUNNEL[0]?.value ?? 1;

  return (
    <div className="space-y-6">
      {header}
      {banner}

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard index="01" label="LEADS (MÊS)" value={num(K.leads)} sub="Capturados em todos os canais" delta={delta(K.leadsDelta)}
          footer={<Sparkline data={LEADS_TREND.map((p) => p.value)} />} />
        <StatCard index="02" label="CUSTO POR LEAD" value={brl(K.cpl)} sub="Média ponderada (pago)" delta={delta(K.cplDelta)} deltaInvert />
        <StatCard index="03" label="INVESTIMENTO EM ADS" value={brl(K.investimento, { compact: true })} sub="Total em mídia paga" delta={delta(K.investimentoDelta)} deltaInvert />
        <StatCard index="04" label="ROAS" value={`${K.roas.toFixed(1).replace(".", ",")}x`} sub="Retorno sobre investimento" delta={delta(K.roasDelta)} />
        <StatCard index="05" label="CAC" value={brl(K.cac)} sub="Custo de aquisição" delta={delta(K.cacDelta)} deltaInvert />
        <StatCard index="06" label="CONVERSÃO LEAD→VENDA" value={pct(K.conversao)} sub={`${K.vendas} vendas no mês`} delta={delta(K.conversaoDelta)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Orgânico x Pago */}
        <Card className="flex flex-col gap-4">
          <SectionLabel index="07">ORGÂNICO × PAGO</SectionLabel>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-accent" />Pago</span>
              <span className="mono-num text-muted">{num(totals.pagoLeads)} leads · {pct(totals.pagoShare)}</span>
            </div>
            <ProgressBar value={totals.pagoShare * 100} />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-info" />Orgânico</span>
              <span className="mono-num text-muted">{num(totals.orgLeads)} leads · {pct(1 - totals.pagoShare)}</span>
            </div>
            <ProgressBar value={(1 - totals.pagoShare) * 100} color="bg-info" />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3 border-t border-border-soft pt-4">
            <div>
              <div className="mono-label">RECEITA PAGO</div>
              <div className="mono-num mt-1 text-lg font-semibold text-accent">{brl(totals.pagoRev, { compact: true })}</div>
            </div>
            <div>
              <div className="mono-label">RECEITA ORGÂNICO</div>
              <div className="mono-num mt-1 text-lg font-semibold text-info">{brl(totals.orgRev, { compact: true })}</div>
            </div>
          </div>
        </Card>

        {/* Funil */}
        <Card className="lg:col-span-2">
          <SectionLabel index="08">FUNIL DE CONVERSÃO</SectionLabel>
          <div className="mt-4 space-y-3">
            {FUNNEL.map((stage, i) => {
              const width = (stage.value / maxFunnel) * 100;
              const conv = i === 0 ? 1 : stage.value / FUNNEL[i - 1].value;
              return (
                <div key={stage.stage}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-muted">{stage.stage}</span>
                    <span className="mono-num flex items-center gap-2">
                      <span className="font-medium">{num(stage.value)}</span>
                      {i > 0 && <span className="text-[11px] text-muted-2">{pct(conv, 0)}</span>}
                    </span>
                  </div>
                  <div className="h-7 overflow-hidden rounded-md bg-surface-3">
                    <div
                      className="flex h-full items-center rounded-md bg-gradient-to-r from-accent/80 to-accent"
                      style={{ width: `${Math.max(width, 6)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Tabela de canais */}
      <Card className="p-0">
        <div className="flex items-center justify-between p-5 pb-3">
          <SectionLabel index="09">PERFORMANCE POR CANAL</SectionLabel>
          <span className="font-mono text-xs text-muted">{CHANNELS.length} canais</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border text-left font-mono text-[10px] uppercase tracking-wider text-muted">
                <th className="px-5 py-2.5 font-medium">Canal</th>
                <th className="px-5 py-2.5 font-medium">Tipo</th>
                <th className="px-5 py-2.5 text-right font-medium">Investido</th>
                <th className="px-5 py-2.5 text-right font-medium">Leads</th>
                <th className="px-5 py-2.5 text-right font-medium">Vendas</th>
                <th className="px-5 py-2.5 text-right font-medium">Receita</th>
                <th className="px-5 py-2.5 text-right font-medium">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {CHANNELS.map((c) => {
                const roas = c.invested > 0 ? c.revenue / c.invested : null;
                return (
                  <tr key={c.id} className="border-b border-border-soft last:border-0 hover:bg-surface-2/50">
                    <td className="px-5 py-3 font-medium">{c.channel}</td>
                    <td className="px-5 py-3">
                      <Badge tone={c.kind === "pago" ? "accent" : "info"}>
                        {c.kind === "pago" ? "Pago" : "Orgânico"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-muted">{c.invested > 0 ? brl(c.invested, { compact: true }) : "—"}</td>
                    <td className="px-5 py-3 text-right font-mono">{num(c.leads)}</td>
                    <td className="px-5 py-3 text-right font-mono">{num(c.sales)}</td>
                    <td className="px-5 py-3 text-right font-mono text-success">{brl(c.revenue, { compact: true })}</td>
                    <td className="px-5 py-3 text-right font-mono">
                      {roas ? <span className="text-accent">{roas.toFixed(1).replace(".", ",")}x</span> : <span className="text-muted-2">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
