# Componentes e design

## Tokens de design (`tailwind.config.js`)

Tema **dark fixo**, acento laranja. Use sempre os tokens — nunca cores fixas.

### Cores

| Token | Hex | Uso |
|---|---|---|
| `bg` | `#0A0A0B` | fundo da página |
| `surface` / `surface-2` / `surface-3` | `#141416` / `#1B1B1F` / `#232328` | superfícies elevadas |
| `border` / `border-soft` | `#27272B` / `#1F1F23` | bordas |
| `content` | `#ECECEC` | texto principal |
| `muted` / `muted-2` | `#8A8A90` / `#5E5E66` | texto secundário/terciário |
| `accent` / `accent-hover` / `accent-soft` | `#FF5C00` / `#FF7A2E` / rgba 12% | marca, destaques |
| `success` / `success-soft` | `#34D399` / rgba 14% | positivo |
| `danger` / `danger-soft` | `#F87171` / rgba 14% | negativo/erro |
| `info` | `#3B82F6` | info/orgânico |
| `warning` | `#FBBF24` | atenção |

### Tipografia, raio, sombra

- `font-display` → Space Grotesk (títulos, UI).
- `font-mono` → JetBrains Mono (números, labels).
- `rounded-card` → 12px. Sombras: `shadow-card`, `shadow-glow`.

### Utilitários de componente (`src/index.css`)

- `.card` — superfície padrão (`rounded-card border bg-surface shadow-card`).
- `.mono-label` — label monoespaçada maiúscula ("01 // VOLUME TOTAL").
- `.mono-num` — números monoespaçados com `tabular-nums`.
- `.focus-ring` — anel de foco acessível (aplique em tudo que recebe foco).

## Catálogo de UI (`src/components/ui`)

| Componente | Props principais | Nota |
|---|---|---|
| `Card` | `children`, `className` | superfície `.card p-5` |
| `SectionLabel` | `index?`, `children` | label "01 // TÍTULO" |
| `SectionHeader` | `title`, `description?`, `right?` | cabeçalho de página/seção |
| `StatCard` | `index?`, `label`, `value`, `sub?`, `delta?`, `deltaInvert?`, `footer?` | KPI; `value`/`delta` já formatados |
| `Badge` | `tone` = neutral\|accent\|success\|info\|danger | etiqueta pequena |
| `DeltaPill` | `value` (ex. "+14,2%"), `invert?` | variação ▲/▼; `invert` p/ métricas onde cair é bom (CPL, CAC) |
| `PriorityBadge` | `priority: TaskPriority` | ponto colorido + rótulo |
| `StatusDot` | — | ponto "ao vivo" pulsante |
| `Avatar` | `initials`, `size?` | círculo com iniciais |
| `Button` | `variant` = primary\|secondary\|ghost, `icon?`, + attrs de `<button>` | |
| `Modal` | `open`, `onClose`, `title`, `description?`, `children` | fecha com Esc/clique no fundo; trava scroll |
| `ProgressBar` | `value`, `max?`, `color?` | barra fina |
| `Sparkline` | `data: number[]`, `color?`, `height?`, `width?` | mini-gráfico SVG próprio (sem lib) |
| `ConnectBanner` | `title`, `description`, `integrations: string[]`, `action?`, `secondary?` | **placeholder**; botão desativado até o back-end |
| `EmptyState` | `icon?`, `title`, `description?` | estado vazio |
| `Loading` / `FullScreenLoading` / `LoadError` | `label?` / `error`, `onRetry?` | estados de carregamento/erro (ligados ao `useAsync`) |

Formatação de valores: `brl`, `num`, `pct`, `delta`, `shortDate` em
[`../src/lib/format.ts`](../src/lib/format.ts) (locale pt-BR).

## Layout (`src/components/layout`)

- `AppShell` — `Sidebar` + `Topbar` + `<main>` com o conteúdo da rota; barra de
  navegação inferior no mobile.
- `Sidebar` (desktop ≥lg) — marca So Sales, card da empresa com "Gerenciar
  equipe" (abre `GerenciarEquipeModal`), navegação, widget de progresso.
- `Topbar` — busca (placeholder), notificações (placeholder) e `RoleSwitcher`.
- `RoleSwitcher` — troca o "usuário atual" para simular cargos/permissões.

## Domínio

- `tarefas/TaskCard` — card arrastável do Kanban (setor, prioridade,
  responsável, prazo, quem atribuiu).
- `tarefas/NovaTarefaModal` — criação com seleção **múltipla** de destinatários,
  limitada pela permissão; emite `NewTask[]`.
- `equipe/GerenciarEquipeModal` — lista a equipe por setor e cria contas
  (restrito por cargo); emite `NewUser`.

## Páginas (`src/pages`)

Cada uma carrega via `useAsync(() => data.*)` e trata `Loading`/`LoadError`:

- `TarefasPage` — Kanban (A Fazer / Em Andamento / Concluída) com drag-and-drop,
  filtros de escopo (Minhas / Setor / Todas) e criação de tarefas.
- `FinanceiroPage` — KPIs, gráfico Receita × Despesa (recharts), indicadores,
  tabela de transações e lançamento manual (restrito).
- `MarketingPage` — KPIs, split orgânico × pago, funil de conversão e
  performance por canal.

## Convenções de UI

- Composição de classes via `cn()` ([`../src/lib/cn.ts`](../src/lib/cn.ts)).
- Elementos focáveis recebem `.focus-ring`.
- Ícones: `lucide-react`.
- Gráfico de linha/área simples → `Sparkline` (SVG próprio); gráficos ricos → recharts.
