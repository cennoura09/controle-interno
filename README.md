# Controle Interno — MVP (Front-end)

Painel interno para controle de **tarefas**, **financeiro** e **marketing** de uma empresa, no estilo de um dashboard operacional (dark + acento laranja).

> **Escopo deste repositório:** apenas o **front-end / design** do MVP. Todos os dados são **mockados** e as integrações (gateway de pagamento, Meta/Google Ads) são **placeholders**. O back-end (APIs, autenticação e integrações reais) será desenvolvido pela equipe — os pontos de conexão estão marcados com `// TODO(backend)`.

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
npm run dev      # http://localhost:5173
```

Build de produção:

```bash
npm run build
npm run preview
```

## Estrutura

```
src/
  lib/          # types, permissions (regras centrais), format, cn
  context/      # SessionContext (usuário atual + role switcher)
  data/         # mocks tipados (users, tasks, finance, marketing) + seams de API
  components/
    layout/     # AppShell, Sidebar, Topbar, RoleSwitcher
    ui/         # Card, StatCard, Badge, Button, Modal, Sparkline, ...
    tarefas/    # TaskCard, NovaTarefaModal
  pages/        # TarefasPage, FinanceiroPage, MarketingPage
```

## Próximos passos (back-end)
- Trocar os mocks em `src/data/*` por chamadas de API (ver comentários `TODO(backend)`).
- Implementar autenticação e derivar o `currentUser` da sessão real.
- **Revalidar as permissões no servidor** — o front-end apenas reflete o que é permitido.
- Implementar as integrações de pagamento e de marketing por trás dos `ConnectBanner`.
