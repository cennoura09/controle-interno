# Permissões

Peça central do projeto. Toda a lógica está em
[`../src/lib/permissions.ts`](../src/lib/permissions.ts). **Não** espalhe regras
de permissão pelos componentes — use as funções deste arquivo.

> O front apenas reflete o que é permitido. **Toda escrita deve ser revalidada
> no servidor** (ver [BANCO-DE-DADOS.md](BANCO-DE-DADOS.md) › RLS).

## Classes de cargo

```ts
GLOBAL_ROLES   = ["CEO", "Founder"]              // acesso total
DIRECTOR_ROLES = ["CMO", "CCO", "CFO", "COO"]    // C-level de um setor
// demais: Colaborador

DIRECTOR_SECTOR = { CMO:Marketing, CCO:Comercial, CFO:Financeiro, COO:Operacional }
```

Helpers: `isGlobalRole(role)`, `isDirector(role)`, `directedSector(user)`.

## Atribuição de tarefas

| Cargo | Pode atribuir tarefa para |
|---|---|
| CEO / Founder | Todos os setores e pessoas |
| Diretor (CMO/CCO/CFO/COO) | Si mesmo + membros do **seu** setor |
| Colaborador | Apenas si mesmo |

- `getAssignableTargets(currentUser, allUsers): User[]` — popula o seletor
  "Atribuir para" no `NovaTarefaModal`.
- `canAssignTo(currentUser, targetUser): boolean` — checagem direta.
- `assignmentScopeLabel(user): string` — rótulo amigável do escopo.
- `canManageSector(currentUser, sector): boolean` — pode agir sobre um setor inteiro.

## Lançamento financeiro

```ts
canRegisterFinance(user) = isGlobalRole(user.role) || user.sector === "Financeiro"
```
Usado em `FinanceiroPage` para liberar/bloquear o botão "Adicionar manualmente".
Ou seja: **CFO, analistas do Financeiro e CEO/Founder**.

## Criação de contas

```ts
canCreateAccounts(user) = isGlobalRole(user.role) || isDirector(user.role)
```

- `creatableRoles(user)` — cargos que `user` pode criar:
  - Global: qualquer cargo.
  - Diretor: o próprio cargo (um par) ou `Colaborador`.
- `creatableSectors(user)` — setores em que pode criar colaboradores:
  - Global: todos os `OPERATIONAL_SECTORS` (Marketing, Comercial, Financeiro, Operacional).
  - Diretor: apenas o próprio setor.
- `sectorForRole(role)` — setor automático de um cargo (CEO/Founder→Executivo;
  diretores→seu setor; Colaborador→`undefined`, escolhido na UI).

Usado em `GerenciarEquipeModal`.

## Onde cada regra é aplicada na UI

| Função | Componente |
|---|---|
| `getAssignableTargets`, `assignmentScopeLabel`, `isGlobalRole` | `components/tarefas/NovaTarefaModal.tsx` |
| `isGlobalRole` (filtro de escopo "Todas") | `pages/TarefasPage.tsx` |
| `canRegisterFinance` | `pages/FinanceiroPage.tsx` |
| `canCreateAccounts`, `creatableRoles`, `creatableSectors`, `sectorForRole` | `components/equipe/GerenciarEquipeModal.tsx` |

## Como testar (sem login)

Use o **Role Switcher** (topo direito, `components/layout/RoleSwitcher.tsx`)
para assumir qualquer usuário e ver o escopo mudar ao vivo: o modal de nova
tarefa só lista destinatários permitidos, o botão de lançamento financeiro
some para quem não é do Financeiro, e "Criar conta" fica restrito a diretores/global.
