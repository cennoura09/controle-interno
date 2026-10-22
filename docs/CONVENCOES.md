# Convenções

## Linguagem

UI, textos, labels, mensagens de erro e comentários em **português do Brasil**.
Nomes de tipos/funções em inglês quando já consagrados no domínio técnico
(`DataSource`, `listTasks`), mas termos de negócio em pt-BR (`setor`, `tarefa`,
`faturamento`).

## TypeScript

Config em [`../tsconfig.json`](../tsconfig.json) — **estrito**:

- `strict: true`
- `noUnusedLocals` / `noUnusedParameters` — nada de variável/import sem uso
  (quebra o `typecheck`).
- `noFallthroughCasesInSwitch`.
- `moduleResolution: bundler`, `isolatedModules`, `verbatim` não ligado — ainda
  assim, **use `import type { ... }`** para imports só de tipo.

Rode `npm run typecheck` antes de concluir qualquer mudança.

## Organização

- Tipos de domínio em `src/lib/types.ts` (fonte única do contrato).
- Regras de permissão **somente** em `src/lib/permissions.ts`.
- Acesso a dados **somente** via `data` de `src/services` (ver
  [CAMADA-DE-DADOS.md](CAMADA-DE-DADOS.md)); não importe `src/data/*` em
  componentes.
- Componentes de UI reutilizáveis em `src/components/ui`; específicos de domínio
  em `src/components/<domínio>`.
- Um componente por arquivo exportado nomeadamente (sem `export default`, exceto
  `App`).

## Estilo visual

- Apenas tokens do Tailwind (ver [COMPONENTES.md](COMPONENTES.md)); nunca cores
  hex soltas em `className` (exceção: cores passadas a libs de gráfico como
  recharts/Sparkline).
- Classes condicionais via `cn()`.
- Datas em ISO `YYYY-MM-DD`; exibição via helpers de `src/lib/format.ts`.

## Dados assíncronos

- Leitura: `useAsync` + `Loading`/`LoadError`.
- Escrita: chama `data.*`, atualiza estado local de forma otimista; em falha,
  `reload()`.
- Formulários que escrevem usam um estado `submitting` e desabilitam o botão
  enquanto a Promise não resolve.

## Dependências

- Antes de adicionar uma lib, verifique se dá para resolver com o que já existe
  (ex.: `Sparkline` é SVG próprio; `cn` substitui `clsx`). O `RestDataSource`
  usa `fetch` nativo de propósito.
- Fixe versões exatas (como as já presentes em `package.json`).
- Node **>= 18** (`.nvmrc`: 20).

## Git

- Mensagens de commit em pt-BR, no estilo convencional:
  `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.
- `dist/`, `node_modules/` e `.env*` (exceto `.env.example`) estão no
  `.gitignore` — não comitar.

## Checklist de PR / conclusão

1. `npm run typecheck` sem erros.
2. `npm run build` passa.
3. Novo acesso a dados existe nos **dois** adaptadores (`mock` + `rest`).
4. Nenhuma regra de permissão fora de `src/lib/permissions.ts`.
5. Textos em pt-BR; UI usa tokens de design.
6. Documentação em `docs/` atualizada se o contrato/arquitetura mudou.
