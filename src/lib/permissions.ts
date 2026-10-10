// ============================================================================
// Regras de permissão — PEÇA CENTRAL do MVP
// ----------------------------------------------------------------------------
// Resumo das regras pedidas:
//  - Colaborador comum: só cria tarefa para si mesmo.
//  - Diretor (CMO/CCO/CFO/COO): cria para si + membros do SEU setor.
//  - CEO / Founder: cria para qualquer pessoa / qualquer setor.
//
// A UI (modal "Nova Tarefa", filtros do Kanban) consome estas funções.
// Mesmas regras devem ser reimplementadas/validadas no back-end por segurança
// — o front-end apenas reflete o que é permitido.
// ============================================================================

import type { Role, Sector, User } from "./types";

const DIRECTOR_ROLES: Role[] = ["CMO", "CCO", "CFO", "COO"];
const GLOBAL_ROLES: Role[] = ["CEO", "Founder"];

/** Mapa cargo de diretor -> setor que ele dirige. */
const DIRECTOR_SECTOR: Partial<Record<Role, Sector>> = {
  CMO: "Marketing",
  CCO: "Comercial",
  CFO: "Financeiro",
  COO: "Operacional",
};

export function isGlobalRole(role: Role): boolean {
  return GLOBAL_ROLES.includes(role);
}

export function isDirector(role: Role): boolean {
  return DIRECTOR_ROLES.includes(role);
}

/** Setor que um diretor comanda (undefined se não for diretor de setor). */
export function directedSector(user: User): Sector | undefined {
  return DIRECTOR_SECTOR[user.role];
}

/** Rótulo amigável do escopo de atribuição do usuário. */
export function assignmentScopeLabel(user: User): string {
  if (isGlobalRole(user.role)) return "Todos os setores e pessoas";
  if (isDirector(user.role)) return `Setor ${directedSector(user)} + você`;
  return "Apenas você mesmo";
}

/**
 * Lista de usuários para quem `currentUser` PODE atribuir uma tarefa.
 * É exatamente o que popula o select "Atribuir para" no modal.
 */
export function getAssignableTargets(currentUser: User, allUsers: User[]): User[] {
  if (isGlobalRole(currentUser.role)) {
    return allUsers;
  }

  if (isDirector(currentUser.role)) {
    const sector = directedSector(currentUser);
    const sectorMembers = allUsers.filter((u) => u.sector === sector);
    // Garante o próprio usuário na lista (mesmo que o setor mude no futuro).
    return dedupeById([currentUser, ...sectorMembers]);
  }

  // Colaborador comum: somente ele mesmo.
  return [currentUser];
}

/** Checagem direta: currentUser pode atribuir uma tarefa a targetUser? */
export function canAssignTo(currentUser: User, targetUser: User): boolean {
  return getAssignableTargets(currentUser, [targetUser]).some(
    (u) => u.id === targetUser.id
  ) || (isGlobalRole(currentUser.role));
}

/** currentUser pode criar tarefa para um setor inteiro (visão de diretor/CEO)? */
export function canManageSector(currentUser: User, sector: Sector): boolean {
  if (isGlobalRole(currentUser.role)) return true;
  if (isDirector(currentUser.role)) return directedSector(currentUser) === sector;
  return false;
}

function dedupeById(users: User[]): User[] {
  const seen = new Set<string>();
  const out: User[] = [];
  for (const u of users) {
    if (!seen.has(u.id)) {
      seen.add(u.id);
      out.push(u);
    }
  }
  return out;
}
