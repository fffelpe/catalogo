# Catálogo de Mídias — Busca inteligente, busca em vídeo, qualidade, ficha de Media ID e relacionados

Data: 2026-09-24  
Repositório: `fffelpe/catalogo`  
Status: especificação para revisão

## 1. Objetivo

Evoluir o Catálogo de Mídias de uma tabela de consulta para uma ferramenta jornalística de descoberta de acervo, preservando a arquitetura atual de GitHub Pages, o snapshot local do acervo e as integrações existentes.

O trabalho cobre cinco funcionalidades:

1. busca inteligente com ranking de relevância;
2. pesquisa dentro do vídeo por segmentos/timecodes;
3. painel de qualidade dos metadados;
4. ficha individual de cada Media ID;
5. conteúdos relacionados.

A implementação deve aproveitar os módulos atuais (`DadosMedia`, `SearchEngine`, `MediaIdUtils`, créditos, analytics, histórico, autocomplete e buscas populares), evitando reescrever fluxos estáveis.

## 2. Princípios de projeto

- **Local-first:** `data/catalogo-acervo.json` continua sendo a fonte principal do navegador, com Google Sheets como fallback já existente.
- **Sem backend novo obrigatório na primeira versão:** os metadados enriquecidos ficam em um JSON versionado, preparado para futura migração para Supabase quando volume ou frequência de atualização justificarem.
- **Compatibilidade progressiva:** registros sem dados enriquecidos continuam funcionando normalmente.
- **Media ID como chave:** toda informação enriquecida é ligada a um Media ID normalizado por `MediaIdUtils`.
- **Explicabilidade:** ranking, problemas de qualidade e relação entre conteúdos devem ser calculados por regras determinísticas e testáveis.
- **Performance:** a busca continua no navegador e não deve requisitar um arquivo individual para cada resultado.
- **Sem dependência da decupagem automática nesta entrega:** busca dentro do vídeo funciona com segmentos existentes ou adicionados futuramente. A estrutura fica pronta para receber decupagem automática por IA depois.

## 3. Arquitetura

### 3.1 Fontes de dados

O catálogo terá duas camadas locais de dados:

- `data/catalogo-acervo.json`: campos editoriais principais vindos da planilha `imgs`;
- `data/media-enrichment.json`: campos derivados ou enriquecidos do Media ID.

O navegador carrega o acervo principal por `DadosMedia` e os metadados enriquecidos por `MediaEnrichment`.

Fluxo:

```text
Google Sheets / imgs
       ↓
snapshot principal
       ↓
data/catalogo-acervo.json ─────────────┐
                                       ├─→ busca / ficha / qualidade / relacionados
metadados enriquecidos                 │
       ↓                               │
data/media-enrichment.json ────────────┘
```

O Supabase atual continua responsável pelo analytics global. Esta entrega não adiciona uma nova dependência de banco para a consulta do acervo.

### 3.2 Ordem de carregamento

Na página de resultados:

1. carregar `DadosMedia`;
2. carregar `MediaEnrichment` e `CreditosMedia` em paralelo;
3. falha em enrichment ou créditos é tolerada;
4. executar a primeira busca somente depois que essas cargas opcionais forem concluídas ou falharem.

Isso garante que a primeira busca já use timecodes e campos enriquecidos quando disponíveis, sem tornar esses dados obrigatórios para o funcionamento básico.

Na ficha e no painel de qualidade, o acervo principal é obrigatório; enrichment e créditos são opcionais e usam a mesma estratégia tolerante a falhas.

### 3.3 Formato do enriquecimento

