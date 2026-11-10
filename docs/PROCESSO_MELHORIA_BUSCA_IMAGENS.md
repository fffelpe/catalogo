# Melhoria contínua da busca por imagens

Objetivo: aumentar a precisão das imagens recuperadas por assunto, mantendo a correspondência direta e o Media ID acima de associações contextuais.

## Regras editoriais

1. **Termo exato:** a descrição, o título ou os metadados mencionam explicitamente a consulta.
2. **Sinônimo ou alias:** é outra forma de nomear **o mesmo conceito** (ENEM e Exame Nacional do Ensino Médio).
3. **Relacionado:** é uma cena potencialmente útil, **não uma equivalência** (ENEM → estudantes; hospitais → consultas/UPA/UBS).
4. **Não relacionado:** não deve aparecer só por compartilhar palavras genéricas ou de contexto amplo.
5. **Crédito e pessoa:** nunca inferir a autoria de imagem ou reportagem a partir do assunto. Informações de repórter devem permanecer vinculadas à fonte documental.

Os conceitos relacionados têm peso menor no motor em `js/search-engine.js`. Isso permite recuperar imagens de apoio sem rotulá-las falsamente como imagens do fato pesquisado.

## Onde melhorar o catálogo

| Camada | Local | Função |
| --- | --- | --- |
| Vocabulário | `js/sinonimos.js` | Definir termo principal, sinônimos e conceitos relacionados. |
| Metadados por Media ID | `data/media-enrichment.json` e `scripts/palavras-chave.mjs` | Associar palavras-chave específicas ao material; preservar classificações manuais. |
| Ranking | `js/search-engine.js` | Ordenar por relevância e manter Media ID exato como maior prioridade. |
| Casos de regressão | `tests/fixtures/busca-imagens.json` | Registrar exemplos positivos, negativos e primeiro resultado esperado. |
| Testes | `tests/busca-regressao-imagens.test.mjs` | Detectar perda de qualidade quando o vocabulário ou o ranking muda. |
| Integração contínua | `.github/workflows/test-feature.yml` | Executar `npm test` ao alterar a branch ou abrir um PR para `main`. |

## Como acrescentar um novo assunto

1. Registrar a consulta e os IDs de imagens que deveriam aparecer, mais ao menos um ID que não deveria aparecer.
2. Separar nomes alternativos exatos de imagens apenas relacionadas.
3. Atualizar o dicionário em `js/sinonimos.js`; evitar associações exageradamente genéricas (ex.: `jovem` não é sinônimo de `ENEM`).
4. Acrescentar ou ajustar um caso no corpus `tests/fixtures/busca-imagens.json`.
5. Executar `npm test` e inspecionar os dez primeiros resultados reais antes de integrar a alteração.
6. Comparar o resultado anterior e o novo: correspondência direta no topo; materiais de apoio presentes; falsos positivos ausentes.
7. Só então integrar o PR à branch `main`.

## Indicadores que devemos acompanhar

- **Precisão nos 10 primeiros**: proporção dos primeiros dez resultados considerados úteis por um produtor.
- **Cobertura de imagens esperadas**: quantas imagens conhecidas e relevantes são recuperadas.
- **Prioridade da ocorrência direta**: termos explícitos devem vencer imagens meramente relacionadas.
- **Falsos positivos**: imagens sem ligação plausível com a pesquisa.
- **Tempo de resposta**: observar regressões em buscas realizadas sobre o acervo inteiro.
- **Qualidade dos metadados**: proporção de Media IDs com descrição, crédito, repórter e palavras-chave revisadas.

A avaliação automática atual usa **dados sintéticos**, não substitui revisão editorial no acervo real de dezenas de milhares de registros. Antes de mudanças expressivas no ranking, selecionar amostras reais, revisar manualmente e registrar resultados esperados.

## Próximos incrementos sugeridos

1. Ampliar temas frequentes: política, saúde, educação, segurança, economia, clima, mobilidade, cultura e agronegócio.
2. Adicionar um mecanismo de aprovação de palavras-chave manuais por Media ID, preservando histórico de edição.
3. Medir consultas sem resultados e pesquisas frequentemente refeitas, sem registrar dados pessoais nos relatórios.
4. Mostrar na interface **por que** uma imagem foi encontrada: termo exato, sinônimo, descrição, crédito ou assunto relacionado.
5. Testar consultas ambíguas (ex.: `banco` instituição/assento; `campo` rural/esportivo) e evitar expansão automática sem contexto.
6. Criar avaliações periódicas com um conjunto crescente de consultas reais e análise humana.

> Este documento descreve o processo contínuo. Não há atualização autônoma das palavras-chave nem alteração automática de arquivos sem revisão: toda mudança deve ser testada e publicada pelo fluxo normal do repositório.
