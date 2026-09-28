# Integração de afiliadas e repórteres para enriquecimento de metadados

Data: 2026-09-28

## Objetivo

Integrar a planilha Google Sheets `fonte_afiliadas_reporteres` ao catálogo como base oficial de referência para repórteres e afiliadas/emissoras. A integração deve enriquecer metadados já existentes no catálogo sem sobrescrever informações editoriais originais da planilha `imgs`.

A base será usada para relacionar nomes de repórteres já identificados no catálogo — vindos de `imgs`, créditos ou descrição — à afiliada/emissora e UF correspondentes.

## Escopo

Incluído:

- ler automaticamente as abas `afiliadas` e `repórteres` da planilha `fonte_afiliadas_reporteres`;
- gerar um snapshot local versionado em `data/afiliadas-reporteres.json`;
- substituir o cadastro manual `data/reporteres.json` como fonte oficial;
- enriquecer registros com repórter, afiliada/emissora, UF e status ativo/inativo;
- preservar valores já existentes em `imgs`;
- usar créditos e descrição como fontes auxiliares de identificação de repórteres;
- aplicar a mesma lógica nas páginas de busca, programa e ficha individual do Media ID;
- manter repórteres e afiliadas inativos válidos para materiais históricos;
- acrescentar testes para geração, validação e enriquecimento.

Fora do escopo:

- escrever de volta na planilha `imgs`;
- autenticação ou área administrativa;
- seleção manual de repórteres;
- alteração automática de dados existentes na planilha `imgs`;
- geração por IA de descrições visuais ou timecodes nesta etapa.

## Fonte oficial

A planilha `fonte_afiliadas_reporteres` passa a ser a única fonte oficial para cadastro estruturado de repórteres e afiliadas.

Estrutura esperada:

### Aba `afiliadas`

- `AFILIADA_ID`
- `NOME`
- `UF`
- `ATIVA`

### Aba `repórteres`

- `ID`
- `REPÓRTER`
- `AFILIADA_ID`
- `FUNÇÃO`
- `ATIVO`

## Arquitetura

A integração será feita por snapshot local, seguindo o padrão já usado pelo catálogo.

Fluxo:

```text
Google Sheets
fonte_afiliadas_reporteres
        |
        +-- afiliadas!A:D
        +-- repórteres!A:E
                |
                v
scripts/gerar-afiliadas-reporteres.mjs
                |
                v
data/afiliadas-reporteres.json
                |
                v
js/reporteres.js
                |
                v
registros enriquecidos no navegador
```

O navegador não consultará diretamente o Google Sheets.

## Formato do snapshot

