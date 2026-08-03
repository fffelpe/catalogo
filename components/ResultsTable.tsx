import Link from "next/link";
import type { MediaResult } from "@/lib/results";

const columns: { key: keyof MediaResult; label: string; width?: string }[] = [
  { key: "id", label: "ID", width: "w-32" },
  { key: "decupagem", label: "Decupagem / Transcrição" },
  { key: "duracao", label: "Duração", width: "w-28" },
  { key: "data", label: "Data", width: "w-28" },
  { key: "reporter", label: "Repórter", width: "w-44" },
];

export function ResultsTable({ results }: { results: MediaResult[] }) {
  if (results.length === 0) {
    return (
      <p className="rounded-tape border border-dashed border-line px-4 py-6 text-sm text-muted">
        Nenhum material encontrado para essa busca. Tente outro termo ou
        confira a grafia.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-tape border border-ink/80">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="bg-black/5">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`border-l border-t border-line px-3 py-2 font-mono text-xs uppercase tracking-wide text-ink first:border-l-0 ${column.width ?? ""}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((item) => (
            <tr key={item.id} className="group">
              <td className="border-l border-t border-line px-3 py-3 font-mono text-xs text-cultura first:border-l-0">
                <Link href={`/midia/${item.id}`} className="hover:underline">
                  {item.id}
                </Link>
              </td>
              <td className="border-l border-t border-line px-3 py-3 text-ink group-hover:bg-white">
                {item.decupagem}
              </td>
              <td className="border-l border-t border-line px-3 py-3 font-mono text-xs text-muted group-hover:bg-white">
                {item.duracao}
              </td>
              <td className="border-l border-t border-line px-3 py-3 font-mono text-xs text-muted group-hover:bg-white">
                {item.data}
              </td>
              <td className="border-l border-t border-line px-3 py-3 text-ink group-hover:bg-white">
                {item.reporter}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
