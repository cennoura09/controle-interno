# Contrato da API (para o back-end)

Especifica o que o `RestDataSource` ([`../src/services/rest.ts`](../src/services/rest.ts))
espera da API, além das rotas já listadas em
[CAMADA-DE-DADOS.md](CAMADA-DE-DADOS.md): **formato de erros** e **autenticação**.

## Convenções gerais

- `Content-Type: application/json` em requisições e respostas.
- Corpos e respostas em **camelCase** (ver [MODELO-DE-DADOS.md](MODELO-DE-DADOS.md)).
- Cada requisição envia cookies (`credentials: "include"`): a sessão é por cookie.
- Respostas de sucesso: `2xx` com o JSON do tipo esperado; `204 No Content` é
  tratado como `undefined` pelo cliente.

## Formato de erro

Hoje o cliente apenas detecta `!res.ok` e lança um `Error` com
`status + corpo` (texto). Para mensagens úteis na UI, o back-end deve devolver
um corpo JSON consistente:

```jsonc
// resposta de erro (qualquer status >= 400)
{
  "error": {
    "code": "permission_denied",      // slug estável, legível por máquina
    "message": "Você não pode atribuir tarefas a outro setor.", // pt-BR, p/ UI
    "details": { }                     // opcional (ex.: erros por campo)
  }
}
```

### Códigos HTTP esperados

| Status | Quando |
|---|---|
| `400` / `422` | payload inválido (campos faltando, tipo errado) — use `details` por campo |
| `401` | não autenticado (sem sessão / expirada) → front deve levar ao login |
| `403` | autenticado, mas **sem permissão** (regra de negócio negou) |
| `404` | recurso inexistente (ex.: `PATCH /api/tasks/:id/status` com id inválido) |
| `409` | conflito (ex.: duplicidade) |
| `500` | erro interno |

> Sugestão de evolução do cliente: `RestDataSource.request()` pode fazer
> `parse` do `error.code`/`error.message` e expor um erro tipado, para a UI
> diferenciar 403 (permissão) de 500 (falha) — hoje ela só mostra a mensagem
> crua via `LoadError`.

## Autenticação (fluxo a implementar)

No MVP não há login: o "usuário atual" vem do **Role Switcher**
([`../src/components/layout/RoleSwitcher.tsx`](../src/components/layout/RoleSwitcher.tsx))
e o `SessionContext` carrega **todos** os usuários. No produto real:

1. **Login** (fora do escopo deste front hoje): o back-end autentica e grava um
   **cookie de sessão** (`HttpOnly`, `Secure`, `SameSite`).
2. Novo endpoint **`GET /api/me` → `User`**: devolve o usuário autenticado.
3. [`SessionContext`](../src/context/SessionContext.tsx) passa a derivar o
   `currentUser` de `GET /api/me` (em vez do switcher); `setCurrentUserId`/Role
   Switcher viram recurso só de admin/demonstração ou são removidos.
4. `listUsers()` passa a servir apenas para telas de equipe/atribuição, sujeito
   a permissão.
5. Em respostas `401`, o front redireciona para o login.

O cliente já envia cookies (`credentials: "include"`), então nenhuma mudança de
transporte é necessária — só os endpoints e o ajuste do `SessionContext`.

## Segurança: revalidar permissões no servidor

Regra inegociável: **toda escrita revalida a permissão no servidor**, mesmo que
a UI já a respeite. Mapeie para `403` + `error.code = "permission_denied"`:

| Endpoint | Regra (ver [PERMISSOES.md](PERMISSOES.md)) |
|---|---|
| `POST /api/tasks` | `createById` só pode atribuir dentro do seu escopo (`getAssignableTargets`) |
| `PATCH /api/tasks/:id/status` | usuário pode mover a tarefa (ex.: responsável/criador/gestor do setor) |
| `POST /api/finance/transactions` | `canRegisterFinance` (Financeiro ou global) |
| `POST /api/users` | `canCreateAccounts` + `creatableRoles`/`creatableSectors` |

A lógica de referência está em
[`../src/lib/permissions.ts`](../src/lib/permissions.ts) e pode ser reproduzida
no servidor (ou como políticas RLS — ver [BANCO-DE-DADOS.md](BANCO-DE-DADOS.md)).
