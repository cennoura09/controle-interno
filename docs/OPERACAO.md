# Operação e ferramentas

Como construir, verificar, publicar e evoluir o projeto. Complementa
[CONVENCOES.md](CONVENCOES.md) (estilo de código) com o lado de **tooling e
infraestrutura**.

> Estado atual: **não** há testes, linter, formatador nem CI configurados. As
> seções abaixo marcam claramente o que **existe** e o que é **recomendação a
> implementar**. Não assuma que ferramentas não listadas aqui estão presentes.

## Toolchain (o que existe)

| Etapa | Ferramenta | Config |
|---|---|---|
| Dev server / bundler | Vite 5 | [`../vite.config.ts`](../vite.config.ts) (`base: "./"`, porta 5173, `host: true`) |
| Transpile/JSX | `@vitejs/plugin-react` | idem |
| CSS | Tailwind 3 → PostCSS → Autoprefixer | [`../postcss.config.js`](../postcss.config.js), [`../tailwind.config.js`](../tailwind.config.js) |
| Tipos | TypeScript 5.6 (`tsc --noEmit`) | [`../tsconfig.json`](../tsconfig.json) |

### HTML raiz e fontes

[`../index.html`](../index.html) é o template do Vite:

- `lang="pt-BR"`, `<title>Controle Interno — Operação</title>`, `#root` e o
  entry `type="module" src="/src/main.tsx"`.
- As **fontes são carregadas aqui**, via Google Fonts: Space Grotesk e
  JetBrains Mono (pesos 400–700), com `preconnect`. Para trocar/adicionar uma
  fonte: edite o `<link>` do `index.html` **e** o `fontFamily` em
  `tailwind.config.js` (os dois juntos). Carregar a fonte só num dos lugares
  resulta em fallback silencioso.
- O CSS base e os utilitários (`.card`, `.mono-label`, `.focus-ring`) ficam em
  [`../src/index.css`](../src/index.css).

## Comandos

```bash
npm install          # (ou npm ci em ambiente limpo/CI) instala dependências
npm run dev          # dev server com HMR → http://localhost:5173
npm run typecheck    # tsc --noEmit (checagem de tipos)
npm run build        # typecheck + vite build → dist/
npm run preview      # serve o dist/ localmente
```

Node **>= 18** (`.nvmrc`: 20). Sem variáveis de ambiente, o app roda com dados
mock — nenhum segredo é necessário para `dev`/`build`.

## Verificação (o que existe)

Hoje a "suíte" de verificação é:

```bash
npm run typecheck && npm run build
```

Ambos **devem passar** antes de concluir qualquer mudança. O TypeScript estrito
(`noUnusedLocals`/`noUnusedParameters`) já captura muita coisa.

## Testes (não existem — recomendação)

Não há framework de testes. Para adicionar (sugestão alinhada ao Vite):

```bash
npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- `vitest` com `environment: "jsdom"`.
- Alvos de maior retorno, por serem lógica pura:
  - [`../src/lib/permissions.ts`](../src/lib/permissions.ts) — matriz de cargos.
  - [`../src/services/mock.ts`](../src/services/mock.ts) — criação/mutação.
  - [`../src/lib/format.ts`](../src/lib/format.ts) — formatação pt-BR.
- Convenção sugerida: `*.test.ts(x)` ao lado do arquivo. Script:
  `"test": "vitest"`.

Exemplo mínimo (permissões):

```ts
import { getAssignableTargets } from "../lib/permissions";
import { USERS } from "../data/users";

test("colaborador só atribui para si mesmo", () => {
  const colab = USERS.find((u) => u.role === "Colaborador")!;
  const alvos = getAssignableTargets(colab, USERS);
  expect(alvos).toEqual([colab]);
});
```

## Lint e formatação (não existem — recomendação)

Sem ESLint/Prettier: as [convenções](CONVENCOES.md) são seguidas manualmente.
Para passar a impor:

```bash
npm i -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin \
         eslint-plugin-react-hooks eslint-plugin-react-refresh prettier
