# Controle Interno — MVP (Front-end)

Painel interno para controle de **tarefas**, **financeiro** e **marketing** de uma empresa, no estilo de um dashboard operacional (dark + acento laranja).

> **Escopo deste repositório:** o **front-end** do MVP, já preparado para receber o banco de dados. Todo acesso a dados passa por uma **camada de serviços** (`src/services`) que, por padrão, usa um mock em memória e troca para a API real apenas por variável de ambiente — sem mudar o código do app. As integrações (gateway de pagamento, Meta/Google Ads) seguem como **placeholders** até o back-end existir.

## Funcionalidades (MVP)

### 🗂️ Tarefas (Kanban)
Quadro `A Fazer / Em Andamento / Concluída` com drag-and-drop, filtros por escopo e modal de criação com **permissões por cargo**:

| Cargo | Pode criar tarefa para |
|---|---|
| Colaborador | Apenas para si mesmo |
| Diretor (CMO, CCO, CFO, COO) | Para si + membros do **seu** setor |
| CEO / Founder | **Todos** os setores e pessoas |

> Use o **seletor de cargo** no topo direito ("Simular cargo") para testar como cada papel enxerga e distribui tarefas. A lógica central está em [`src/lib/permissions.ts`](src/lib/permissions.ts).

### 💰 Financeiro
KPIs (faturamento, despesas, lucro, ticket médio), gráfico Receita × Despesa, tabela de transações e **lançamento manual**. Banner para conectar gateway (Stripe, Pagar.me, etc.).

### 📈 Marketing
KPIs (leads, CPL, investimento, ROAS, CAC, conversão), split orgânico × pago, funil de conversão e performance por canal. Banner para conectar Meta Ads, Google Ads e GA4.

## Stack
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** (design tokens em [`tailwind.config.js`](tailwind.config.js))
- **react-router-dom**, **recharts**, **lucide-react**
- Fontes: **Space Grotesk** (títulos) + **JetBrains Mono** (labels/números)

## Como rodar

```bash
npm install
cp .env.example .env   # opcional; o padrão já funciona com dados mock
npm run dev            # http://localhost:5173
```

Build de produção:

```bash
npm run typecheck      # checagem de tipos
npm run build
npm run preview
```

## Camada de dados (pronto para o banco)

O app importa **apenas** `data` de [`src/services`](src/services/index.ts), que
implementa a interface [`DataSource`](src/services/datasource.ts). Duas
implementações convivem:

| Env | Fonte |
|---|---|
| `VITE_DATA_SOURCE=mock` (padrão) | dados em memória ([`mock.ts`](src/services/mock.ts)) |
| `VITE_DATA_SOURCE=rest` | API do back-end em `VITE_API_URL` ([`rest.ts`](src/services/rest.ts)) |

Para ligar o banco real, basta subir uma API com os endpoints de
[`rest.ts`](src/services/rest.ts) e apontar o `.env` — **nada muda no front**.
O modelo de tabelas (PostgreSQL/Supabase) está em [`db/schema.sql`](db/schema.sql),
com dados de exemplo em [`db/seed.sql`](db/seed.sql).

> Agentes de código (Codex): ver [`AGENTS.md`](AGENTS.md).
> Documentação técnica completa: [`docs/`](docs/README.md).

## Estrutura

```
src/
  lib/          # types, permissions (regras centrais), format, cn, useAsync
  services/     # DataSource (contrato) + adaptadores mock e rest
  context/      # SessionContext (usuário atual + role switcher)
  data/         # seeds tipados (users, tasks, finance, marketing) do mock
  components/
    layout/     # AppShell, Sidebar, Topbar, RoleSwitcher
    ui/         # Card, StatCard, Badge, Button, Modal, Loading, Sparkline, ...
    tarefas/    # TaskCard, NovaTarefaModal
    equipe/     # GerenciarEquipeModal
  pages/        # TarefasPage, FinanceiroPage, MarketingPage
db/             # schema.sql + seed.sql (PostgreSQL/Supabase)
```

## Produção

Em produção o app usa **Supabase** (login real + banco) e roda na **Vercel**:
`VITE_DATA_SOURCE=supabase`. Detalhes de arquitetura, segurança e do
**admin supremo** em [`docs/OPERACAO.md`](docs/OPERACAO.md#produção-vercel--supabase).

- Banco: [`db/supabase/`](db/supabase) (schema `controle_interno`, regras de permissão no servidor e seed).
- API: Edge Function [`supabase/functions/controle-interno`](supabase/functions/controle-interno/index.ts).

## Próximos passos
- Implementar as integrações de pagamento e de marketing por trás dos `ConnectBanner` (hoje os dados de marketing vêm do seed).