`data/media-enrichment.json` terá envelope versionado:

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-09-24T00:00:00.000Z",
  "items": {
    "1452B004869": {
      "keywords": ["chuva", "alagamento", "bombeiros"],
      "subjects": ["enchente"],
      "people": [],
      "places": ["São Paulo"],
      "segments": [
        {
          "start": 28,
          "end": 46,
          "text": "Bombeiros auxiliam moradores em rua alagada"
        }
      ]
    }
  }
}
```

Regras:

- chaves de `items` devem ser Media IDs válidos e normalizados;
- `start` e `end` são segundos inteiros ou decimais não negativos;
- `end`, quando informado, deve ser maior ou igual a `start`;
- `text` vazio torna o segmento inválido para pesquisa;
- arrays ausentes são tratados como vazios;
- um arquivo ausente ou inválido não pode impedir a busca básica do catálogo.

## 4. Módulos

### 4.1 `js/media-enrichment.js`

Responsabilidade única: carregar, validar minimamente e indexar `media-enrichment.json`.

API pública prevista:

- `carregar()`;
- `obter(mediaId)`;
- `obterSegmentos(mediaId)`;
- `camposPesquisa(mediaId)`;
- `todos()`.

O carregamento deve ser memoizado para evitar requisições repetidas.

### 4.2 `js/dados.js`

O módulo atual permanece responsável pelo acervo principal e ganha uma busca exata por token de Media ID:

- `buscarPorMediaId(mediaId)`.

Essa busca deve normalizar o ID consultado e comparar contra cada ID retornado por `MediaIdUtils.extrair(registro.ID)`, em vez de comparar a célula inteira.

Isso é necessário para registros cuja célula contém múltiplos IDs, por exemplo:

```text
1452B004869 / 1452B004870
```

A ficha de qualquer um desses IDs deve localizar o mesmo registro editorial.

### 4.3 `js/search-engine.js`

O motor atual será estendido, não substituído.

Novos campos internos de ranking:

- `KEYWORDS`: peso 32;
- `SUBJECTS`: peso 36;
- `PEOPLE`: peso 28;
- `PLACES`: peso 24;
- `SEGMENTS`: peso 38.

Os pesos existentes continuam válidos, incluindo prioridade máxima para ID exato.

Para cada registro, o motor extrai todos os Media IDs da célula e agrega os campos de enrichment desses IDs para fins de busca. Correspondências de segmento devem preservar qual `mediaId` originou o trecho.

Regras adicionais:

- correspondência de frase completa recebe bônus;
- correspondência em múltiplos campos recebe bônus moderado;
- encontrar todos os termos relevantes da consulta recebe bônus;
- segmentos participam do ranking apenas quando possuem texto válido;
- o resultado pode carregar `_SEARCH_SEGMENT_MATCHES` com os melhores trechos encontrados, incluindo `mediaId`, `start`, `end`, `text` e score;
- score permanece interno e não será apresentado como uma porcentagem de precisão artificial.

A ordenação continua sendo `score desc` e, em empate, ordem original estável.

### 4.4 `js/media-segments.js`

Responsabilidade: pesquisar segmentos e preparar navegação por timecode.

API prevista:

- `buscar(mediaId, consulta)`;
- `buscarEmRegistro(registro, consulta)`;
- `formatarTimecode(segundos)`;
- `criarUrlFicha(mediaId, start)`.

Ao encontrar um segmento, o catálogo deve guardar `mediaId`, `start`, `end`, `text` e score do trecho.

### 4.5 `js/media-player.js`

Responsabilidade: construir e controlar o player da ficha.

URL de mídia:

```text
http://lowres.tvcultura.com.br/{MEDIA_ID}.mp4
```

O módulo deve:

- normalizar o ID antes de construir a URL;
- iniciar no segundo informado pelo parâmetro `t` da URL da ficha;
- permitir clicar em um segmento para saltar para seu `start`;
- não exibir a URL lowres textual na interface;
- tratar erro de carregamento com mensagem visual sem quebrar o restante da ficha.

A página não fará varredura de disponibilidade de todos os vídeos em massa. Verificação de vídeo será feita apenas quando o usuário abrir a ficha/player, evitando centenas ou milhares de requisições HTTP.

### 4.6 `js/catalogo-quality.js`

Responsabilidade: avaliar qualidade dos metadados sem confundir campo opcional com erro obrigatório.

Problemas detectáveis na primeira versão:

- `ID_INVALIDO`;
- `ID_DUPLICADO`;
- `DESCRICAO_AUSENTE`;
- `DATA_AUSENTE`;
- `DATA_INVALIDA`;
- `PROGRAMA_AUSENTE`;
- `LOCAL_AUSENTE` como aviso contextual;
- `REPORTER_AUSENTE` como aviso contextual;
- `CREDITOS_AUSENTES` como informação de completude quando a integração de créditos estiver carregada;
- `SEM_SEGMENTOS` como indicador de enriquecimento, não erro editorial.

Severidades:

- `critical`: impede identificação/confiabilidade do registro;
- `warning`: metadado incompleto que pode reduzir encontrabilidade;
- `info`: oportunidade de enriquecimento ou dado opcional ausente.

Campos `LOCAL` e `REPORTER` não são obrigatórios universalmente. Sua ausência deve ser `warning`, nunca `critical`, porque imagens brutas ou registros específicos podem legitimamente não possuir esses dados.

`CREDITOS_AUSENTES` será `info` na primeira versão, pois o catálogo não possui uma regra confiável que determine quais registros obrigatoriamente deveriam ter um documento de créditos.

API prevista:

- `avaliarRegistro(registro, contexto)`;
- `avaliarAcervo(registros, contexto)`;
- `resumir(relatorio)`.

### 4.7 `js/related-media.js`

Responsabilidade: calcular similaridade entre um item aberto e os demais registros.

Sinais e pesos iniciais:

- assunto (`subjects`): 35;
- palavras-chave (`keywords`): 30;
- descrição: 25;
- local/enriched places: 18;
- editoria: 12;
- repórter: 10;
- programa: 6;
- proximidade temporal: até 5.

Regras:

- nunca retornar o próprio Media ID;
- deduplicar registros com o mesmo conjunto de IDs;
- exigir score mínimo para não exibir relações fracas;
- limitar a ficha aos 6 melhores relacionados;
- em empate, priorizar data mais próxima e depois ordem estável;
- o score de similaridade não será mostrado ao usuário na primeira versão.

### 4.8 `js/media-detail.js`

Responsabilidade: montar a ficha individual usando os módulos acima.

A página recebe:

```text
pages/media.html?id=1452B004869&t=28
```

`id` é obrigatório. `t` é opcional.

Estados previstos:

- carregando;
- Media ID válido e encontrado;
- Media ID inválido;
- Media ID válido mas ausente no acervo;
- player indisponível;
- enriquecimento ausente.

A ausência de enriquecimento não bloqueia a ficha.

## 5. Interface

### 5.1 Resultado de busca

Na tabela atual:

- o texto de cada Media ID se torna link para `media.html?id=...`;
- o botão de copiar ID permanece independente;
- quando a busca encontrar texto dentro de um segmento, a linha recebe uma pequena ação `Trecho encontrado · 00:28`;
- clicar nessa ação abre `media.html?id=MEDIA_ID_DO_TRECHO&t=28`;
- nenhuma nova coluna obrigatória será adicionada à tabela, preservando sua largura responsiva.

Para registros que contêm múltiplos IDs, cada ID terá sua própria ligação para ficha. A linha editorial continua única. Se a correspondência de segmento pertencer somente a um dos IDs, a ação de trecho aponta especificamente para esse ID.

### 5.2 Ficha do Media ID

Nova página: `pages/media.html`.

Ordem dos blocos:

1. breadcrumb/voltar para resultados;
2. Media ID + copiar;
3. player;
4. descrição principal;
5. metadados editoriais;
6. créditos;
7. palavras-chave/assuntos, quando existirem;
8. segmentos/timecodes;
9. conteúdos relacionados;
10. indicador resumido de completude do registro.

O player e os segmentos devem ser utilizáveis por teclado. Botões terão `aria-label` apropriado.

Quando a célula editorial tiver múltiplos IDs, a ficha mostra o ID solicitado como principal e pode listar os demais como IDs associados.

### 5.3 Painel de qualidade

Nova página: `pages/qualidade.html`.

Elementos:

- total de registros avaliados;
- percentual de registros sem problemas críticos;
- contadores por severidade;
- cartões para descrição ausente, data inválida, local ausente, repórter ausente, créditos ausentes e sem segmentos;
- tabela de registros com problemas;
- filtros por severidade, tipo de problema e programa;
- link de cada ID para sua ficha.

O indicador principal será descrito como **"Registros sem problemas críticos"**, evitando chamar de "saúde" uma porcentagem cujo significado possa ser ambíguo.

O painel é diagnóstico e não altera dados da planilha.

## 6. Busca dentro do vídeo

A pesquisa em segmento será integrada ao mesmo campo de busca já existente.

Exemplo:

Consulta:

```text
bombeiros enchente
```

Se um registro não tiver a frase na descrição, mas possuir:

```json
{
  "start": 28,
  "text": "Bombeiros auxiliam moradores durante enchente"
}
```

esse registro entra no resultado e recebe metadado interno de correspondência de segmento.

A interface mostra apenas o melhor trecho por linha. A ficha mostra todos os segmentos relevantes do Media ID aberto.

Segmentos nunca substituem descrição, local ou demais metadados editoriais; eles apenas enriquecem a encontrabilidade.

## 7. Conteúdos relacionados

O cálculo acontece no navegador após a ficha carregar o acervo e o enriquecimento.

Para não gerar custo quadrático durante a busca geral, a similaridade só é calculada para o item da ficha aberta.

Tokenização de descrição deve reutilizar normalização compatível com `SearchEngine`, removendo stopwords e acentos para comparação, mas preservando texto original para exibição.

Datas inválidas simplesmente não recebem bônus temporal.

Para uma ficha de ID pertencente a um registro com múltiplos IDs, o próprio registro editorial e seus IDs associados não podem aparecer como conteúdo relacionado.

## 8. Qualidade e duplicidade

A duplicidade será avaliada por cada Media ID extraído com `MediaIdUtils.extrair`.

Exemplo:

- linha A: `1452B004869`;
- linha B: `1452B004869 / 1452B004870`.

`1452B004869` será marcado como duplicado, mesmo que a célula completa de ID seja diferente.

O relatório deve preservar a referência aos registros envolvidos para facilitar diagnóstico.

## 9. Compatibilidade com créditos

Quando `CreditosMedia` estiver disponível, a ficha deve reutilizar a integração atual em vez de duplicar fontes.

O SearchEngine continuará incorporando `CREDITOS_MATERIA`, `CREDITOS_FONTES`, `CREDITOS_EQUIPE` e `CREDITOS_CARGOS`.

O painel de qualidade só avalia a presença de créditos depois que a fonte tiver terminado de carregar. Falha da fonte deve gerar estado "não verificado", e não marcar todo o catálogo como sem créditos.

Ausência de créditos é `info`, não `warning`, até existir uma regra editorial que determine quais tipos de registro exigem créditos.

## 10. Compatibilidade com Analytics

As funções novas não mudam o contrato atual do analytics de buscas.

Eventos adicionais poderão ser incluídos posteriormente, mas não fazem parte desta entrega:

- abertura de ficha;
- play de vídeo;
- clique em timecode;
- clique em relacionado.

A primeira versão deve evitar ampliar o schema Supabase sem necessidade.

## 11. Tratamento de erros

- falha do snapshot principal: manter fallback atual para Google Sheets;
- falha do enrichment: busca básica e ficha continuam operando;
- ID inválido na URL: mostrar estado inválido e não tentar player;
- ID ausente no acervo: mostrar "Media ID não encontrado";
- vídeo lowres indisponível: manter metadados e mostrar aviso no bloco do player;
- segmento inválido: ignorar somente o segmento;
- data inválida: reportar no painel sem impedir exibição do item;
- créditos indisponíveis: estado "não verificado" no painel.

Nenhuma falha opcional deve derrubar a página inteira.

## 12. Segurança

- todo conteúdo vindo de planilhas/JSON deve ser escapado antes de entrar em `innerHTML`;
- parâmetros `id` e `t` devem ser validados antes de uso;
- `t` deve ser convertido para número finito e limitado a valor não negativo;
- URL lowres só pode ser construída a partir de Media ID validado;
- não executar HTML vindo de descrição, créditos ou segmentos.

## 13. Performance

Metas funcionais, não benchmarks rígidos:

- enrichment carregado no máximo uma vez por página;
- busca não deve fazer requisições de rede por resultado;
- related media é calculado apenas na ficha;
- painel de qualidade calcula o acervo em memória após os dados serem carregados;
- nenhum HEAD/GET em massa será feito contra `lowres.tvcultura.com.br`.

Se `media-enrichment.json` crescer a ponto de afetar perceptivelmente o carregamento, a migração para índice particionado ou Supabase será tratada como projeto separado.

## 14. Arquivos previstos

Novos:

```text
data/media-enrichment.json
js/media-enrichment.js
js/media-segments.js
js/media-player.js
js/catalogo-quality.js
js/related-media.js
js/media-detail.js
pages/media.html
pages/qualidade.html
css/media-detail.css
css/catalogo-quality.css
tests/search-ranking.test.mjs
tests/media-segments.test.mjs
tests/catalogo-quality.test.mjs
tests/related-media.test.mjs
tests/media-detail.test.mjs
```

Alterados:

```text
js/dados.js
js/search-engine.js
js/catalogo-ui.js
pages/resultado-busca.html
package.json
```

Outros arquivos podem precisar de ajustes pequenos de versionamento de assets ou navegação, mas mudanças fora deste escopo devem ser evitadas.

## 15. Estratégia de testes

A implementação seguirá testes antes das mudanças de produção.

### Busca

Cobrir:

- ID exato permanece acima de qualquer resultado textual;
- termo em descrição ranqueia corretamente;
- termo apenas em segmento encontra o registro;
- segmento de uma célula com múltiplos IDs preserva o ID que originou a correspondência;
- frase exata recebe bônus;
- resultados empatados preservam estabilidade;
- enriquecimento ausente não quebra a busca.

### Dados / ID

Cobrir:

- `buscarPorMediaId` encontra célula de ID simples;
- encontra cada ID de uma célula múltipla;
- não usa substring acidental;
- ID inválido não encontra registro.

### Segmentos

Cobrir:

- formatação `00:28`, `01:05`, `01:02:03`;
- segmento inválido é ignorado;
- melhor trecho é identificado;
- URL da ficha inclui `t` apenas quando válido;
- ID do segmento é preservado em registros com múltiplos IDs.

### Qualidade

Cobrir:

- IDs inválidos;
- duplicidade em células simples e múltiplas;
- datas inválidas;
- ausência contextual de local/repórter como warning;
- falta de segmentos como info;
- ausência de créditos como info quando a fonte foi carregada;
- créditos indisponíveis como não verificado.

### Relacionados

Cobrir:

- não retornar o próprio item nem IDs associados do mesmo registro;
- assuntos e keywords pesam mais que programa;
- relações abaixo do mínimo são removidas;
- limite de 6;
- ordenação estável.

### Ficha

Cobrir ao menos as funções puras de parsing/estado:

- ID válido;
- ID inválido;
- ID pertencente a célula com múltiplos IDs;
- `t` válido e inválido;
- construção segura do endereço lowres;
- fallback sem enrichment.

## 16. Critérios de aceite

A entrega será considerada funcional quando:

1. a busca atual continuar encontrando registros existentes;
2. resultados forem ordenados por ranking enriquecido sem regressão do ID exato;
3. texto presente apenas em um segmento puder encontrar o Media ID correspondente;
4. o usuário puder abrir o trecho encontrado diretamente no player da ficha;
5. cada Media ID exibido na busca tiver acesso à ficha individual;
6. IDs múltiplos abrirem corretamente a mesma linha editorial, preservando qual ID foi solicitado;
7. a ficha funcionar mesmo sem enrichment;
8. a ficha listar até 6 conteúdos relacionados relevantes;
9. o painel de qualidade identificar problemas sem alterar a fonte;
10. IDs múltiplos forem tratados corretamente para cópia, ficha e duplicidade;
11. falha de créditos, enrichment ou player não impedir o restante da página;
12. a primeira busca aguardar o término ou falha do carregamento opcional de enrichment/créditos;
13. testes novos e testes existentes passarem antes da conclusão.

## 17. Fora de escopo desta entrega

- geração automática de segmentos por visão computacional/IA;
- transcrição automática de áudio;
- OCR automático;
- reconhecimento facial;
- edição da planilha pelo painel de qualidade;
- autenticação administrativa;
- varredura em massa para verificar existência de todos os vídeos lowres;
- migração integral do catálogo para Supabase;
- analytics de interação com player/ficha.

Esses itens poderão ser adicionados depois sem alterar o contrato central definido nesta especificação.

## 18. Sequência recomendada de implementação

1. modelo e loader de `media-enrichment.json`;
2. busca exata de Media ID em `DadosMedia` e testes de IDs múltiplos;
3. testes e extensão do `SearchEngine`;
4. busca e navegação por segmentos/timecodes;
5. ficha individual + player;
6. algoritmo e UI de relacionados;
7. motor e painel de qualidade;
8. integração da tabela de resultados com ficha/timecodes;
9. testes completos e verificação de regressão.

Essa ordem cria primeiro as fundações compartilhadas e reduz retrabalho entre as cinco funcionalidades.