```

Regras-chave a ligar: `react-hooks/rules-of-hooks`,
`react-hooks/exhaustive-deps`, `@typescript-eslint/no-unused-vars` (já coberto
pelo `tsc`). Scripts sugeridos: `"lint": "eslint src"`,
`"format": "prettier --write ."`.

## CI (não existe — recomendação)

Sem `.github/workflows`. Workflow mínimo sugerido (checagem em cada PR):

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build   # já roda o typecheck
```

## Plataforma Codex (ambiente do agente)

O Codex lê [`../AGENTS.md`](../AGENTS.md) na raiz. Para o ambiente dele:

- **Setup**: `npm ci` (ou `npm install`). Não há passo de build de dependência
  nativa; nada além do npm é necessário.
- **Verificação**: `npm run typecheck` e `npm run build`.
- **Sem segredos**: o padrão é `VITE_DATA_SOURCE=mock`, então o app compila e
  roda sem back-end nem variáveis. Para exercitar o caminho `rest`, defina
  `VITE_API_URL` apontando para um mock/stub de API.
- Node 20 (ver `.nvmrc`).

## Deploy / hospedagem

O build é **estático** (`dist/`) e feito para rodar em qualquer host:

- `base: "./"` (caminhos relativos) → funciona em subpastas e em qualquer domínio.
- `HashRouter` (rotas com `#/…`) → **não exige regras de rewrite/SPA** no servidor.

Passos genéricos (Vercel, Netlify, GitHub Pages, S3+CDN, etc.):

1. Build command: `npm run build`.
2. Output directory: `dist`.
3. (Opcional) variáveis `VITE_DATA_SOURCE`/`VITE_API_URL` no painel do host para
   apontar ao back-end.

> O conector da Vercel no claude.ai existe, mas precisa ser **autorizado** nas
> configurações de conectores para ser usado a partir daqui.

## Produção (Vercel + Supabase)

Em produção o app roda com `VITE_DATA_SOURCE=supabase`:

```
Navegador ──login──▶ Supabase Auth
    │
    └─ { fn, args } + token ──▶ Edge Function `controle-interno`
                                  (supabase/functions/controle-interno)
                                     │ valida o token, abre transação como
                                     │ `authenticated` com auth.uid() = usuário
                                     ▼
                              public.ci_*  (SECURITY DEFINER)
                              revalidam as permissões e leem/escrevem
                              no schema `controle_interno`
```

- **Banco:** schema `controle_interno` (tabelas com RLS ligado e sem acesso
  direto pelos papéis `anon`/`authenticated`). Scripts em
  [`db/supabase/001_schema.sql`](../db/supabase/001_schema.sql) (schema, regras
  e API) e [`db/supabase/002_seed.sql`](../db/supabase/002_seed.sql) (dados).
- **Edge Function:** publicada com `verify_jwt = false` porque valida o token
  ela mesma (chama `/auth/v1/user`). Usa `SUPABASE_DB_URL`, já disponível no
  ambiente das Edge Functions. Não depende da Data API (PostgREST) do projeto.
- **Vercel:** projeto `controle-interno-sosales`, framework Vite. Variáveis
  `VITE_DATA_SOURCE=supabase`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
  (chave pública) em Production e Preview.

### Admin supremo

Membro com `is_super_admin = true` (cargo Founder). Além do acesso global de
CEO/Founder, ele:

- cria/redefine logins (e-mail + senha) de qualquer membro;
- ativa/desativa contas (contas inativas não entram nem recebem tarefas);
- usa **"Visualizar como"** (menu do usuário) para conferir a visão de cada cargo.

A senha nunca vai para o git. Para criar outro admin supremo, rode no SQL do
Supabase (troque e-mail, nome e senha):

```sql
insert into controle_interno.app_users
  (name, role, sector, title, initials, email, auth_user_id, is_super_admin)
values ('Nome', 'Founder', 'Executivo', 'Admin Supremo', 'NM', 'email@empresa.com',
        controle_interno.create_auth_user('email@empresa.com', '<senha>'), true);
```

### Link mágico

O botão "Entrar por link mágico" usa `signInWithOtp` (sem criar contas novas).
Para o link voltar ao app, adicione a URL da Vercel em **Supabase → Authentication
→ URL Configuration → Redirect URLs**.
