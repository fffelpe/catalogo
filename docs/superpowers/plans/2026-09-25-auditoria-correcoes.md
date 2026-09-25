# Correções da Auditoria Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir os problemas encontrados na auditoria de 25/09/2026 sem introduzir regressões no catálogo.

**Architecture:** O deploy passa a depender da sincronização do catálogo em vez de concorrer com ela; as dependências npm ficam travadas por lockfile e instaladas com `npm ci`; o artefato do Pages passa a conter somente arquivos públicos. O carregamento pesado do snapshot principal deixa de acontecer automaticamente na home e o player deixa de depender de mídia HTTP insegura em páginas HTTPS, conforme o resultado do probe de conectividade.

**Tech Stack:** GitHub Actions, Node.js 24, JavaScript vanilla, GitHub Pages, Google Drive.

**Spec:** Pedido do usuário nesta conversa para aplicar todas as correções apontadas na auditoria de 25/09/2026.

## Global Constraints

- Preservar a suíte existente de testes e adicionar regressões para as mudanças de configuração/comportamento.
- Não escolher arbitrariamente entre documentos de créditos divergentes.
- Não publicar `node_modules`, testes, scripts internos ou documentação no artefato do GitHub Pages.
- Manter o snapshot local como fonte primária do catálogo e o Google Sheets como fallback.
- Não quebrar o funcionamento da busca por programa, créditos, ficha de mídia ou AgroCultura.

## Review Focus

- Push de código em `main` não deve iniciar deploy antes da sincronização do snapshot.
- Commits automáticos que alteram somente `data/**` não devem criar loop de sincronização.
- `npm ci` deve funcionar a partir do `package-lock.json` versionado.
- A home não deve baixar `catalogo-acervo.json` antes de o usuário interagir com a busca/autocomplete.
- Em página HTTPS, o player não deve produzir uma URL de mídia mista HTTP.

---

### Task 1: Resolver conflito bloqueante de créditos

**Files:**
- External: pasta Google Drive `créditos`

**Interfaces:**
- Consumes: regra de duplicidade de `scripts/creditos-conflitos.mjs`.
- Produces: exatamente um documento `1452B005485` com marcador `OFICIAL`.

- [x] Comparar integralmente as duas versões do documento.
- [x] Confirmar que os conteúdos são idênticos.
- [x] Marcar a versão mais recente como `1452B005485 - OFICIAL`.
- [ ] Executar novamente `Sincronizar créditos` e confirmar ausência de conflito bloqueante novo.

### Task 2: Criar testes de regressão da auditoria

**Files:**
- Create: `tests/auditoria-config.test.mjs`

**Interfaces:**
- Consumes: workflows e scripts atuais.
- Produces: contratos automatizados para deploy, dependências, home e player.

- [ ] Escrever testes que falham no estado anterior.
- [ ] Confirmar RED no GitHub Actions.
- [ ] Manter esses testes na suíte padrão `npm test`.

### Task 3: Eliminar race condition e reduzir artefato do Pages

**Files:**
- Modify: `.github/workflows/deploy-pages.yml`
- Modify: `.github/workflows/sincronizar-planilhas.yml`

**Interfaces:**
- Consumes: `Sincronizar planilhas do catálogo`.
- Produces: deploy apenas após sincronização bem-sucedida e diretório `.pages-dist` enxuto.

- [ ] Fazer a sincronização rodar em qualquer push de código/configuração em `main`, ignorando alterações somente em `data/**`.
- [ ] Remover o deploy direto em `push` e manter `workflow_run` + `workflow_dispatch`.
- [ ] Empacotar somente `index.html`, `css/`, `data/`, `images/`, `js/` e `pages/`.
- [ ] Confirmar GREEN nos testes de configuração.

### Task 4: Travar dependências npm

**Files:**
- Create: `package-lock.json`
- Modify: `.github/workflows/deploy-pages.yml`
- Modify: `.github/workflows/sincronizar-planilhas.yml`
- Modify: `.github/workflows/sincronizar-creditos.yml`
- Modify: `.github/workflows/test-feature.yml`

**Interfaces:**
- Consumes: dependências declaradas no `package.json`.
- Produces: instalações reproduzíveis com `npm ci`.

- [ ] Gerar lockfile no runner Node.js 24.
- [ ] Versionar o lockfile sem alterar dependências diretas.
- [ ] Trocar instalações dos workflows por `npm ci`.
- [ ] Confirmar instalação e suíte completa no Actions.

### Task 5: Corrigir transporte do player

**Files:**
- Modify: `js/media-player.js`
- Test: `tests/media-detail-contract.test.mjs` ou `tests/auditoria-config.test.mjs`

**Interfaces:**
- Consumes: resultado do probe HTTP/HTTPS do `lowres.tvcultura.com.br`.
- Produces: `MediaPlayer.criarUrl()` sem mixed content em HTTPS.

- [ ] Verificar HTTP e HTTPS no runner externo.
- [ ] Se HTTPS funcionar, usar HTTPS como base canônica.
- [ ] Se HTTPS não funcionar, suportar proxy HTTPS configurável e impedir URL HTTP em página HTTPS.
- [ ] Confirmar RED→GREEN no teste de player.

### Task 6: Evitar download de 13 MB na abertura da home

**Files:**
- Modify: `js/catalogo-ui.js`
- Test: `tests/auditoria-config.test.mjs`

**Interfaces:**
- Consumes: `DadosMedia.carregarCSV()` e `AutocompleteBusca.inicializar()`.
- Produces: carregamento do acervo somente após foco/entrada do usuário na busca da home.

- [ ] Testar que a inicialização da home não carrega o snapshot imediatamente.
- [ ] Implementar carregamento único sob demanda para autocomplete.
- [ ] Preservar submit imediato para a página de resultados.
- [ ] Confirmar GREEN e ausência de múltiplos carregamentos concorrentes.

### Task 7: Remover CNAME inválido para GitHub Pages

**Files:**
- Delete: `CNAME`

**Interfaces:**
- Produces: Pages deixa de tentar usar um hostname `vercel.app` como domínio customizado.

- [ ] Remover `CNAME` do repositório.
- [ ] Garantir que `.pages-dist` não recrie o arquivo.

### Task 8: Verificação final e integração

**Files:**
- Delete: `.github/workflows/auditoria-probe.yml`

**Interfaces:**
- Consumes: todas as tarefas anteriores.
- Produces: branch pronta para integração.

- [ ] Remover workflow temporário do probe.
- [ ] Rodar `npm test` no GitHub Actions e confirmar zero falhas.
- [ ] Verificar diff completo contra `main`.
- [ ] Reexecutar sincronização de créditos e confirmar bloqueio resolvido.
- [ ] Criar PR para `main` e integrar somente após checks verdes.
