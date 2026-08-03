import { Header } from "@/components/Header";
import { CategoryGrid } from "@/components/CategoryGrid";
import { categories } from "@/lib/categories";

export default function HomePage() {
  return (
    <main className="min-h-screen pb-24">
      <Header />
      <div className="mx-auto max-w-5xl px-6 pt-14">
        <CategoryGrid categories={categories} />
      </div>
    </main>
  );
}
