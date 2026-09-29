# Créditos, duração e cidade das afiliadas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar ao catálogo a cidade das afiliadas, o texto completo dos documentos de créditos e a duração oficial por Media ID.

**Architecture:** Manter snapshots locais versionados e atualizados por GitHub Actions. A duração continua embutida no snapshot principal; afiliadas/repórteres ganham snapshot próprio; créditos continuam em `data/creditos.json`, agora também usados integralmente na pesquisa.

**Tech Stack:** JavaScript/Node.js 24, Google Sheets API, Google Drive API, GitHub Actions, testes `node:test`.

**Spec:** `docs/superpowers/specs/2026-09-28-afiliadas-reporteres-enriquecimento-design.md`

## Global Constraints

- Preservar os valores editoriais já existentes em `imgs`.
- A planilha `DURAÇÃO ID'S` usa coluna A = Media ID e coluna B = duração.
- Linhas com duração vazia não removem nem bloqueiam o Media ID.
- Documentos de créditos são associados somente por Media ID exato e seguem as regras existentes de conflito/OFICIAL.
- A aba `afiliadas` agora contém `AFILIADA_ID`, `NOME`, `UF`, `CIDADE`, `ATIVA`.

## Review Focus

- Duração vazia não pode eliminar um item do catálogo.
- Cidade vazia em uma afiliada deve ser aceita sem quebrar o snapshot.
- Repórter ligado a afiliada inexistente deve invalidar o snapshot.
- Dados originais de `imgs` têm prioridade sobre enriquecimento.
- Texto completo de créditos deve melhorar a busca sem superar a prioridade de Media ID exato.

---

### Task 1: Duração oficial A:B

**Files:**
- Modify: `scripts/catalogo-snapshot.mjs`
- Modify: `scripts/gerar-snapshot-catalogo.mjs`
- Test: `tests/catalogo-snapshot.test.mjs`

- [x] Testar duração por Media ID, múltiplos IDs, ID ausente e duração vazia.
- [x] Ler apenas colunas A:B da planilha `DURAÇÃO ID'S`.
- [x] Rodar a suíte completa.

### Task 2: Créditos como metadados pesquisáveis

**Files:**
- Modify: `js/creditos.js`
- Modify: `js/search-engine.js`
- Test: `tests/search-creditos.test.mjs`

- [x] Testar termo existente apenas em `textoCompleto`.
- [x] Expor `CREDITOS_TEXTO` e adicioná-lo ao ranking com peso complementar.
- [x] Rodar a suíte completa.

### Task 3: Snapshot oficial de afiliadas e repórteres com cidade

**Files:**
- Create: `scripts/afiliadas-reporteres-snapshot.mjs`
- Create: `scripts/gerar-afiliadas-reporteres.mjs`
- Create: `tests/afiliadas-reporteres-snapshot.test.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/sincronizar-planilhas.yml`

**Interfaces:**
- `criarSnapshotAfiliadasReporteres(afiliadasRows, reporteresRows, options)` produz `{ schemaVersion, generatedAt, afiliadas, reporteres }`.
- Afiliada produz `{ id, nome, uf, cidade, ativa }`.

- [x] Escrever testes para cidade, status, IDs duplicados e referência inválida.
- [x] Verificar os testes falhando antes da implementação.
- [x] Implementar o gerador puro e o script que lê as abas `afiliadas!A2:E` e `repórteres!A2:E`.
- [x] Integrar ao workflow de sincronização e publicação dos snapshots.

### Task 4: Enriquecimento e busca por cidade/UF

**Files:**
- Modify: `js/reporteres.js`
- Modify: `js/search-engine.js`
- Modify: `js/media-detail.js`
- Test: `tests/reporteres-afiliadas.test.mjs`
- Test: `tests/media-detail-contract.test.mjs`

- [x] Testar preenchimento de afiliada, cidade e UF quando o repórter é identificado.
- [x] Testar preservação de afiliada já existente em `imgs`.
- [x] Trocar `data/reporteres.json` por `data/afiliadas-reporteres.json` como fonte oficial.
- [x] Expor `_AFILIADA_CIDADE` e `_AFILIADA_UF` para busca e ficha do Media ID.
- [x] Mostrar Cidade e UF na ficha individual quando disponíveis.

### Task 5: Verificação e integração

- [x] Rodar `npm test` e confirmar zero falhas.
- [x] Inspecionar o diff do PR.
- [ ] Integrar o PR complementar após os testes do GitHub Actions passarem.
