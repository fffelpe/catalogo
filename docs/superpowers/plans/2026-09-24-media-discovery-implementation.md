# Catálogo Inteligente Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar busca enriquecida por segmentos/timecodes, ficha individual de Media ID, conteúdos relacionados e painel diagnóstico de qualidade, preservando o catálogo estático e as integrações atuais.

**Architecture:** O acervo editorial continua vindo de `data/catalogo-acervo.json`. Um segundo snapshot opcional, `data/media-enrichment.json`, concentra palavras-chave, assuntos, pessoas, locais e segmentos por Media ID. Os módulos de busca, ficha, relacionados e qualidade consomem essas duas fontes no navegador; falha do enrichment nunca bloqueia a busca básica.

**Tech Stack:** HTML5, CSS3, JavaScript vanilla, PapaParse, Node.js ESM para testes/scripts, GitHub Pages, Google Sheets snapshot, integração existente de créditos e analytics.

**Spec:** `docs/superpowers/specs/2026-09-24-busca-video-qualidade-media-design.md`

## Global Constraints

- `data/catalogo-acervo.json` permanece fonte principal; Google Sheets continua fallback.
- Nenhum backend novo é obrigatório nesta entrega.
- `media-enrichment.json` é opcional e versionado com `schemaVersion: 1`.
- ID exato continua com prioridade máxima na busca.
- A primeira busca só roda depois de DadosMedia obrigatório + enrichment/créditos opcionais concluírem ou falharem.
- URL de player: `http://lowres.tvcultura.com.br/{MEDIA_ID}.mp4`, construída somente após validação do ID.
- A URL lowres não deve aparecer como texto na interface.
- Segmentos inválidos são ignorados individualmente.
- Ausência de enrichment/créditos não pode derrubar busca, ficha ou painel.
- `LOCAL_AUSENTE` e `REPORTER_AUSENTE` são `warning`; `CREDITOS_AUSENTES` e `SEM_SEGMENTOS` são `info`.
- Score de busca/similaridade é interno e não deve ser apresentado como porcentagem de precisão.
- Qualquer alteração estética deve seguir a prévia visual aprovada antes de ser aplicada; se o layout divergir da prévia, gerar nova prévia antes do commit visual.

## Review Focus

- Célula com múltiplos IDs deve abrir ficha de qualquer ID associado e não gerar falso “não encontrado”.
- Enrichment ausente, HTTP 404 ou JSON inválido deve manter busca básica operacional.
- Segmentos com `start < 0`, `end < start` ou texto vazio devem ser ignorados sem quebrar os demais.
- Busca por termo presente somente em um segmento deve retornar o registro e preservar o Media ID correto do trecho.
- Créditos indisponíveis devem ficar “não verificados”, nunca marcar todo o acervo como `CREDITOS_AUSENTES`.

---

### Task 1: Camada de enrichment e lookup exato de Media ID

**Files:**
- Create: `data/media-enrichment.json`
- Create: `js/media-enrichment.js`
- Modify: `js/dados.js`
- Test: `tests/media-enrichment.test.mjs`
- Test: `tests/dados-media-id.test.mjs`

**Interfaces:**
- Produces: `MediaEnrichment.carregar(): Promise<object>`
- Produces: `MediaEnrichment.obter(mediaId): object|null`
- Produces: `MediaEnrichment.obterSegmentos(mediaId): Array<Segmento>`
- Produces: `MediaEnrichment.camposPesquisa(mediaId): object`
- Produces: `DadosMedia.buscarPorMediaId(mediaId): object|null`

- [ ] **Step 1: Write failing tests for enrichment validation and multi-ID lookup**

```js
assert.deepEqual(MediaEnrichment.normalizarItem({
  keywords: ["chuva"],
  segments: [
    { start: 28, end: 46, text: "Bombeiros auxiliam moradores" },
    { start: -1, end: 4, text: "inválido" },
    { start: 50, end: 40, text: "inválido" },
    { start: 60, end: 70, text: "   " }
  ]
}).segments, [
  { start: 28, end: 46, text: "Bombeiros auxiliam moradores" }
]);

DadosMedia.registros = [{ ID: "1452B004869 / 1452B004870", DESCRICAO: "Teste" }];
assert.equal(DadosMedia.buscarPorMediaId("1452B004870")?.DESCRICAO, "Teste");
```

