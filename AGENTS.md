# AGENTS.md — Controle Interno (So Sales)

Guia para agentes de código (Codex e afins) trabalharem neste repositório.

## O que é

Painel interno de **Tarefas**, **Financeiro** e **Marketing**. Hoje é o
**front-end** do MVP (React + TypeScript + Vite + Tailwind). Os dados passam por
uma **camada de serviços** (`src/services`) que, por padrão, usa um mock em
memória — e troca para a API real só por variável de ambiente, sem mudar o app.

A UI é em **português do Brasil**. Mantenha textos, labels e mensagens em pt-BR.

## Documentação detalhada

Começe por [`docs/README.md`](docs/README.md) (índice). Atalhos:

- Arquitetura e fluxo de dados → [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md)
- Contrato de tipos → [`docs/MODELO-DE-DADOS.md`](docs/MODELO-DE-DADOS.md)
- Camada de dados / API → [`docs/CAMADA-DE-DADOS.md`](docs/CAMADA-DE-DADOS.md)
- Banco de dados → [`docs/BANCO-DE-DADOS.md`](docs/BANCO-DE-DADOS.md)
- Permissões → [`docs/PERMISSOES.md`](docs/PERMISSOES.md)
- Componentes e design → [`docs/COMPONENTES.md`](docs/COMPONENTES.md)
- Convenções → [`docs/CONVENCOES.md`](docs/CONVENCOES.md)

## Comandos

```bash
npm install          # instala dependências
npm run dev          # servidor de desenvolvimento (http://localhost:5173)
npm run typecheck    # checagem de tipos (tsc --noEmit) — rode antes de concluir
npm run build        # typecheck + build de produção (saída em dist/)
npm run preview      # serve o build de produção
```

Node **>= 18** (ver `.nvmrc`: 20). Sempre rode `npm run typecheck` antes de
finalizar uma mudança — o projeto usa TypeScript estrito
(`strict`, `noUnusedLocals`, `noUnusedParameters`).

## Estrutura

```
src/
  lib/          types.ts (contrato de dados), permissions.ts (REGRAS centrais),
                format.ts (pt-BR), cn.ts, useAsync.ts
  services/     camada de acesso a dados — ver seção abaixo
  context/      SessionContext (usuário atual + troca de cargo)
  data/         seeds tipados (users, tasks, finance, marketing) p/ o mock
  components/   layout/ (AppShell, Sidebar, Topbar, RoleSwitcher),
                ui/ (Card, StatCard, Badge, Button, Modal, Loading, ...),
                tarefas/, equipe/
  pages/        TarefasPage, FinanceiroPage, MarketingPage
db/             schema.sql + seed.sql (PostgreSQL/Supabase)
```

## Camada de dados (como ligar o banco)

Todo acesso a dados passa pela interface `DataSource`
(`src/services/datasource.ts`). O app importa **apenas** `data` de
`src/services` — nunca os mocks diretamente.

- `src/services/mock.ts` — `MockDataSource`, em memória (padrão em dev).
- `src/services/rest.ts` — `RestDataSource`, chama a API via `fetch`.
- `src/services/index.ts` — escolhe a implementação por env.

Para usar o back-end real:

```env
VITE_DATA_SOURCE=rest
VITE_API_URL=https://sua-api
```

Os endpoints esperados estão em `src/services/rest.ts` e o modelo de tabelas em
`db/schema.sql` (com `db/seed.sql` espelhando os dados de exemplo). Qualquer
banco serve desde que a API devolva os tipos de `src/lib/types.ts` em camelCase.

Ao criar um endpoint novo: adicione o método em `DataSource`, implemente nos
**dois** adaptadores (mock e rest) e só então consuma no app.

## Permissões (importante)

As regras de quem pode atribuir tarefas, lançar no financeiro e criar contas
ficam **centralizadas** em `src/lib/permissions.ts`. O front apenas reflete o
que é permitido — **toda escrita deve ser revalidada no servidor**
(`createTasks`, `updateTaskStatus`, `createTransaction`, `createUser`). Não
duplique regra de permissão espalhada pelos componentes; use as funções desse
arquivo.

## Convenções

- TypeScript estrito; sem variáveis/parâmetros não usados.
- Estilo visual via tokens do Tailwind (`tailwind.config.js`) — use as classes
  de tema (`bg`, `surface`, `accent`, `content`, `muted`, `border`, ...) em vez
  de cores fixas.
- Leituras de dados nas páginas usam o hook `useAsync` + os componentes
  `Loading`/`LoadError` (`src/components/ui/Loading.tsx`).
- Escritas (criar/mover) chamam `data.*` e atualizam o estado local de forma
  otimista.
- Datas em ISO (`YYYY-MM-DD`); formatação pt-BR em `src/lib/format.ts`.

## Checklist antes de concluir

1. `npm run typecheck` sem erros.
2. `npm run build` passa.
3. Novos acessos a dados foram adicionados ao `DataSource` e aos dois adaptadores.
4. Textos em pt-BR; nenhuma regra de permissão nova fora de `permissions.ts`.
