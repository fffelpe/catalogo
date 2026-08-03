export type Category = {
  /** Código curto estilo etiqueta de fita, usado como identificador visual */
  code: string;
  slug: string;
  name: string;
  /** Editoria pai — usada futuramente para agrupar/filtrar */
  editoria?: string;
};

// Extraído do frame "Home" no Figma (node 46:14).
// Ao adicionar um programa novo, siga o padrão de code: três letras + número sequencial.
export const categories: Category[] = [
  { code: "AGR-01", slug: "agrocultura", name: "Agrocultura" },
  { code: "CAP-01", slug: "materia-de-capa", name: "Matéria de Capa" },
  { code: "ECO-01", slug: "reporter-eco", name: "Repórter Eco" },
  { code: "DOC-01", slug: "documentarios", name: "Documentários" },
  { code: "CUL-01", slug: "jornal-da-cultura", name: "Jornal da Cultura" },
  { code: "TAR-01", slug: "jornal-da-tarde", name: "Jornal da Tarde" },
  { code: "ROD-01", slug: "roda-viva", name: "Roda Viva" },
  { code: "OPI-01", slug: "opiniao", name: "Opinião" },
  { code: "VER-01", slug: "cartao-verde", name: "Cartão Verde" },
  { code: "VOT-01", slug: "de-olho-no-voto", name: "De Olho no Voto" },
  { code: "LIN-01", slug: "linhas-cruzadas", name: "Linhas Cruzadas" },
  { code: "MAN-01", slug: "esta-manha", name: "Esta Manhã" },
  { code: "LEG-01", slug: "legiao-estrangeira", name: "Legião Estrangeira" },
  { code: "GIR-01", slug: "giro-economico", name: "Giro Econômico" },
];
