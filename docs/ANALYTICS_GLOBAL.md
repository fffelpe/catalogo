# Analytics Global — Catálogo de Mídias

O catálogo já contém a integração frontend e o SQL do analytics global. Até a configuração do Supabase ser concluída, o site continua funcionando normalmente usando `localStorage` como fallback para buscas populares.

## O que é registrado

Cada busca confirmada registra somente:

- termo pesquisado;
- programa, quando a busca ocorre dentro de um programa;
- quantidade de resultados encontrados;
- data/hora gerada pelo banco;
- token temporário de deduplicação.

Não são gravados nome, e-mail, IP, login ou Media ID. O token de deduplicação muda conforme sessão, termo, programa e janela de 10 minutos, e não é usado para identificar uma pessoa.

## 1. Criar o projeto no Supabase

Crie um projeto em https://supabase.com e aguarde o banco ficar disponível.

## 2. Criar a estrutura do analytics

Abra o SQL Editor do Supabase e execute integralmente:

`supabase/analytics.sql`

Esse arquivo:

- cria `catalogo_search_events`;
- cria índices para consultas dos últimos dias;
- ativa RLS;
- remove acesso direto de `anon` e `authenticated` à tabela;
- cria funções RPC para gravação e rankings;
- libera para visitantes anônimos somente registro de busca e rankings agregados;
- mantém relatórios de buscas sem resultado e programas mais consultados restritos a usuários autenticados/service role.

## 3. Obter os dados públicos do projeto

No painel do Supabase, copie:

- Project URL;
- Publishable key (ou anon key em projetos que ainda usam a nomenclatura anterior).

Nunca use a `service_role` key no GitHub Pages ou em qualquer JavaScript público.

## 4. Ativar no catálogo

Edite `js/analytics-config.js`:

```js
window.CATALOGO_ANALYTICS_CONFIG = Object.freeze({
  enabled: true,
  supabaseUrl: "https://SEU-PROJETO.supabase.co",
  supabasePublishableKey: "SUA-PUBLISHABLE-KEY",
  windowDays: 30,
  requestTimeoutMs: 5000
});
```

Depois faça commit/push. O GitHub Pages passará a usar o analytics global automaticamente.

## 5. Como funciona o fallback

Se o Supabase estiver:

- desativado;
- sem configuração;
- fora do ar;
- lento além do timeout;

as buscas continuam funcionando. As buscas populares voltam automaticamente para os dados locais do navegador.

## 6. Deduplicação

A mesma sessão pesquisando o mesmo termo no mesmo programa repetidamente dentro de uma janela de 10 minutos conta apenas uma vez no analytics global.

Exemplo:

- `soja` pesquisada 8 vezes seguidas pelo mesmo navegador → 1 evento global;
- `soja` pesquisada por outro navegador → novo evento;
- `soja` pesquisada novamente após a janela → novo evento.

## 7. Media IDs

Media IDs não entram no ranking de tendências. O formato reconhecido atualmente é:

`4 dígitos + 1 letra + 5 ou 6 dígitos`

Exemplos:

- `1452B004869`
- `1009B064438`

## 8. Consultas úteis no SQL Editor

Total de eventos:

```sql
select count(*) from public.catalogo_search_events;
```

Últimos eventos:

```sql
select termo, programa, resultados, created_at
from public.catalogo_search_events
order by created_at desc
limit 50;
```

Mais buscados em 30 dias:

```sql
select * from public.catalogo_populares_geral(30, 10);
```

Mais buscados no AgroCultura:

```sql
select * from public.catalogo_populares_programa('Agrocultura', 30, 10);
```

## Arquivos envolvidos

- `js/analytics-config.js`
- `js/analytics-global.js`
- `js/buscas-populares.js`
- `js/catalogo-ui.js`
- `supabase/analytics.sql`
- `css/analytics.css`
