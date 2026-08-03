import type { Category } from "@/lib/categories";
import { CategoryTag } from "./CategoryTag";

export function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <section aria-label="Editorias e programas">
      <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-muted">
        Editorias &amp; Programas
      </h2>
      <div className="flex flex-wrap gap-3">
        {categories.map((category) => (
          <CategoryTag key={category.slug} category={category} />
        ))}
      </div>
    </section>
  );
}
