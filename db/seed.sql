-- ============================================================================
-- Seed de demonstração — espelha os mocks de src/data/*.
-- Rode DEPOIS de db/schema.sql. Idempotente (limpa antes de inserir).
-- ============================================================================

truncate tasks, transactions, marketing_channels, app_users restart identity cascade;

-- --- Equipe ----------------------------------------------------------------
insert into app_users (id, name, role, sector, title, initials) values
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
  ('u-ops-2','Bruno Carvalho','Colaborador','Operacional','Suporte Técnico','BC');

-- --- Tarefas ---------------------------------------------------------------
insert into tasks (id, title, description, status, priority, sector, assignee_id, created_by_id, due_date, created_at) values
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
  ('t-11','Alinhar meta de faturamento Q4 com Financeiro e Comercial',null,'todo','media','Executivo','u-cfo','u-ceo','2026-10-15','2026-10-04');

-- --- Financeiro ------------------------------------------------------------
insert into transactions (id, date, description, category, type, amount, source) values
  ('f-1','2026-10-08','Assinatura — Plano Enterprise (OdontoPrime)','Receita recorrente','receita',4980,'gateway'),
  ('f-2','2026-10-08','Google Ads — investimento','Marketing','despesa',6200,'gateway'),
  ('f-3','2026-10-07','Assinatura — Plano Pro (x14)','Receita recorrente','receita',13860,'gateway'),
  ('f-4','2026-10-07','Folha de pagamento — parcial','Pessoal','despesa',42300,'manual'),
  ('f-5','2026-10-06','Setup + implementação (projeto único)','Serviços','receita',9500,'manual'),
  ('f-6','2026-10-05','Ferramentas SaaS (stack interno)','Software','despesa',3140,'gateway'),
  ('f-7','2026-10-04','Meta Ads — investimento','Marketing','despesa',5480,'gateway'),
  ('f-8','2026-10-03','Assinatura — Plano Enterprise (x3)','Receita recorrente','receita',14940,'gateway');

-- --- Marketing -------------------------------------------------------------
insert into marketing_channels (id, channel, kind, invested, leads, sales, revenue) values
  ('c-1','Google Ads','pago',11200,612,34,84320),
  ('c-2','Meta Ads','pago',9800,498,22,54560),
  ('c-3','LinkedIn Ads','pago',2360,86,6,29880),
  ('c-4','Instagram (orgânico)','organico',0,142,7,17360),
  ('c-5','SEO / Blog','organico',0,68,4,9920),
  ('c-6','Indicação','organico',0,22,1,4980);
