"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

// Assets exportados diretamente do Figma (node 46:14). Estas URLs expiram em
// ~7 dias — quando isso acontecer, exporte novamente em Figma > camada >
// Export > PNG/SVG, salve em /public e troque os caminhos abaixo.
const imgCultura1 =
  "https://www.figma.com/api/mcp/asset/4d0456ac-a131-4d5f-93d8-2e74cecf597a.png";
const imgRectangle1 =
  "https://www.figma.com/api/mcp/asset/a995ea8a-19bf-4cd7-b150-bbf81e199b9f.svg";
const imgVector =
  "https://www.figma.com/api/mcp/asset/925cc3df-bf90-41c5-9226-5a2b368d146e.svg";

/**
 * Recriação 1:1 do frame "Home" (node 46:14) do Figma.
 * Posicionamento absoluto intencional — reflete exatamente as coordenadas do
 * design (1112x363). Ver README para o racional de manter fidelidade total
 * em vez de um layout responsivo neste momento.
 */
export function HomeView() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    router.push(`/busca?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <div className="relative mx-auto" style={{ width: 1112, height: 363 }}>
      {/* Logo */}
      <div className="absolute left-[11px] size-[129px] top-0">
        <img
          alt=""
          className="absolute inset-0 max-w-none object-cover pointer-events-none size-full"
          src={imgCultura1}
        />
      </div>

      {/* Título */}
      <div className="-translate-x-1/2 -translate-y-1/2 [word-break:break-word] absolute flex flex-col font-body justify-center leading-[0] h-[21px] left-[319px] not-italic text-[32px] text-black text-center top-[47.5px] w-[342px]">
        <p className="leading-[normal]">CATÁLOGO DE MÍDIAS</p>
      </div>
      <div className="-translate-x-1/2 -translate-y-1/2 [word-break:break-word] absolute flex flex-col font-body justify-center leading-[0] h-[21px] left-[230px] not-italic text-[24px] text-black text-center top-[87.5px] w-[164px]">
        <p className="leading-[normal]">JORNALISMO</p>
      </div>

      {/* Barra de busca — fundo/ícone iguais ao Figma, input real por cima pra ficar funcional */}
      <form
        onSubmit={handleSubmit}
        className="absolute h-[64px] left-[130px] top-[142px] w-[719px]"
      >
        <img
          alt=""
          className="absolute block inset-0 max-w-none size-full pointer-events-none"
          src={imgRectangle1}
        />
        <div className="absolute left-[15px] top-[20px] w-[26px] h-[24px] pointer-events-none">
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector} />
        </div>
        <label htmlFor="search" className="sr-only">
          Pesquisar
        </label>
        <input
          id="search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Pesquisar EX: queimadas"
          className="absolute inset-0 bg-transparent pl-14 pr-4 font-body text-base text-black placeholder:text-black/60 focus:outline-none"
        />
      </form>

      {/* Categorias / programas — mesmas posições e tamanhos do Figma */}
      <CategoryText href="/categoria/agrocultura" left={79} top={255.5} w={158} h={13}>
        Agrocultura
      </CategoryText>
      <CategoryText href="/categoria/materia-de-capa" left={102} top={357.5} w={194} h={11}>
        Matéria de Capa
      </CategoryText>
      <CategoryText href="/categoria/reporter-eco" left={400} top={295} w={152} h={14}>
        Repórter Eco
      </CategoryText>
      <CategoryText href="/categoria/documentarios" left={421} top={255} w={184} h={12}>
        Documentários
      </CategoryText>
      <CategoryText href="/categoria/jornal-da-cultura" left={814.5} top={254} w={223} h={14}>
        Jornal da Cultura
      </CategoryText>
      <CategoryText href="/categoria/jornal-da-tarde" left={1019.5} top={253.5} w={185} h={13}>
        Jornal da Tarde
      </CategoryText>
      <CategoryText href="/categoria/roda-viva" left={554} top={293} w={128} h={24}>
        Roda Viva
      </CategoryText>
      <CategoryText href="/categoria/opiniao" left={61} top={298.5} w={102} h={19}>
        Opinião
      </CategoryText>
      <CategoryText href="/categoria/cartao-verde" left={240.5} top={255} w={163} h={12}>
        Cartão Verde
      </CategoryText>
      <CategoryText href="/categoria/de-olho-no-voto" left={612} top={255} w={182} h={16}>
        De olho no voto
      </CategoryText>
      <CategoryText href="/categoria/linhas-cruzadas" left={217} top={297.5} w={210} h={9}>
        Linhas Cruzadas
      </CategoryText>
      <CategoryText href="/categoria/esta-manha" left={692} top={293.5} w={144} h={17}>
        Esta Manhã
      </CategoryText>
      <CategoryText href="/categoria/legiao-estrangeira" left={887.5} top={292.5} w={219} h={23}>
        Legião Estrangeira
      </CategoryText>
      <CategoryText href="/categoria/giro-economico" left={306} top={340} w={182} h={24}>
        Giro Econômico
      </CategoryText>

      {/* Login */}
      <Link
        href="/login"
        className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-body h-[21px] justify-center leading-[0] left-[1011px] not-italic text-[24px] text-black top-[29.5px] w-[69px] hover:underline"
      >
        <p className="leading-[normal]">Login</p>
      </Link>
    </div>
  );
}

function CategoryText({
  href,
  left,
  top,
  w,
  h,
  children,
}: {
  href: string;
  left: number;
  top: number;
  w: number;
  h: number;
  children: string;
}) {
  return (
    <Link
      href={href}
      style={{ left, top, width: w, height: h }}
      className="-translate-x-1/2 -translate-y-1/2 [word-break:break-word] absolute flex flex-col font-body justify-center leading-[0] not-italic text-[24px] text-black text-center hover:underline"
    >
      <p className="leading-[normal]">{children}</p>
    </Link>
  );
}
