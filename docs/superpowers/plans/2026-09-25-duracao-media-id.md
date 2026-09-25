# Duração por Media ID Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cruzar os Media IDs do catálogo com a planilha `DURAÇÃO ID'S` e exibir a duração correta na ficha individual de cada ID.

**Architecture:** O gerador do snapshot principal lerá a planilha de duração junto com `imgs`, normalizará os IDs e anexará a cada registro um mapa `DURACOES` por Media ID. `DadosMedia.buscarPorMediaId()` resolverá a duração do ID solicitado e a ficha `media.html` a exibirá nos metadados. Isso evita baixar a planilha inteira no navegador e trata corretamente linhas do catálogo que contêm múltiplos IDs.

**Tech Stack:** JavaScript ES modules, Node.js 24, Google Sheets API, Node test runner.

**Spec:** solicitação do usuário nesta conversa.

## Global Constraints

- A fonte de duração é a planilha Google Sheets `1zrG3ULT16FxN7wWiFpeYtSvXAXuOaQ1NQ1brA0pXStQ`, aba `Página1`, colunas A:B.
- A coluna A contém Media ID e a coluna B contém duração no formato exibido pela fonte, normalmente `HH:MM:SS`.
- Duração vazia na fonte deve aparecer como `—` na ficha, sem valor inventado.
- Registros do catálogo com vários IDs devem resolver uma duração independente para cada ficha individual.
- O carregamento principal do catálogo deve continuar local-first via `data/catalogo-acervo.json`.

## Review Focus

- IDs com 5 ou 6 dígitos após a letra devem continuar válidos.
- Linhas com múltiplos IDs devem associar cada duração ao ID correspondente.
- Durações ausentes não podem herdar a duração de outro ID.
- Snapshot antigo sem `DURACOES` deve continuar carregando.
- O workflow de sincronização deve continuar usando somente acesso read-only às planilhas.

---

### Task 1: Cruzamento no snapshot

**Files:**
- Modify: `scripts/catalogo-snapshot.mjs`
- Modify: `scripts/gerar-snapshot-catalogo.mjs`
- Test: `tests/catalogo-snapshot.test.mjs`

**Interfaces:**
- Produces: `criarMapaDuracoes(linhas)` e `registro.DURACOES`.

- [ ] Escrever testes que cubram normalização, duração vazia e múltiplos IDs.
- [ ] Rodar os testes e confirmar falha antes da implementação.
- [ ] Implementar o mapa de durações e a leitura da segunda planilha.
- [ ] Rodar os testes até ficarem verdes.

### Task 2: Resolver e mostrar a duração na ficha

**Files:**
- Modify: `js/dados.js`
- Modify: `js/media-detail.js`
- Create: `tests/duracao-media-id.test.mjs`
- Modify: `tests/media-detail-contract.test.mjs`

**Interfaces:**
- Consumes: `registro.DURACOES`.
- Produces: `registro.DURACAO` em `buscarPorMediaId(mediaId)`.

- [ ] Escrever testes para resolução por ID e contrato visual da ficha.
- [ ] Rodar os testes e confirmar falha antes da implementação.
- [ ] Implementar preservação de `DURACOES`, resolução por ID e campo visual `Duração`.
- [ ] Rodar a suíte completa e confirmar zero falhas.
