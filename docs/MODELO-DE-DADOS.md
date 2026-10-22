# Modelo de dados (o contrato)

Todos os tipos vivem em [`../src/lib/types.ts`](../src/lib/types.ts). Eles são o
**contrato** entre front e back: a API deve devolver exatamente estes formatos
(em camelCase). O mapeamento para as colunas do banco está em
[BANCO-DE-DADOS.md](BANCO-DE-DADOS.md).

## Enums (uniões de string)

```ts
Sector   = "Marketing" | "Comercial" | "Financeiro" | "Operacional" | "Executivo"
Role     = "Founder" | "CEO" | "CMO" | "CCO" | "CFO" | "COO" | "Colaborador"
TaskStatus   = "todo" | "doing" | "done"
TaskPriority = "baixa" | "media" | "alta" | "urgente"
TransactionType   = "receita" | "despesa"
TransactionSource = "gateway" | "manual"
ChannelKind       = "organico" | "pago"
```

- `Executivo` agrupa CEO/Founder (acesso global).
- Diretores são C-level de um setor: CMO→Marketing, CCO→Comercial,
  CFO→Financeiro, COO→Operacional.

## Entidades

### User
```ts
{ id, name, role: Role, sector: Sector, title, initials }
```
`title` é a descrição livre exibida (ex.: "Analista de Tráfego"); `initials`
alimenta o avatar.

### Task
```ts
{ id, title, description?, status: TaskStatus, priority: TaskPriority,
  sector: Sector, assigneeId, createdById, dueDate?, createdAt }
```
- `assigneeId` → responsável; `createdById` → quem atribuiu.
- `sector` segue o setor do responsável.
- `dueDate`/`createdAt` em ISO `YYYY-MM-DD`.

### Transaction
```ts
{ id, date, description, category, type: TransactionType,
  amount /* R$ */, source: TransactionSource }
```

### ChannelPerformance
```ts
{ id, channel, kind: ChannelKind, invested /* R$, 0 p/ orgânico */,
  leads, sales, revenue /* R$ */ }
```

### Pontos de séries
```ts
MonthlyPoint { month, receita, despesa }   // gráfico Receita × Despesa
FunnelStage  { stage, value }              // funil de conversão
TrendPoint   { day, value }                // tendência de leads (sparkline)
```

## Agregados (KPIs)

Calculáveis no servidor e devolvidos prontos:

```ts
FinanceKpis {
  faturamento, faturamentoDelta, despesas, despesasDelta,
  lucroLiquido, lucroDelta, ticketMedio, ticketDelta, mrr, inadimplencia
}
MarketingKpis {
  leads, leadsDelta, cpl, cplDelta, investimento, investimentoDelta,
  roas, roasDelta, vendas, vendasDelta, cac, cacDelta, conversao, conversaoDelta
}
```
Campos `*Delta` são frações (ex.: `0.142` = +14,2%); formatados por
`delta()` em [`../src/lib/format.ts`](../src/lib/format.ts).

## Payloads de criação (`New*`)

O que o **front envia**; `id`, datas e derivados são responsabilidade do
servidor (ou do mock):

```ts
NewUser        { name, role, sector, title?, initials? }
NewTask        { title, description?, priority, sector, assigneeId, createdById, dueDate? }
NewTransaction { date?, description, category, type, amount, source? }
```

- `NewTask` **não** inclui `status` (nasce `"todo"`), `id` nem `createdAt`.
- `NewTransaction.source` default `"manual"`; `date` default = hoje.
- `NewUser.initials` é derivada do nome quando ausente (`deriveInitials`).