Estrutura proposta:

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-09-28T22:00:00.000Z",
  "afiliadas": [
    {
      "id": "AFL001",
      "nome": "TV BRASIL CENTRAL",
      "uf": "GOIÁS - GO",
      "ativa": true
    }
  ],
  "reporteres": [
    {
      "id": "REP023",
      "nome": "MARIANA RABELLO",
      "afiliadaId": "AFL001",
      "funcao": "REPÓRTER",
      "ativo": true
    }
  ]
}
```

## Regras de normalização

Antes de comparar nomes e IDs:

- remover espaços extras;
- remover quebras de linha e caracteres invisíveis;
- comparar sem diferença entre maiúsculas e minúsculas;
- comparar sem diferença de acentuação;
- preservar a grafia oficial da planilha para exibição;
- não alterar o valor original salvo em `imgs`.

## Regras de enriquecimento

A ordem de prioridade dos dados será:

1. valor já existente na `imgs`;
2. informação estruturada nos créditos;
3. identificação de repórter no texto dos créditos;
4. identificação de repórter na descrição;
5. relação com a base `fonte_afiliadas_reporteres` para completar afiliada, UF, IDs e status.

### Regra de preservação

Se `REPORTER` ou `AFILIADA_EMISSORA` já estiverem preenchidos no registro vindo de `imgs`, esses valores não serão substituídos pela base de referência.

### Complemento de afiliada

Se o repórter for identificado e `AFILIADA_EMISSORA` estiver vazia, o catálogo pode preencher a afiliada relacionada no cadastro.

### Complemento de UF

Quando houver afiliada relacionada, o catálogo pode expor a UF da base de referência como metadado enriquecido.

### Múltiplos repórteres

Se vários repórteres identificados pertencerem à mesma afiliada, a afiliada pode ser preenchida automaticamente.

Se os repórteres pertencerem a afiliadas diferentes, nenhuma afiliada será inferida automaticamente quando o campo original estiver vazio.

### Afiliada sem repórter

Encontrar uma afiliada não autoriza o sistema a escolher um repórter. O campo `REPORTER` permanece vazio se nenhum nome tiver sido identificado.

## Status ativo/inativo

`ATIVO = NÃO` e `ATIVA = NÃO` não excluem registros.

Repórteres e afiliadas inativos:

- continuam reconhecidos;
- continuam pesquisáveis;
- continuam vinculados a materiais históricos;
- podem ser exibidos com estilo visual atenuado;
- recebem indicador textual `Inativo`/`Inativa` quando a interface comportar essa informação.

## Metadados internos de enriquecimento

O enriquecimento pode adicionar campos internos ao objeto do registro, sem alterar a estrutura original da `imgs`:

```text
_REPORTER_ID
_AFILIADA_ID
_REPORTER_ATIVO
_AFILIADA_ATIVA
_AFILIADA_UF
_ENRIQUECIMENTO_ORIGEM
```

Esses campos serão usados para busca, filtros, apresentação e futuras camadas de enriquecimento.

## Mudanças previstas no código

### Novo

- `scripts/gerar-afiliadas-reporteres.mjs`
- `data/afiliadas-reporteres.json` — gerado automaticamente
- testes para o novo snapshot e para enriquecimento de repórteres/afiliadas

### Atualizar

- `js/reporteres.js`
- `pages/media.html`
- `.github/workflows/sincronizar-planilhas.yml`
- `package.json`

### Descontinuar

- `data/reporteres.json` deixa de ser fonte oficial e poderá ser removido após validação da nova integração.

## Integração com GitHub Actions

O workflow de sincronização deverá:

1. instalar dependências;
2. executar testes da integração;
3. sincronizar as planilhas existentes;
4. gerar `data/afiliadas-reporteres.json`;
5. gerar os snapshots atuais do catálogo;
6. validar os snapshots;
7. publicar os arquivos alterados em `data/`;
8. permitir que o workflow de deploy publique o catálogo normalmente.

O deploy atual já publica a pasta `data`, portanto não é necessária infraestrutura adicional.

## Validações do gerador

A geração deve falhar sem substituir o último snapshot válido quando ocorrer qualquer uma destas situações:

- `AFILIADA_ID` duplicado;
- `REPORTER_ID` duplicado;
- repórter apontando para uma afiliada inexistente;
- nome de afiliada vazio;
- nome de repórter vazio;
- `ATIVA` diferente de `SIM` ou `NÃO`;
- `ATIVO` diferente de `SIM` ou `NÃO`;
- estrutura de planilha incompatível com o schema esperado.

## Compatibilidade com as páginas

### Busca

A página de busca continua usando o mecanismo atual, mas recebe registros enriquecidos antes da renderização e filtragem.

### Programa

A página de programa usa a mesma fonte e a mesma regra de enriquecimento da busca.

### Ficha do Media ID

`pages/media.html` passa a carregar o módulo de repórteres para que a ficha individual exiba os mesmos metadados enriquecidos encontrados nas demais páginas.

## Busca e filtros

O enriquecimento deve permitir que a busca encontre um material também pelos metadados relacionados quando esses dados forem conhecidos pelo catálogo, por exemplo:

```text
MARIANA RABELLO
TV BRASIL CENTRAL
GOIÁS - GO
```

Isso não exige alterar o conteúdo original da planilha `imgs`.

## Tratamento de erros

- Se o snapshot de afiliadas/repórteres estiver indisponível no navegador, o catálogo continua funcionando com os dados originais do Media ID.
- Falha no enriquecimento não deve impedir a exibição do acervo.
- Erros de geração no GitHub Actions devem impedir a publicação de um snapshot inválido.
- O último snapshot válido permanece disponível até a próxima sincronização bem-sucedida.

## Testes

A implementação deve cobrir pelo menos:

- geração correta do JSON a partir das duas abas;
- normalização de nomes e caracteres invisíveis;
- rejeição de IDs duplicados;
- rejeição de afiliada inexistente em um repórter;
- conversão de `SIM`/`NÃO` para booleanos;
- identificação de repórter existente;
- preenchimento de afiliada quando o campo original está vazio;
- preservação de afiliada já existente em `imgs`;
- múltiplos repórteres da mesma afiliada;
- múltiplos repórteres de afiliadas diferentes;
- manutenção de repórteres inativos;
- degradação segura quando o snapshot não puder ser carregado.

## Critérios de aceite

A integração estará concluída quando:

1. o GitHub Actions gerar automaticamente `data/afiliadas-reporteres.json` a partir da planilha;
2. `js/reporteres.js` usar esse snapshot como fonte oficial;
3. `data/reporteres.json` não for mais necessário para o funcionamento normal;
4. valores existentes em `imgs` nunca forem sobrescritos pelo enriquecimento;
5. repórteres identificados puderem complementar afiliada e UF;
6. repórteres e afiliadas inativos continuarem reconhecidos;
7. busca, programa e ficha individual apresentarem dados consistentes;
8. testes automatizados cobrirem geração, validação e regras principais de enriquecimento.

## Evolução futura

A mesma arquitetura poderá ser reutilizada para outras bases de referência, como:

- localidades e aliases;
- organizações e órgãos públicos;
- personagens e fontes recorrentes;
- assuntos e editorias normalizadas;
- descrição visual e segmentos de vídeo;
- palavras-chave enriquecidas por IA com origem e confiança registradas.
