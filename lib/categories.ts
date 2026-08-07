// Define as categorias baseadas nas colunas do imgs.csv
export type ProgramaCategoria = string;
export type AfiliadaCategoria = string;

export interface CategoriaFiltro {
    programa?: ProgramaCategoria;
    afiliada?: AfiliadaCategoria;
    dataInicio?: string;
    dataFim?: string;
}