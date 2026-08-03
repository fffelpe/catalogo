"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { MediaResult } from "@/lib/results";

// Assets exportados diretamente do Figma (node 46:12). Expiram em ~7 dias —
// exporte novamente em Figma > camada > Export e salve em /public quando isso
// acontecer.
const imgCultura1 =
  "https://www.figma.com/api/mcp/asset/2c2623e1-f9ed-43f6-8f7e-22fd133a869f.png";
const imgRectangle1 =
  "https://www.figma.com/api/mcp/asset/f42caa6c-278c-405d-8c7a-d3eeedcfb5a0.svg";
const imgLupa =
  "https://www.figma.com/api/mcp/asset/913aac14-8f85-49a8-bbe6-37a245d7b687.svg";

const columns = [
  { key: "id", label: "ID", width: 136 },
  { key: "decupagem", label: "Decupagem / Transcrição", width: 589 },
  { key: "duracao", label: "Duração", width: 176 },
  { key: "data", label: "Data", width: 140 },
  { key: "reporter", label: "Repórter", width: 256 },
] as const;

/**
 * Recriação 1:1 do frame "RESULTADO DA BUSCA" (node 46:12) do Figma.
 * A tabela no Figma só tinha a linha de cabeçalho (é um template) — as linhas
 * de dados abaixo seguem o mesmo padrão visual (bordas #b9b9b9) só que com
 * fundo branco em vez do cinza do cabeçalho.
 */
export function BuscaView({
  initialQuery,
  results,
}: {
  initialQuery: string;
  results: MediaResult[];
}) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    router.push(query.trim() ? `/busca?q=${encodeURIComponent(query.trim())}` : "/busca");
  }

  return (
    <div
      className="relative mx-auto"
      style={{ width: 1113, minHeight: 310, paddingBottom: 40 }}
    >
      {/* Logo */}
      <div className="absolute left-0 size-[111px] top-0">
        <img
          alt=""
          className="absolute inset-0 max-w-none object-cover pointer-events-none size-full"
          src={imgCultura1}
        />
      </div>

      {/* Título */}
      <div className="-translate-x-1/2 -translate-y-1/2 [word-break:break-word] absolute flex flex-col font-body justify-center leading-[0] h-[25px] left-[292.5px] not-italic text-[32px] text-black text-center top-[42.5px] w-[341px]">
        <p className="leading-[normal]">CATÁLOGO DE MÍDIAS</p>
      </div>
      <div className="-translate-x-1/2 -translate-y-1/2 [word-break:break-word] absolute flex flex-col font-body justify-center leading-[0] h-[23px] left-[202px] not-italic text-[24px] text-black text-center top-[79.5px] w-[160px]">
        <p className="leading-[normal]">JORNALISMO</p>
      </div>

      {/* Barra de busca */}
      <form
        onSubmit={handleSubmit}
        className="absolute h-[54px] left-[122px] top-[140px] w-[721px]"
      >
        <img
          alt=""
          className="absolute block inset-0 max-w-none size-full pointer-events-none"
          src={imgRectangle1}
        />
        <div className="absolute left-[16px] top-[14px] w-[29px] h-[27px] pointer-events-none">
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgLupa} />
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

      {/* Label "Resultado da Busca:" */}
      <div className="-translate-x-1/2 -translate-y-1/2 [word-break:break-word] absolute flex flex-col font-body justify-center leading-[0] h-[16px] left-[138px] not-italic text-[20px] text-black text-center top-[242px] w-[200px]">
        <p className="leading-[normal]">
          Resultado da Busca{initialQuery && `: "${initialQuery}"`}
        </p>
      </div>

      {/* Tabela */}
      <div className="absolute left-[16px] top-[279px]">
        <div className="bg-white border border-black border-solid overflow-clip rounded-[4px] w-fit">
          <table className="border-collapse text-left font-body">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    style={{ width: column.width }}
                    className="border-l border-t border-[#b9b9b9] bg-[#f0f0f0] px-3 py-2.5 text-[16px] font-semibold uppercase text-black first:border-l-0"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="border-l-0 border-t border-[#b9b9b9] px-3 py-4 text-black/60"
                  >
                    Nenhum material encontrado para essa busca.
                  </td>
                </tr>
              ) : (
                results.map((item) => (
                  <tr key={item.id}>
                    <td className="border-l-0 border-t border-[#b9b9b9] px-3 py-3 text-black">
                      <Link href={`/midia/${item.id}`} className="hover:underline">
                        {item.id}
                      </Link>
                    </td>
                    <td className="border-l border-t border-[#b9b9b9] px-3 py-3 text-black">
                      {item.decupagem}
                    </td>
                    <td className="border-l border-t border-[#b9b9b9] px-3 py-3 text-black">
                      {item.duracao}
                    </td>
                    <td className="border-l border-t border-[#b9b9b9] px-3 py-3 text-black">
                      {item.data}
                    </td>
                    <td className="border-l border-t border-[#b9b9b9] px-3 py-3 text-black">
                      {item.reporter}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Login */}
      <Link
        href="/login"
        className="-translate-y-1/2 [word-break:break-word] absolute flex flex-col font-body h-[21px] justify-center leading-[0] left-[1044px] not-italic text-[20px] text-black top-[30.5px] w-[69px] hover:underline"
      >
        <p className="leading-[normal]">Login</p>
      </Link>
    </div>
  );
}
