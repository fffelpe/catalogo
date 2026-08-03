import Link from "next/link";
import type { Category } from "@/lib/categories";

/**
 * Card de categoria/programa, desenhado como uma etiqueta de fita de arquivo.
 * Este é o elemento de assinatura do catálogo: cada programa vira uma "fita"
 * catalogada, reforçando a ideia de acervo jornalístico.
 */
export function CategoryTag({ category }: { category: Category }) {
  return (
    <Link
      href={`/categoria/${category.slug}`}
      className="group relative flex min-w-[160px] flex-1 basis-[160px] flex-col gap-3 rounded-tape border border-line bg-white/60 px-4 py-3 transition-colors hover:border-cultura hover:bg-white"
    >
      <span className="flex items-center gap-2 font-mono text-[11px] tracking-wide text-muted">
        <span
          aria-hidden
          className="h-2 w-2 rounded-full bg-cultura transition-transform group-hover:scale-125"
        />
        {category.code}
      </span>
      <span className="font-display text-lg leading-tight text-ink">
        {category.name}
      </span>
    </Link>
  );
}
