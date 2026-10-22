# Acessibilidade e feedback

Estado atual de acessibilidade (a11y) e de feedback ao usuário, com as
limitações conhecidas e o que melhorar. Honesto de propósito: serve para o
Codex não assumir garantias que o código ainda não dá.

## O que já existe

- **Foco visível**: utilitário `.focus-ring` (anel de foco acessível) aplicado
  em botões, links e campos. Use-o em qualquer elemento novo que receba foco.
- **Modal** ([`../src/components/ui/Modal.tsx`](../src/components/ui/Modal.tsx)):
  `role="dialog"`, `aria-modal="true"`, fecha com **Esc** e com clique no fundo,
  trava o scroll do `body` e o botão de fechar tem `aria-label`.
- **Imagens/ícones**: logo com `alt`; `Sparkline` com `role="img"` + `aria-label`.
- **Semântica**: uso de `<nav>`, `<main>`, `<header>`, `<aside>`, `<article>`,
  `<table>`; `NavLink` marca a rota ativa.
- **Idioma**: `<html lang="pt-BR">`.
- **Contraste**: tema dark com `content` (#ECECEC) sobre `bg`/`surface` tem bom
  contraste; texto `muted-2` sobre superfícies escuras é propositalmente
  terciário — evite usá-lo para informação essencial.

## Limitações conhecidas (a melhorar)

1. **Kanban é só mouse.** O arrastar-e-soltar usa eventos HTML5 drag
   ([`../src/pages/TarefasPage.tsx`](../src/pages/TarefasPage.tsx) +
   [`../src/components/tarefas/TaskCard.tsx`](../src/components/tarefas/TaskCard.tsx))
   e **não** tem alternativa por teclado nem `aria` de board/coluna. Melhoria:
   botões "mover para A Fazer/Em Andamento/Concluída" no card (chamando
   `updateTaskStatus`) ou adotar `@dnd-kit` (acessível). Isso também cobre
   touch/leitor de tela.
2. **Modal sem focus trap.** O foco não é preso dentro do diálogo nem devolvido
   ao gatilho ao fechar. Melhoria: mover o foco para o diálogo ao abrir, ciclar
   Tab dentro dele e restaurar o foco ao fechar.
3. **Movimento/animação.** `StatusDot` (`animate-ping`) e os loaders
   (`animate-spin`) não respeitam `prefers-reduced-motion`. Melhoria: desligar
   animações nesse modo.
4. **Foco em diálogo recém-aberto.** Alguns modais usam `autoFocus` no primeiro
   campo; padronizar isso em todos.

## Feedback e tratamento de erro em runtime

Como o app sinaliza (ou não) sucesso/erro hoje:

- **Leitura**: o hook `useAsync` cobre carregando/erro; as páginas mostram
  `Loading`/`LoadError` (com "Tentar novamente") —
  [`../src/components/ui/Loading.tsx`](../src/components/ui/Loading.tsx).
- **Escrita (otimista)**: `moveTask` no Kanban aplica na UI e, **se a persistência
  falhar, apenas recarrega** (`reload()`), sem avisar o usuário.
- **Criações** (tarefa, conta, lançamento): os modais têm estado `submitting` e
  desabilitam o botão, mas **se a Promise rejeitar não há mensagem de erro** — a
  rejeição se propaga sem feedback visual.
- **Não há** sistema de toast/notificação nem **Error Boundary** global de React.

### Melhorias recomendadas

- Adicionar um **sistema de toast** (sucesso/erro) com `aria-live="polite"` para
  leitores de tela, e usá-lo nos `catch` de escrita.
- Envolver as rotas num **Error Boundary** para não quebrar a tela inteira em
  erro inesperado.
- Nos modais, exibir a mensagem de erro (do [contrato da API](API-CONTRATO.md))
  em vez de só reabilitar o botão.

## Checklist de a11y para novas telas

- [ ] Elementos interativos alcançáveis por teclado e com `.focus-ring`.
- [ ] Ações que dependem de mouse têm equivalente por teclado.
- [ ] Imagens com `alt`; ícones informativos com `aria-label`.
- [ ] Cor não é o único indicador de estado (usar também texto/ícone).
- [ ] Animações atenuadas sob `prefers-reduced-motion`.
- [ ] Erros comunicados em texto (e via `aria-live` quando assíncronos).
