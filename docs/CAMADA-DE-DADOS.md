# Camada de dados

Todo acesso a dados passa por uma única interface, `DataSource`. O app importa
**apenas** `data` de [`../src/services/index.ts`](../src/services/index.ts) —
nunca os mocks diretamente.

## Arquivos

| Arquivo | Papel |
|---|---|
| [`datasource.ts`](../src/services/datasource.ts) | Interface `DataSource` + helper `deriveInitials` |
| [`mock.ts`](../src/services/mock.ts) | `MockDataSource` — estado em memória (padrão) |
| [`rest.ts`](../src/services/rest.ts) | `RestDataSource` — chama a API via `fetch` |
| [`index.ts`](../src/services/index.ts) | Escolhe a implementação por env e exporta `data` |

## A interface `DataSource`

```ts
interface DataSource {
  // Equipe
  listUsers(): Promise<User[]>;
  createUser(input: NewUser): Promise<User>;
  // Tarefas
  listTasks(): Promise<Task[]>;
  createTasks(inputs: NewTask[]): Promise<Task[]>;       // uma tarefa por item
  updateTaskStatus(id: string, status: TaskStatus): Promise<Task>;
  // Financeiro
  getFinanceKpis(): Promise<FinanceKpis>;
  getRevenueSeries(): Promise<MonthlyPoint[]>;
  listTransactions(): Promise<Transaction[]>;
  createTransaction(input: NewTransaction): Promise<Transaction>;
  // Marketing
  getMarketingKpis(): Promise<MarketingKpis>;
  listChannels(): Promise<ChannelPerformance[]>;
  getFunnel(): Promise<FunnelStage[]>;
  getLeadsTrend(): Promise<TrendPoint[]>;
}
```

## Seleção da fonte (env)

`createDataSource()` em `index.ts` lê as variáveis (ver `.env.example`):

| `VITE_DATA_SOURCE` | Comportamento |
|---|---|
| ausente ou `mock` | `MockDataSource` (padrão) |
| `rest` | `RestDataSource(VITE_API_URL)` — erro se `VITE_API_URL` faltar |

`VITE_MOCK_LATENCY` (ms) adiciona latência artificial ao mock para exercitar os
estados de carregamento.

```env
# produção / integração com back-end
VITE_DATA_SOURCE=rest
VITE_API_URL=https://sua-api
```

Ligar o back-end **não muda nenhuma linha do app** — só o `.env`.

## MockDataSource

- Semeado a partir de [`../src/data/`](../src/data/) (`USERS`, `INITIAL_TASKS`,
  `TRANSACTIONS`, `FINANCE_KPIS`, `REVENUE_SERIES`, `MARKETING_KPIS`, `CHANNELS`,
  `FUNNEL`, `LEADS_TREND`).
- Mantém estado mutável em memória: tarefas/contas/lançamentos criados
  **persistem durante a sessão** do navegador (somem ao recarregar a página).
- `respond()` devolve uma cópia (`structuredClone`) para evitar mutação
  acidental dos seeds, opcionalmente com latência.
- Gera `id` (`t-...`, `f-...`, `u-...`), `createdAt`/`date` e `initials`.

## RestDataSource

- Usa `fetch` nativo (sem dependências). `credentials: "include"` para enviar
  cookies de sessão/autenticação.
- `request()` lança erro em resposta não-OK (status + corpo) e trata `204`.
- Base URL normalizada (remove barra final).

### Endpoints esperados pelo back-end

| Método `DataSource` | HTTP | Rota | Retorno |
|---|---|---|---|
| `listUsers` | GET | `/api/users` | `User[]` |
| `createUser` | POST | `/api/users` | `User` |
| `listTasks` | GET | `/api/tasks` | `Task[]` |
| `createTasks` | POST | `/api/tasks` | `Task[]` (body: `NewTask[]`) |
| `updateTaskStatus` | PATCH | `/api/tasks/:id/status` | `Task` (body: `{ status }`) |
| `getFinanceKpis` | GET | `/api/finance/kpis` | `FinanceKpis` |
| `getRevenueSeries` | GET | `/api/finance/revenue-series` | `MonthlyPoint[]` |
| `listTransactions` | GET | `/api/finance/transactions` | `Transaction[]` |
| `createTransaction` | POST | `/api/finance/transactions` | `Transaction` |
| `getMarketingKpis` | GET | `/api/marketing/kpis` | `MarketingKpis` |
| `listChannels` | GET | `/api/marketing/channels` | `ChannelPerformance[]` |
| `getFunnel` | GET | `/api/marketing/funnel` | `FunnelStage[]` |
| `getLeadsTrend` | GET | `/api/marketing/leads-trend` | `TrendPoint[]` |

Todas as respostas em **camelCase** (ver [MODELO-DE-DADOS.md](MODELO-DE-DADOS.md)).
Qualquer banco serve, desde que a API respeite esse contrato.

> **Segurança:** os endpoints de escrita DEVEM revalidar as
> [permissões](PERMISSOES.md) no servidor. O front só reflete o permitido.

## Como adicionar um novo acesso a dados

1. Adicione o método em `DataSource` (`datasource.ts`).
2. Implemente nos **dois** adaptadores: `mock.ts` (sobre o estado em memória) e
   `rest.ts` (nova rota HTTP).
3. Se precisar de um tipo novo de payload/retorno, declare em `src/lib/types.ts`.
4. Consuma no app via `data.*` (leitura com `useAsync`, escrita otimista).
5. `npm run typecheck`.

## O hook `useAsync`

[`../src/lib/useAsync.ts`](../src/lib/useAsync.ts) — executa uma função async e
expõe `{ data, loading, error, setData, reload }`. Cancela atualizações se o
componente desmontar antes de resolver. Padrão nas páginas:

```tsx
const { data: loaded, loading, error, setData, reload } =
  useAsync(() => data.listTasks(), []);
```

Escrita otimista:

```tsx
async function moveTask(id, status) {
  setData(prev => (prev ?? []).map(t => t.id === id ? { ...t, status } : t));
  try { await data.updateTaskStatus(id, status); } catch { reload(); }
}
```
