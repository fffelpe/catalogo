# Catálogo de Mídias — Jornalismo TV Cultura

Catálogo web para organizar e localizar imagens/vídeos usados na cobertura jornalística da TV Cultura, filtrando por editoria, programa e tags.

## Stack

- [Next.js 14](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com)
- Design vindo do Figma: [MEDIA ASSET MANAGEMENT](https://www.figma.com/design/27mKXumGUYisittlGwHzQG/MEDIA-ASSET-MANAGEMENT)

## Rodando localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

## Estrutura

```
app/
  layout.tsx       # fontes + estilos globais
  page.tsx         # tela Home
  globals.css
components/
  Header.tsx       # logo + título + busca + login
  SearchBar.tsx     # campo de busca (client component)
  CategoryTag.tsx   # "etiqueta de fita" — elemento de assinatura visual
  CategoryGrid.tsx  # grid de programas/editorias
lib/
  categories.ts     # dados das categorias (mover pra um banco depois)
```

## Conceito visual

O catálogo é pensado como um **acervo de fitas de arquivo jornalístico**: cada
programa/editoria vira uma etiqueta com um código estilo timecode (`AGR-01`,
`CUL-01`...) em fonte monoespaçada, remetendo a como o material era catalogado
fisicamente. Paleta: verde institucional (`#0E7A54`), papel (`#F7F5EF`) e tinta
(`#171A16`), com âmbar (`#E2A33B`) reservado para destaques (ex: "ao vivo").

## Próximos passos sugeridos

- [ ] Renomear os demais frames no Figma (Resultado de Busca, Detalhe da Mídia, Login) e repetir o processo de conversão
- [ ] Página `/busca` com grid de resultados de imagens
- [ ] Página `/categoria/[slug]` listando mídias de um programa
- [ ] Conectar `lib/categories.ts` a um banco (ex: Supabase) com metadados reais de cada mídia (crédito, licença, data, editoria)
- [ ] Autenticação na página `/login` para fluxo editorial (rascunho → aprovado → publicado)
