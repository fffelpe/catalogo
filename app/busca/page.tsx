import { BuscaView } from "@/components/BuscaView";
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
    <main className="min-h-screen overflow-x-auto pb-16 pt-8">
      <BuscaView initialQuery={query} results={results} />
    </main>
  );
}
