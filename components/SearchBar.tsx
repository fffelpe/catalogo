"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    router.push(`/busca?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className="flex items-center gap-3 rounded-tape border border-line bg-white px-4 py-3 shadow-sm"
    >
      <svg
        aria-hidden
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        className="shrink-0 text-muted"
      >
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path
          d="M20 20L16.5 16.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <label htmlFor="catalog-search" className="sr-only">
        Pesquisar no catálogo
      </label>
      <input
        id="catalog-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Pesquisar Ex: queimadas"
        className="w-full bg-transparent font-body text-sm text-ink placeholder:text-muted focus:outline-none"
      />
    </form>
  );
}