- [ ] **Step 2: Run tests and confirm they fail**

Run: `node --test tests/media-enrichment.test.mjs tests/dados-media-id.test.mjs`

Expected: FAIL because `MediaEnrichment` and `buscarPorMediaId` do not exist.

- [ ] **Step 3: Implement `js/media-enrichment.js`**

Core validation:

```js
function normalizarSegmento(segmento = {}) {
  const start = Number(segmento.start);
  const end = segmento.end === undefined || segmento.end === null || segmento.end === ""
    ? null
    : Number(segmento.end);
  const text = String(segmento.text || "").trim();

  if (!Number.isFinite(start) || start < 0 || !text) return null;
  if (end !== null && (!Number.isFinite(end) || end < start)) return null;

  return { start, ...(end === null ? {} : { end }), text };
}
```

`camposPesquisa(mediaId)` returns:

```js
{
  KEYWORDS: "chuva alagamento",
  SUBJECTS: "enchente",
  PEOPLE: "",
  PLACES: "São Paulo",
  SEGMENTS: "Bombeiros auxiliam moradores"
}
```

- [ ] **Step 4: Implement `DadosMedia.buscarPorMediaId(mediaId)`**

```js
buscarPorMediaId(mediaId) {
  const alvo = MediaIdUtils.normalizar(mediaId);
  if (!alvo) return null;
  return this.registros.find((registro) =>
    MediaIdUtils.extrair(registro.ID).includes(alvo)
  ) || null;
}
```

- [ ] **Step 5: Create safe empty enrichment snapshot**

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-09-24T00:00:00.000Z",
  "items": {}
}
```

- [ ] **Step 6: Run tests**

Run: `node --test tests/media-enrichment.test.mjs tests/dados-media-id.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add data/media-enrichment.json js/media-enrichment.js js/dados.js tests/media-enrichment.test.mjs tests/dados-media-id.test.mjs
git commit -m "feat: adiciona camada de enriquecimento de mídia"
```

---

### Task 2: Busca por segmentos e ranking enriquecido

**Files:**
- Create: `js/media-segments.js`
- Modify: `js/search-engine.js`
- Modify: `js/catalogo-ui.js`
- Modify: `pages/resultado-busca.html`
- Test: `tests/media-segments.test.mjs`
- Test: `tests/search-enrichment.test.mjs`

**Interfaces:**
- Consumes: `MediaEnrichment.obterSegmentos(mediaId)`
- Produces: `MediaSegments.buscar(mediaId, consulta)`
- Produces: `MediaSegments.buscarEmRegistro(registro, consulta)`
- Produces: `MediaSegments.formatarTimecode(segundos)`
- Produces: `MediaSegments.criarUrlFicha(mediaId, start)`
- Search result adds `_SEARCH_SEGMENT_MATCHES`.

- [ ] **Step 1: Write failing segment-search tests**

```js
MediaEnrichment._definirParaTeste({
  "1452B004869": {
    segments: [{ start: 28, end: 46, text: "Bombeiros auxiliam moradores durante enchente" }]
  }
});

