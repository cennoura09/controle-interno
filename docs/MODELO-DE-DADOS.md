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

## Glossário de domínio

| Termo | Significado |
|---|---|
| **So Sales** | A empresa dona do painel (marca exibida na sidebar e no modal de equipe). |
| **Setor** | Área da empresa: Marketing, Comercial, Financeiro, Operacional ou Executivo. |
| **Executivo** | Setor que agrupa CEO e Founder (acesso global, cross-setor). |
| **Cargo (Role)** | Papel do usuário. Define permissões, não é o mesmo que `title`. |
| **Diretor / C-level** | CMO, CCO, CFO, COO — cada um dirige um setor. |
| **Colaborador** | Funcionário comum de um setor (sem poderes de atribuição/criação). |
| **`title`** | Descrição livre do cargo exibida na UI (ex.: "Analista de Tráfego"); **não** afeta permissões. |
| **Escopo de atribuição** | Conjunto de pessoas a quem um usuário pode atribuir tarefas (ver [PERMISSOES.md](PERMISSOES.md)). |
| **Responsável / `assigneeId`** | Quem executa a tarefa. |
| **Criador / `createdById`** | Quem atribuiu a tarefa. |
| **Gateway** | Origem de transação sincronizada por integração de pagamento (vs. `manual`). |
| **ROAS / CPL / CAC / MRR** | Métricas de marketing/financeiro (retorno sobre ads, custo por lead, custo de aquisição, receita recorrente mensal). |
| **Role Switcher** | Seletor que simula "quem sou eu" para testar permissões sem login. |
