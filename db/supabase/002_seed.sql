-- ============================================================================
-- Seed inicial do Controle Interno (So Sales) — rode após 001_schema.sql.
-- Equipe, tarefas, 6 meses de financeiro (Mai–Out/2026) e marketing (Set–Out).
-- O admin supremo NÃO é criado aqui (a senha não deve ir para o git): ver
-- docs/OPERACAO.md → "Admin supremo".
-- ============================================================================

-- --- Equipe ----------------------------------------------------------------
insert into controle_interno.app_users (id, name, role, sector, title, initials) values
  ('u-founder','Eduardo Prado','Founder','Executivo','Founder','EP'),
  ('u-ceo','Helena Castro','CEO','Executivo','CEO','HC'),
  ('u-cmo','Marina Alves','CMO','Marketing','Diretora de Marketing','MA'),
  ('u-cco','Rafael Nunes','CCO','Comercial','Diretor Comercial','RN'),
  ('u-cfo','Beatriz Lima','CFO','Financeiro','Diretora Financeira','BL'),
  ('u-coo','Diego Ramos','COO','Operacional','Diretor de Operações','DR'),
  ('u-mkt-1','Júlia Takahashi','Colaborador','Marketing','Analista de Tráfego Pago','JT'),
  ('u-mkt-2','Pedro Rocha','Colaborador','Marketing','Social Media','PR'),
  ('u-com-1','Rodrigo Mendes','Colaborador','Comercial','SDR','RM'),
  ('u-com-2','Camila Vasconcelos','Colaborador','Comercial','Closer','CV'),
  ('u-fin-1','Lucas Moraes','Colaborador','Financeiro','Analista Financeiro','LM'),
  ('u-ops-1','Ana Figueiredo','Colaborador','Operacional','Analista de CS','AF'),
  ('u-ops-2','Bruno Carvalho','Colaborador','Operacional','Suporte Técnico','BC')
on conflict (id) do nothing;

-- --- Tarefas ---------------------------------------------------------------
insert into controle_interno.tasks (id, title, description, status, priority, sector, assignee_id, created_by_id, due_date, created_at) values
  ('t-1','Otimizar campanha de tráfego — Clínica OdontoPrime','Reduzir CPL abaixo de R$ 18 e escalar os criativos vencedores.','doing','alta','Marketing','u-mkt-1','u-cmo','2026-10-14','2026-10-06'),
  ('t-2','Calendário de conteúdo orgânico — Novembro',null,'todo','media','Marketing','u-mkt-2','u-cmo','2026-10-20','2026-10-07'),
  ('t-3','Relatório mensal de métricas de aquisição',null,'done','media','Marketing','u-mkt-1','u-mkt-1','2026-10-05','2026-09-30'),
  ('t-4','Follow-up dos 12 leads quentes da semana',null,'doing','urgente','Comercial','u-com-1','u-cco','2026-10-10','2026-10-08'),
  ('t-5','Revisar script de fechamento (v3)',null,'todo','media','Comercial','u-com-2','u-cco','2026-10-16','2026-10-08'),
  ('t-6','Conciliação bancária de Setembro',null,'done','alta','Financeiro','u-fin-1','u-cfo','2026-10-03','2026-09-29'),
  ('t-7','Projeção de fluxo de caixa Q4',null,'doing','alta','Financeiro','u-fin-1','u-cfo','2026-10-18','2026-10-07'),
  ('t-8','Reduzir tempo de 1ª resposta no suporte para < 2h',null,'doing','alta','Operacional','u-ops-2','u-coo','2026-10-22','2026-10-06'),
  ('t-9','Onboarding dos 3 novos clientes enterprise',null,'todo','urgente','Operacional','u-ops-1','u-coo','2026-10-12','2026-10-08'),
  ('t-10','Preparar deck do board — resultados de Outubro',null,'todo','alta','Executivo','u-ceo','u-founder','2026-10-28','2026-10-05'),
  ('t-11','Alinhar meta de faturamento Q4 com Financeiro e Comercial',null,'todo','media','Executivo','u-cfo','u-ceo','2026-10-15','2026-10-04')
on conflict (id) do nothing;