assert.equal(MediaSegments.buscar("1452B004869", "bombeiros enchente")[0].start, 28);
assert.equal(MediaSegments.formatarTimecode(88), "01:28");
assert.equal(
  MediaSegments.criarUrlFicha("1452B004869", 28),
  "media.html?id=1452B004869&t=28"
);
```

- [ ] **Step 2: Run segment tests and confirm failure**

Run: `node --test tests/media-segments.test.mjs`

- [ ] **Step 3: Implement segment module**

Segment scoring: normalize query, remove stopwords, require at least one meaningful token, score phrase match above token matches, return descending score with stable original order.

- [ ] **Step 4: Extend SearchEngine enrichment fields**

Add weights:

```js
KEYWORDS: 32,
SUBJECTS: 36,
PEOPLE: 28,
PLACES: 24,
SEGMENTS: 38
```

For each record:

```js
const ids = MediaIdUtils.extrair(registro.ID);
const enriquecidos = ids.map((id) => ({ id, ...MediaEnrichment.camposPesquisa(id) }));
```

Aggregate plain fields for ranking, but preserve per-ID segment matches:

```js
_SEARCH_SEGMENT_MATCHES: MediaSegments.buscarEmRegistro(registro, consulta).slice(0, 5)
```

- [ ] **Step 5: Write ranking tests**

Test that a term found only in `SEGMENTS` returns the record; test that exact ID still outranks enrichment-only matches; test that segment result preserves `mediaId`.

- [ ] **Step 6: Update results-page loading order**

In `inicializarPaginaResultados()`:

```js
await DadosMedia.carregarCSV();
await Promise.allSettled([
  typeof MediaEnrichment !== "undefined" ? MediaEnrichment.carregar() : Promise.resolve(),
  typeof CreditosMedia !== "undefined" ? CreditosMedia.carregar() : Promise.resolve()
]);
executarBusca(termoInicial, programa, Boolean(termoInicial));
```

Load scripts in this order before `search-engine.js`:

```html
<script src="../js/media-enrichment.js?v=1"></script>
<script src="../js/media-segments.js?v=1"></script>
```

- [ ] **Step 7: Run tests**

Run: `node --test tests/media-segments.test.mjs tests/search-enrichment.test.mjs`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add js/media-segments.js js/search-engine.js js/catalogo-ui.js pages/resultado-busca.html tests/media-segments.test.mjs tests/search-enrichment.test.mjs
git commit -m "feat: adiciona busca por trechos de vídeo"
```

---

### Task 3: Links de ficha e ação “Trecho encontrado” na tabela

**Files:**
- Modify: `js/catalogo-ui.js`
- Modify: `css/search-results-table.css`
- Test: `tests/catalogo-ui-media-links.test.mjs`

**Interfaces:**
- Consumes: `_SEARCH_SEGMENT_MATCHES`
- Produces: links `media.html?id=...` and `media.html?id=...&t=...`.

- [ ] **Step 1: Write failing HTML rendering tests**

Assert that:

```js
formatarIdsComCopia("1452B004869 / 1452B004870")
```

contains links for both IDs and retains `.btn-copiar-id`.

Assert that best segment renders:

```html
<a class="trecho-encontrado" href="media.html?id=1452B004869&t=28">Trecho encontrado · 00:28</a>
```

- [ ] **Step 2: Run test and confirm failure**

Run: `node --test tests/catalogo-ui-media-links.test.mjs`

- [ ] **Step 3: Implement ID links without changing table columns**

The ID text becomes `<a class="media-id-link">` while copy button stays separate.

- [ ] **Step 4: Implement segment badge under the matching result description**

Only the best segment is shown in the row. No new table column is created.

- [ ] **Step 5: Apply only the already-approved visual treatment**

Use compact green link/badge styling consistent with the approved preview. If implementation requires any visual departure, stop this step and generate a new preview before changing CSS.

- [ ] **Step 6: Run tests**

Run: `node --test tests/catalogo-ui-media-links.test.mjs`

- [ ] **Step 7: Commit**

```bash
git add js/catalogo-ui.js css/search-results-table.css tests/catalogo-ui-media-links.test.mjs
git commit -m "feat: conecta resultados às fichas de mídia"
```

---

### Task 4: Ficha de Media ID, player e conteúdos relacionados

**Files:**
- Create: `pages/media.html`
- Create: `css/media-detail.css`
- Create: `js/media-player.js`
- Create: `js/related-media.js`
- Create: `js/media-detail.js`
- Test: `tests/media-player.test.mjs`
- Test: `tests/related-media.test.mjs`
- Test: `tests/media-detail.test.mjs`

