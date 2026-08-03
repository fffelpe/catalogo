import Link from "next/link";
import { SearchBar } from "./SearchBar";

export function Header() {
  return (
    <header className="mx-auto flex max-w-5xl flex-col gap-8 px-6 pt-12">
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <CulturaMark />
          <div>
            <p className="font-display text-2xl leading-tight text-ink sm:text-3xl">
              Catálogo de Mídias
            </p>
            <p className="font-mono text-sm uppercase tracking-widest text-cultura">
              Jornalismo
            </p>
          </div>
        </div>

        <Link
          href="/login"
          className="mt-2 font-mono text-sm text-ink underline decoration-line decoration-2 underline-offset-4 transition-colors hover:decoration-cultura"
        >
          Login
        </Link>
      </div>

      <div className="max-w-xl">
        <SearchBar />
      </div>
    </header>
  );
}

/** Marca simples inspirada na cruz do logo original — trocar pelo SVG oficial da TV Cultura quando disponível. */
function CulturaMark() {
  return (
    <svg
      aria-hidden
      width="40"
      height="40"
      viewBox="0 0 40 40"
      className="shrink-0"
    >
      <rect x="14" y="0" width="12" height="40" fill="#0E7A54" />
      <rect x="0" y="14" width="40" height="12" fill="#0E7A54" />
    </svg>
  );
}