-- --- Financeiro: Outubro (detalhado) ---------------------------------------
insert into controle_interno.transactions (id, date, description, category, type, amount, source) values
  ('f-1','2026-10-08','Assinatura — Plano Enterprise (OdontoPrime)','Receita recorrente','receita',4980,'gateway'),
  ('f-2','2026-10-08','Google Ads — investimento','Marketing','despesa',6200,'gateway'),
  ('f-3','2026-10-07','Assinatura — Plano Pro (x14)','Receita recorrente','receita',13860,'gateway'),
  ('f-4','2026-10-07','Folha de pagamento — parcial','Pessoal','despesa',42300,'manual'),
  ('f-5','2026-10-06','Setup + implementação (projeto único)','Serviços','receita',9500,'manual'),
  ('f-6','2026-10-05','Ferramentas SaaS (stack interno)','Software','despesa',3140,'gateway'),
  ('f-7','2026-10-04','Meta Ads — investimento','Marketing','despesa',5480,'gateway'),
  ('f-8','2026-10-03','Assinatura — Plano Enterprise (x3)','Receita recorrente','receita',14940,'gateway'),
  ('f-9','2026-10-01','Assinaturas — renovações do mês (base ativa)','Receita recorrente','receita',109120,'gateway'),
  ('f-10','2026-10-02','Consultoria e treinamentos','Serviços','receita',31920,'manual'),
  ('f-11','2026-10-05','Folha de pagamento — complemento','Pessoal','despesa',28000,'manual'),
  ('f-12','2026-10-01','Aluguel e infraestrutura','Infraestrutura','despesa',8400,'manual'),
  ('f-13','2026-10-04','LinkedIn Ads — investimento','Marketing','despesa',2360,'gateway'),
  ('f-14','2026-10-02','Taxas de gateway','Taxas','despesa',1660,'gateway')
on conflict (id) do nothing;

-- --- Financeiro: Mai–Set (consolidado mensal) ------------------------------
insert into controle_interno.transactions (id, date, description, category, type, amount, source)
select 'h-' || to_char(m, 'YYYY-MM') || '-' || k, m + d, descr, cat, typ::controle_interno.transaction_type, amt, src::controle_interno.transaction_source
from (values
  (date '2026-05-01',132000,88000),
  (date '2026-06-01',141500,90200),
  (date '2026-07-01',155800,92400),
  (date '2026-08-01',162300,95100),
  (date '2026-09-01',171900,96800)
) as s(m, r, dsp)
cross join lateral (values
  (1, 0, 'Assinaturas — receita recorrente do mês','Receita recorrente','receita', round(r*0.8), 'gateway'),
  (2, 9, 'Setup, implementação e consultoria','Serviços','receita', r - round(r*0.8), 'manual'),
  (3, 4, 'Folha de pagamento','Pessoal','despesa', round(dsp*0.6), 'manual'),
  (4, 6, 'Mídia paga (Google, Meta, LinkedIn)','Marketing','despesa', round(dsp*0.25), 'gateway'),
  (5, 2, 'Software, infraestrutura e taxas','Software','despesa', dsp - round(dsp*0.6) - round(dsp*0.25), 'gateway')
) as l(k, d, descr, cat, typ, amt, src)
on conflict (id) do nothing;

-- --- Marketing: canais (Outubro + Setembro para comparação) ----------------
insert into controle_interno.marketing_channels (id, month, channel, kind, invested, leads, sales, revenue) values
  ('c-1','2026-10-01','Google Ads','pago',11200,612,34,84320),
  ('c-2','2026-10-01','Meta Ads','pago',9800,498,22,54560),
  ('c-3','2026-10-01','LinkedIn Ads','pago',2360,86,6,29880),
  ('c-4','2026-10-01','Instagram (orgânico)','organico',0,142,7,17360),
  ('c-5','2026-10-01','SEO / Blog','organico',0,68,4,9920),
  ('c-6','2026-10-01','Indicação','organico',0,22,1,4980),
  ('c-1-09','2026-09-01','Google Ads','pago',10600,518,30,74100),
  ('c-2-09','2026-09-01','Meta Ads','pago',9400,421,20,48900),
  ('c-3-09','2026-09-01','LinkedIn Ads','pago',2220,72,5,24900),
  ('c-4-09','2026-09-01','Instagram (orgânico)','organico',0,120,6,14900),
  ('c-5-09','2026-09-01','SEO / Blog','organico',0,57,4,9900),
  ('c-6-09','2026-09-01','Indicação','organico',0,18,1,4980)
on conflict (id) do nothing;

insert into controle_interno.funnel_stages (month, position, stage, value) values
  ('2026-10-01',1,'Leads',1428),
  ('2026-10-01',2,'Qualificados',612),
  ('2026-10-01',3,'Reuniões',268),
  ('2026-10-01',4,'Propostas',132),
  ('2026-10-01',5,'Vendas',74)
on conflict do nothing;

insert into controle_interno.leads_daily (day, value) values
  ('2026-10-01',38),('2026-10-05',44),('2026-10-09',41),('2026-10-13',52),
  ('2026-10-17',58),('2026-10-21',55),('2026-10-25',67),('2026-10-27',82)
on conflict do nothing;

insert into controle_interno.settings (key, value) values ('inadimplencia', 0.038)
on conflict (key) do nothing;