**Interfaces:**
- Consumes: `DadosMedia.buscarPorMediaId`, `MediaEnrichment`, `CreditosMedia`, `MediaSegments`.
- Produces: `MediaPlayer.criarUrl(mediaId)` and `MediaPlayer.aplicarInicio(video, start)`.
- Produces: `RelatedMedia.calcular(registro, registros, opcoes): Array<RelatedResult>`.

- [ ] **Step 1: Write player validation tests**

```js
assert.equal(
  MediaPlayer.criarUrl("1452B004869"),
  "http://lowres.tvcultura.com.br/1452B004869.mp4"
);
assert.equal(MediaPlayer.criarUrl("<script>"), "");
```

- [ ] **Step 2: Write related-media tests**

Fixture: same subject + keyword outranks same program only; current editorial record and associated IDs never return; max results = 6.

- [ ] **Step 3: Implement player module**

`aplicarInicio` must clamp to `>= 0` and set `currentTime` on `loadedmetadata` when needed. Attach an `error` listener that toggles a status message without throwing.

- [ ] **Step 4: Implement deterministic related-media scoring**

Use weights from spec and normalized token intersections. Temporal bonus max 5; invalid dates receive 0 temporal bonus.

- [ ] **Step 5: Build `pages/media.html` according to approved preview**

Required regions:

```html
<main id="mediaDetail">
  <nav class="media-breadcrumb"></nav>
  <section id="mediaHeader"></section>
  <section id="mediaPlayer"></section>
  <section id="mediaDescription"></section>
  <section id="mediaMetadata"></section>
  <section id="mediaCredits"></section>
  <section id="mediaTags"></section>
  <section id="mediaSegments"></section>
  <section id="mediaRelated"></section>
  <section id="mediaCompleteness"></section>
</main>
```

- [ ] **Step 6: Implement `media-detail.js` states**

Parse:

```js
const id = MediaIdUtils.normalizar(params.get("id"));
const tRaw = Number(params.get("t"));
const start = Number.isFinite(tRaw) && tRaw >= 0 ? tRaw : 0;
```

Render explicit states for invalid ID, not found, missing enrichment, player error.

- [ ] **Step 7: Add accessible segment controls**

Each segment is a `<button>` with `aria-label="Ir para 00:28 — Bombeiros auxiliam moradores"`; click sets player `currentTime`.

- [ ] **Step 8: Run tests**

Run: `node --test tests/media-player.test.mjs tests/related-media.test.mjs tests/media-detail.test.mjs`

- [ ] **Step 9: Commit**

```bash
git add pages/media.html css/media-detail.css js/media-player.js js/related-media.js js/media-detail.js tests/media-player.test.mjs tests/related-media.test.mjs tests/media-detail.test.mjs
git commit -m "feat: adiciona ficha completa do Media ID"
```

---

### Task 5: Motor de qualidade de metadados

**Files:**
- Create: `js/catalogo-quality.js`
- Test: `tests/catalogo-quality.test.mjs`

**Interfaces:**
- Produces: `CatalogoQuality.avaliarRegistro(registro, contexto)`
- Produces: `CatalogoQuality.avaliarAcervo(registros, contexto)`
- Produces: `CatalogoQuality.resumir(relatorio)`

- [ ] **Step 1: Write severity and duplicate tests**

```js
assert.equal(problema("LOCAL_AUSENTE").severidade, "warning");
assert.equal(problema("REPORTER_AUSENTE").severidade, "warning");
assert.equal(problema("CREDITOS_AUSENTES").severidade, "info");
assert.equal(problema("SEM_SEGMENTOS").severidade, "info");
```

Create two records where one cell is `1452B004869` and another is `1452B004869 / 1452B004870`; assert `1452B004869` is reported duplicated.

- [ ] **Step 2: Run test and confirm failure**

Run: `node --test tests/catalogo-quality.test.mjs`

- [ ] **Step 3: Implement validation rules**

Critical: invalid ID, duplicate ID, missing required program when record otherwise valid enough to identify. Warning: missing/invalid date, missing description, local, reporter. Info: credits absent when credits loaded, no segments.

Credit context:

```js
{ creditosStatus: "loaded" | "failed" | "not-loaded" }
```

