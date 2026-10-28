-- ============================================================================
-- 005 — Integração Mercado Pago (gateway do Financeiro).
-- Os pagamentos chegam pela Edge Function `mercadopago` (webhook + sincronização)
-- e viram lançamentos com source = 'gateway' e external_id = id no Mercado Pago.
-- Indicadores vindos das assinaturas ficam em `settings`:
--   mrr_gateway, assinaturas_ativas, mp_last_sync (epoch em segundos).
-- ============================================================================

alter table controle_interno.transactions
  add column if not exists external_id text;

create unique index if not exists transactions_external_id_key
  on controle_interno.transactions(external_id) where external_id is not null;

-- MRR: com o gateway conectado vale o das assinaturas ativas; sem ele,
-- a soma dos lançamentos "Receita recorrente" do mês (como antes).
create or replace function public.ci_finance_kpis()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  m date := date_trunc('month', current_date)::date;
  p date := (date_trunc('month', current_date) - interval '1 month')::date;
  rc numeric; rp numeric; dc numeric; dp numeric; mrr numeric;
  sc numeric; sp numeric;
begin
  perform controle_interno.me();
  select coalesce(sum(amount) filter (where type='receita' and date >= m),0),
         coalesce(sum(amount) filter (where type='receita' and date >= p and date < m),0),
         coalesce(sum(amount) filter (where type='despesa' and date >= m),0),
         coalesce(sum(amount) filter (where type='despesa' and date >= p and date < m),0),
         coalesce(sum(amount) filter (where type='receita' and category ilike 'Receita recorrente%' and date >= m),0)
    into rc, rp, dc, dp, mrr
    from controle_interno.transactions where date >= p;
  mrr := coalesce((select value from controle_interno.settings where key = 'mrr_gateway'), mrr);
  select coalesce(sum(sales) filter (where month = m),0),
         coalesce(sum(sales) filter (where month = p),0)
    into sc, sp from controle_interno.marketing_channels where month in (m, p);
  return jsonb_build_object(
    'faturamento', rc, 'faturamentoDelta', controle_interno.delta(rc, rp),
    'despesas', dc, 'despesasDelta', controle_interno.delta(dc, dp),
    'lucroLiquido', rc - dc, 'lucroDelta', controle_interno.delta(rc - dc, rp - dp),
    'ticketMedio', case when sc > 0 then round(rc / sc, 2) else 0 end,
    'ticketDelta', controle_interno.delta(
        case when sc > 0 then rc / sc else 0 end,
        case when sp > 0 then rp / sp else 0 end),
    'mrr', mrr,
    'inadimplencia', coalesce((select value from controle_interno.settings where key = 'inadimplencia'), 0));
end $$;

revoke all on function public.ci_finance_kpis() from public, anon;
grant execute on function public.ci_finance_kpis() to authenticated;
