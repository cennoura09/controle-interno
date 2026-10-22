# Arquitetura

## Stack

| Camada | Tecnologia |
|---|---|
| UI | React 18 + TypeScript 5.6 |
| Build/dev | Vite 5 (`@vitejs/plugin-react`) |
| Estilo | Tailwind CSS 3 (tokens em `tailwind.config.js`) |
| Rotas | react-router-dom 6 (`HashRouter`) |
| Gráficos | recharts 2 |
| Ícones | lucide-react |
| Fontes | Space Grotesk (display) + JetBrains Mono (números/labels) |

Sem back-end neste repositório: os dados vêm da **camada de serviços**
(`src/services`), que por padrão usa um mock em memória.

## Boot do aplicativo

`src/main.tsx` monta a árvore:

```
ReactDOM.createRoot(#root)
  └─ <React.StrictMode>
       └─ <HashRouter>                    rotas via hash (#/tarefas) — serve em qualquer host estático
            └─ <SessionProvider>          carrega usuários e expõe o "usuário atual"
                 └─ <App>                 define as rotas
                      └─ <AppShell>       layout (sidebar + topbar + conteúdo)
                           └─ <Página>
```

`HashRouter` é intencional: o `vite.config.ts` usa `base: "./"`, então o build
funciona em qualquer caminho/host estático sem configuração de servidor.

## Roteamento

Definido em `src/App.tsx`:

| Rota | Página |
|---|---|
| `/` | redireciona para `/tarefas` |
| `/tarefas` | `TarefasPage` |
| `/financeiro` | `FinanceiroPage` |
| `/marketing` | `MarketingPage` |
| `*` | redireciona para `/tarefas` |

A navegação fica na `Sidebar` (desktop) e numa barra inferior no `AppShell`
(mobile).

## Sessão e "usuário atual"

Não há autenticação no MVP. O `SessionContext` (`src/context/SessionContext.tsx`)
carrega a lista de usuários via `data.listUsers()` e mantém um
`currentUserId` — trocável pelo **Role Switcher** no topo direito. Isso permite
demonstrar as [permissões](PERMISSOES.md) ao vivo, assumindo cargos diferentes.

- Enquanto os usuários carregam, o provider mostra um loader de tela cheia.
- Em erro, mostra `LoadError` com botão de tentar novamente.
- `createUser(input)` cria uma conta pela camada de serviços e a adiciona ao estado.

> TODO(backend): derivar `currentUser` da sessão autenticada real, não do switcher.

## Fluxo de dados

```
Componente/página
   │  (lê)                         (escreve)
   ▼                                   ▼
useAsync(() => data.listX())      data.createX(input)
   │                                   │
   ▼                                   ▼
          import { data } from "src/services"
                      │
            DataSource (interface)
             /                 \
   MockDataSource          RestDataSource
   (memória)               (fetch → API → banco)
```

Regras:

- **Leitura**: páginas usam o hook `useAsync` (`src/lib/useAsync.ts`) + os
  componentes `Loading`/`LoadError` (`src/components/ui/Loading.tsx`).
- **Escrita**: chamam `data.*` e atualizam o estado local de forma **otimista**
  (ex.: mover card no Kanban aplica na UI e persiste; se falhar, recarrega).
- O app importa **somente** `data` de `src/services`. Nenhum componente deve
  importar os mocks de `src/data/*` diretamente (ver exceção conhecida abaixo).

Detalhes da camada: [CAMADA-DE-DADOS.md](CAMADA-DE-DADOS.md).

## Estado

Todo o estado é **local** (hooks `useState`/`useEffect`) ou de **contexto**
(`SessionContext`). Não há Redux/Zustand/React Query. O `useAsync` cobre o
ciclo carregando/erro/dados e expõe `setData` (updates otimistas) e `reload`.

## Estilo e tema

Tailwind com tokens customizados (cores, fontes, radius, sombras) em
`tailwind.config.js`; utilitários de componente (`.card`, `.mono-label`,
`.mono-num`, `.focus-ring`) em `src/index.css`. O tema é **dark fixo**
(`color-scheme: dark`, acento laranja `#FF5C00`). Catálogo completo em
[COMPONENTES.md](COMPONENTES.md).

## Build e execução

```bash
npm run dev          # Vite dev server (HMR) em http://localhost:5173
npm run typecheck    # tsc --noEmit
npm run build        # tsc --noEmit && vite build  → dist/
npm run preview      # serve o dist/
```

- `dist/` é artefato de build e está no `.gitignore`.
- Variáveis de ambiente: prefixo `VITE_` (expostas ao cliente). Ver
  `.env.example`. Tipadas em `src/vite-env.d.ts`.
- O build hoje gera um bundle único > 500 kB (recharts + react). É só um aviso;
  se virar problema, considerar code-splitting por rota via `React.lazy`.

## Exceção conhecida (gotcha para o Codex)

`src/components/tarefas/TaskCard.tsx` ainda importa `getUser` de
`src/data/users.ts` (seed estático) para resolver o nome do responsável/criador.
Isso **fura a camada de dados**: usuários criados em runtime ou vindos da API
(`rest`) não serão encontrados por esse helper. Correção recomendada: resolver
responsável/criador a partir de `useSession().users` (ou receber os nomes já
resolvidos via props) em vez de `getUser`.