Only `loaded` may emit `CREDITOS_AUSENTES`.

- [ ] **Step 4: Implement summary**

Return counts for total, critical/warning/info, noCritical, and by problem code.

- [ ] **Step 5: Run tests**

Run: `node --test tests/catalogo-quality.test.mjs`

- [ ] **Step 6: Commit**

```bash
git add js/catalogo-quality.js tests/catalogo-quality.test.mjs
git commit -m "feat: adiciona diagnóstico de qualidade do catálogo"
```

---

### Task 6: Painel de Qualidade

**Files:**
- Create: `pages/qualidade.html`
- Create: `css/catalogo-quality.css`
- Create: `js/catalogo-quality-ui.js`
- Test: `tests/catalogo-quality-ui.test.mjs`

**Interfaces:**
- Consumes: `CatalogoQuality.avaliarAcervo()` and `resumir()`.
- Produces: client-side filters by program, severity and problem code.

- [ ] **Step 1: Write rendering/filter tests**

Fixture must verify that selecting `warning` hides `critical`/`info`, and selecting a program limits rows. IDs render links to `media.html?id=...`.

- [ ] **Step 2: Run failing test**

Run: `node --test tests/catalogo-quality-ui.test.mjs`

- [ ] **Step 3: Build page structure according to approved preview**

Cards:
- Registros avaliados
- Sem problemas críticos
- Descrições ausentes
- Locais ausentes
- Sem segmentos

Filters:
- Programa
- Severidade
- Tipo de problema

Table:
- ID
- Descrição
- Programa
- Data
- Problemas
- Severidade

- [ ] **Step 4: Implement UI data flow**

Load mandatory `DadosMedia`, then optional enrichment/credits with `Promise.allSettled`. Build report once; filters operate in memory.

- [ ] **Step 5: Apply only the approved visual treatment**

Use cards, chips and green accents consistent with the approved preview. Any new visual decision requires a new preview before CSS implementation.

- [ ] **Step 6: Run tests**

Run: `node --test tests/catalogo-quality-ui.test.mjs`

- [ ] **Step 7: Commit**

```bash
git add pages/qualidade.html css/catalogo-quality.css js/catalogo-quality-ui.js tests/catalogo-quality-ui.test.mjs
git commit -m "feat: adiciona painel de qualidade do acervo"
```

---

### Task 7: Integração, regressão e verificação final

**Files:**
- Modify: `package.json`
- Modify: `README.md` only if needed to document new pages/data file
- Test: existing `tests/*.test.mjs`

**Interfaces:**
- No new runtime interface; validates the complete system.

- [ ] **Step 1: Add unified test script**

```json
{
  "scripts": {
    "test": "node --test tests/*.test.mjs"
  }
}
```

Preserve all existing scripts.

- [ ] **Step 2: Run full test suite**

Run: `npm test`

Expected: all existing and new tests PASS.

- [ ] **Step 3: Check snapshot generation compatibility**

Run: `node --test tests/catalogo-snapshot.test.mjs tests/dados-local-first.test.mjs tests/google-sheets-errors.test.mjs`

Expected: PASS; no schema change to `catalogo-acervo.json` required.

- [ ] **Step 4: Static integration checks**

Verify script dependency order in `resultado-busca.html`, `media.html`, and `qualidade.html`. Confirm no page references undefined modules before their script loads.

- [ ] **Step 5: Security regression checks**

Use fixtures containing `<img onerror=...>` in description/segment and assert rendering escapes it. Verify invalid `id` cannot enter player URL.

- [ ] **Step 6: Performance sanity check**

Confirm no result row performs a fetch/HEAD request to lowres; only `media.html` constructs/loads the selected video URL.

- [ ] **Step 7: Commit**

```bash
git add package.json README.md tests
git commit -m "test: valida integração do catálogo inteligente"
```

- [ ] **Step 8: Final verification**

Run:

```bash
npm test
npm run check:snapshot
```

Expected: PASS. If `check:snapshot` fails only because the snapshot is stale relative to its freshness policy, record that separately from functional test results instead of masking it.
