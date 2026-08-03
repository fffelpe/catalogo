export type MediaResult = {
  id: string;
  /** Decupagem/transcrição resumida do material */
  decupagem: string;
  /** Duração no formato mm:ss */
  duracao: string;
  data: string;
  reporter: string;
};

// Dados de exemplo — substituir por uma consulta real (Supabase, etc.) quando o
// backend estiver pronto. Mantém o mesmo shape que a UI espera.
export const mockResults: MediaResult[] = [
  {
    id: "ECO-0231",
    decupagem: "Queimadas atingem áreas de preservação no interior de SP",
    duracao: "02:14",
    data: "12/07/2026",
    reporter: "Marina Sales",
  },
  {
    id: "ECO-0198",
    decupagem: "Entrevista com bombeiros sobre combate a incêndios florestais",
    duracao: "04:32",
    data: "05/07/2026",
    reporter: "Carlos Andrade",
  },
  {
    id: "AGR-0087",
    decupagem: "Produtores rurais relatam perdas por queimadas na safra",
    duracao: "01:58",
    data: "28/06/2026",
    reporter: "Marina Sales",
  },
];
