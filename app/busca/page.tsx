import { Header } from "@/components/Header";
import { ResultsTable } from "@/components/ResultsTable";
import { mockResults } from "@/lib/results";

export default function BuscaPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const query = searchParams.q?.trim() ?? "";

  const results = query
    ? mockResults.filter((item) =>
        `${item.decupagem} ${item.id} ${item.reporter}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
    : mockResults;

  return (
    <main className="min-h-screen pb-24">
      <Header />
      <div className="mx-auto max-w-5xl px-6 pt-14">
        <h1 className="mb-4 font-mono text-sm uppercase tracking-widest text-muted">
          Resultado da busca
          {query && (
            <>
              : <span className="text-ink">"{query}"</span>
            </>
          )}
        </h1>
        <ResultsTable results={results} />
      </div>
    </main>
  );
}
