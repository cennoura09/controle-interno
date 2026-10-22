# Documentação — Controle Interno (So Sales)

Documentação técnica do projeto, voltada a agentes de código (Codex) e
desenvolvedores. Para o guia operacional curto, veja [`../AGENTS.md`](../AGENTS.md).

## Índice

| Doc | Conteúdo |
|---|---|
| [ARQUITETURA.md](ARQUITETURA.md) | Visão geral, stack, boot, roteamento, fluxo de dados, build |
| [MODELO-DE-DADOS.md](MODELO-DE-DADOS.md) | Referência dos tipos de `src/lib/types.ts` (o contrato) |
| [CAMADA-DE-DADOS.md](CAMADA-DE-DADOS.md) | `DataSource`, adaptadores mock/rest, endpoints, como estender |
| [BANCO-DE-DADOS.md](BANCO-DE-DADOS.md) | Schema PostgreSQL/Supabase, tabelas, relacionamentos, RLS, seed |
| [PERMISSOES.md](PERMISSOES.md) | Regras de acesso centralizadas (`src/lib/permissions.ts`) |
| [COMPONENTES.md](COMPONENTES.md) | Catálogo de componentes de UI e tokens de design |
| [CONVENCOES.md](CONVENCOES.md) | TypeScript estrito, estilo, i18n, git, checklist |

## Resumo em uma frase

Front-end React + TypeScript (Vite + Tailwind) de um painel interno de
**Tarefas**, **Financeiro** e **Marketing**, com uma **camada de dados**
plugável (mock em memória hoje; API REST sobre PostgreSQL/Supabase amanhã) e
**permissões por cargo** centralizadas.

## Mapa rápido do código

```
src/
  main.tsx            # entrypoint (React root, HashRouter, SessionProvider)
  App.tsx             # rotas
  lib/                # types, permissions, format, cn, useAsync
  services/           # DataSource + adaptadores (mock, rest) + seletor
  context/            # SessionContext
  data/               # seeds tipados do mock
  components/         # layout/, ui/, tarefas/, equipe/
  pages/              # TarefasPage, FinanceiroPage, MarketingPage
db/                   # schema.sql + seed.sql
docs/                 # esta documentação
```
