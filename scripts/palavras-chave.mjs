const MEDIA_ID_REGEX = /(?<![A-Z0-9])\d{4}[A-Z]\d{5,6}(?![A-Z0-9])/gi;

const STOPWORDS = new Set([
  "a", "ao", "aos", "aquela", "aquelas", "aquele", "aqueles", "aqui", "as", "ate", "até",
  "com", "como", "da", "das", "de", "dela", "dele", "deles", "depois", "do", "dos", "e", "ela",
  "elas", "ele", "eles", "em", "entre", "era", "essa", "essas", "esse", "esses", "esta", "estao",
  "está", "estão", "este", "estes", "foi", "foram", "ha", "há", "isso", "ja", "já", "mais", "mas",
  "menos", "muito", "na", "nas", "no", "nos", "nova", "novas", "novo", "novos", "num", "numa", "o",
  "os", "ou", "para", "pela", "pelas", "pelo", "pelos", "por", "porque", "que", "se", "segundo",
  "sem", "ser", "seu", "seus", "sua", "suas", "tambem", "também", "tem", "têm", "ter", "um", "uma",
  "umas", "uns", "vai", "vao", "vão", "voce", "você"
]);

const TERMOS_TECNICOS = new Set([
  "audio", "áudio", "cabeca", "cabeça", "close", "comp", "coletiva", "divulgacao", "divulgação",
  "edicao", "edição", "gc", "gerais", "geral", "id", "imagem", "imagens", "interna", "internas",
  "locucao", "locução", "off", "producao", "produção", "pt", "reportagem", "reporter", "repórter",
  "roda", "sem", "sonora", "take", "tempo", "volta"
]);

const ROTULOS_NAO_PESSOA = new Set([
  "imagem", "imagens", "producao", "produção", "edicao", "edição", "divulgacao", "divulgação",
  "reportagem", "reporter", "repórter", "cinegrafista", "camera", "câmera", "off", "volta", "roda"
]);

function limparTexto(valor) {
  return String(valor ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[“”„]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function chave(valor) {
  return limparTexto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function lista(valor) {
  return Array.isArray(valor) ? valor.map(limparTexto).filter(Boolean) : [];
}

function unicos(valores = []) {
  const vistos = new Set();
  const saida = [];
  for (const valor of valores) {
    const texto = limparTexto(valor);
    const normalizado = chave(texto);
    if (!texto || !normalizado || vistos.has(normalizado)) continue;
    vistos.add(normalizado);
    saida.push(texto);
  }
  return saida;
}

function keyword(valor) {
  return limparTexto(valor)
    .replace(/^[-–—:;,./\s]+|[-–—:;,./\s]+$/g, "")
    .replace(/\((?:id\s+gigante|sem\s+gc|sem\s+gerador)[^)]*\)/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function ehTecnico(valor) {
  const normalizado = chave(valor);
  if (!normalizado) return true;
  if (/^(?:pt\s*\d+|id\s+gigante|sem\s+gc|volta(?:\s+sem\s+gc)?|take(?:\s+close)?|off)$/.test(normalizado)) {
    return true;
  }
  const tokens = normalizado.split(" ").filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => TERMOS_TECNICOS.has(token));
}

function pareceKeyword(valor) {
  const termo = keyword(valor);
  if (!termo || ehTecnico(termo)) return false;
  if (/^\d+(?:[.,]\d+)?$/.test(termo)) return false;
  if (/\b(?:sem\s+gc|id\s+gigante)\b/.test(chave(termo))) return false;
  return termo.length >= 3;
}

function extrairIds(valor) {
  const texto = limparTexto(valor).toUpperCase();
  return unicos(texto.match(MEDIA_ID_REGEX) || []).map((id) => id.toUpperCase());
}

function extrairChunksDescricao(descricao) {
  const original = limparTexto(descricao);
  if (!original) return [];

  return unicos(
    original
      .split(/\s*(?:\+|\|+|\/{2,}|;|\n)\s*/g)
      .map((parte) => parte.replace(/\([^)]*\)/g, " "))
      .map(keyword)
      .filter(pareceKeyword)
      .filter((termo) => {
        const normalizado = chave(termo);
        return !/^(?:off|volta|sonora|entrevista|reportagem|reporter|imagens?|producao|edicao|take|gerais?)\b/.test(normalizado);
      })
      .filter((termo) => termo.split(/\s+/).length <= 10)
  );
}

function tokensInformativos(texto, pessoas = []) {
  const tokensPessoas = new Set(
    pessoas
      .flatMap((pessoa) => chave(pessoa).split(" "))
      .filter(Boolean)
  );

  const contagem = new Map();
  const tokens = limparTexto(texto).toLocaleLowerCase("pt-BR").match(/[\p{L}][\p{L}'’-]{2,}/gu) || [];
  for (const tokenOriginal of tokens) {
    const token = keyword(tokenOriginal);
    const normalizado = chave(token);
    if (!normalizado || normalizado.length < 4) continue;
    if (STOPWORDS.has(normalizado) || TERMOS_TECNICOS.has(normalizado) || tokensPessoas.has(normalizado)) continue;
    contagem.set(token, (contagem.get(token) || 0) + 1);
  }

  return [...contagem.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length || a[0].localeCompare(b[0], "pt-BR"))
    .map(([termo]) => termo);
}

function pessoaLimpa(valor) {
  let texto = limparTexto(valor)
    .replace(/^\s*(?:rep[óo]rter(?:a)?|reportagem|imagens?|produ[cç][aã]o|edi[cç][aã]o)\s*[:\-–—]\s*/i, "")
    .trim();

  const comCargo = texto.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (comCargo) texto = comCargo[1].trim();

  return texto.replace(/^[\s:;,./-]+|[\s:;,./-]+$/g, "").replace(/\s+/g, " ").trim();
}

function parecePessoa(valor) {
  const texto = pessoaLimpa(valor);
  if (!texto || /\d/.test(texto)) return false;
  const normalizado = chave(texto);
  if (!normalizado) return false;
  if ([...ROTULOS_NAO_PESSOA].some((termo) => normalizado === chave(termo))) return false;
  if (/\b(?:off|volta|sem gc|divulgacao|imagens|producao|edicao|reportagem)\b/.test(normalizado)) return false;
  const partes = texto.split(/\s+/).filter(Boolean);
  return partes.length >= 2 && partes.length <= 7 && partes.every((parte) => /^[\p{L}'’.\-]+$/u.test(parte));
}

function extrairPessoas(registro = {}, credito = {}) {
  const pessoas = [];
  const adicionar = (valor) => {
    const nome = pessoaLimpa(valor);
    if (parecePessoa(nome)) pessoas.push(nome);
  };

  String(registro.REPORTER || "")
    .split(/[\r\n,;+|]+|\s+\/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach(adicionar);

  for (const fonte of Array.isArray(credito?.fontes) ? credito.fontes : []) {
    adicionar(fonte?.nome);
  }

  for (const valor of Object.values(credito?.creditos || {})) {
    (Array.isArray(valor) ? valor : [valor]).filter(Boolean).forEach(adicionar);
  }

  const texto = [credito?.materia, credito?.textoCompleto].filter(Boolean).join(" | ");
  const padraoReporter = /\bREP[ÓO]RTER(?:A)?\s+([\p{Lu}ÁÉÍÓÚÂÊÔÃÕÇ][\p{L}'’.\-]+(?:\s+[\p{Lu}ÁÉÍÓÚÂÊÔÃÕÇ][\p{L}'’.\-]+){1,4})/gu;
  for (const match of texto.matchAll(padraoReporter)) adicionar(match[1]);

  return unicos(pessoas);
}

function resolverAfiliada(registro = {}, afiliadas = {}) {
  const listaAfiliadas = Array.isArray(afiliadas?.afiliadas) ? afiliadas.afiliadas : [];
  const listaReporteres = Array.isArray(afiliadas?.reporteres) ? afiliadas.reporteres : [];
  const emissora = chave(registro.AFILIADA_EMISSORA);

  if (emissora) {
    const exata = listaAfiliadas.find((item) => chave(item?.nome) === emissora);
    if (exata) return exata;
  }

  const nomesReporter = String(registro.REPORTER || "")
    .split(/[\r\n,;+|]+|\s+\/\s+/)
    .map((item) => chave(item))
    .filter(Boolean);

  const ids = unicos(
    listaReporteres
      .filter((item) => nomesReporter.includes(chave(item?.nome)))
      .map((item) => item?.afiliadaId)
      .filter(Boolean)
  );

  if (ids.length !== 1) return null;
  return listaAfiliadas.find((item) => chave(item?.id) === chave(ids[0])) || null;
}

function extrairLugares(registro = {}, credito = {}, afiliadas = {}) {
  const lugares = [];
  const local = limparTexto(registro.LOCAL);
  if (local) lugares.push(local);

  const afiliada = resolverAfiliada(registro, afiliadas);
  if (afiliada) {
    const cidade = limparTexto(afiliada.cidade);
    const uf = limparTexto(afiliada.uf);
    if (cidade) lugares.push(cidade);
    if (uf) lugares.push(uf);
    const sigla = uf.match(/-\s*([A-Z]{2})$/i)?.[1]?.toUpperCase();
    if (cidade && sigla) lugares.push(`${cidade} - ${sigla}`);
  }

  const textoCreditos = [credito?.materia, credito?.textoCompleto].filter(Boolean).join(" | ");
  const padraoCidadeUf = /(?:^|[|;,])\s*([\p{L}][\p{L}\s'.-]{2,35}?)\s*\/\s*([A-Z]{2})\b/gu;
  for (const match of textoCreditos.matchAll(padraoCidadeUf)) {
    const cidade = limparTexto(match[1]);
    if (cidade && !ehTecnico(cidade)) lugares.push(`${cidade} / ${match[2]}`);
  }

  return unicos(lugares);
}

function camposAnteriores(anterior = {}, campo, campoManual, campoAuto) {
  const atual = lista(anterior?.[campo]);
  const automaticosAnteriores = new Set(lista(anterior?.[campoAuto]).map(chave));
  const explicitamenteManuais = lista(anterior?.[campoManual]);
  const inferidosManuais = atual.filter((item) => !automaticosAnteriores.has(chave(item)));
  return unicos([...explicitamenteManuais, ...inferidosManuais]);
}

function limitarKeywords(candidatos, limite = 15) {
  const saida = [];
  const vistos = new Set();
  for (const candidato of candidatos) {
    const termo = keyword(candidato);
    const normalizado = chave(termo);
    if (!pareceKeyword(termo) || vistos.has(normalizado)) continue;
    vistos.add(normalizado);
    saida.push(termo);
    if (saida.length >= limite) break;
  }
  return saida;
}

function gerarKeywordsAutomaticas(registro = {}, credito = {}, pessoas = [], lugares = []) {
  const candidatos = [];
  candidatos.push(...extrairChunksDescricao(registro.DESCRICAO));

  const editoria = keyword(registro.EDITORIA);
  if (pareceKeyword(editoria) && chave(editoria) !== "geral") candidatos.push(editoria);

  const textoCreditos = [
    credito?.materia,
    credito?.textoCompleto,
    ...(Array.isArray(credito?.fontes) ? credito.fontes.map((fonte) => fonte?.cargo) : []),
  ].filter(Boolean).join(" | ");
  candidatos.push(...tokensInformativos(textoCreditos, pessoas));

  let automaticas = limitarKeywords(candidatos, 15);

  if (automaticas.length < 8) {
    const metadadosComplementares = [
      registro.PROGRAMA,
      registro.AFILIADA_EMISSORA,
      ...lugares,
    ];
    automaticas = limitarKeywords([...automaticas, ...metadadosComplementares], 15);
  }

  if (automaticas.length < 8) {
    const corpusGeral = [registro.DESCRICAO, textoCreditos].filter(Boolean).join(" | ");
    automaticas = limitarKeywords([...automaticas, ...tokensInformativos(corpusGeral, pessoas)], 15);
  }

  return automaticas;
}

function unirCampo(manual, automatico) {
  return unicos([...manual, ...automatico]);
}

export function gerarEnriquecimentoRegistro(registro = {}, credito = {}, anterior = {}, afiliadas = {}) {
  const pessoasAuto = extrairPessoas(registro, credito);
  const lugaresAuto = extrairLugares(registro, credito, afiliadas);
  const keywordsAuto = gerarKeywordsAutomaticas(registro, credito, pessoasAuto, lugaresAuto);
  const subjectsAuto = unicos([
    pareceKeyword(registro.EDITORIA) && chave(registro.EDITORIA) !== "geral" ? keyword(registro.EDITORIA) : ""
  ]);

  const manualKeywords = camposAnteriores(anterior, "keywords", "manualKeywords", "autoKeywords");
  const manualSubjects = camposAnteriores(anterior, "subjects", "manualSubjects", "autoSubjects");
  const manualPeople = camposAnteriores(anterior, "people", "manualPeople", "autoPeople");
  const manualPlaces = camposAnteriores(anterior, "places", "manualPlaces", "autoPlaces");

  return {
    keywords: unirCampo(manualKeywords, keywordsAuto),
    manualKeywords,
    autoKeywords: keywordsAuto,
    subjects: unirCampo(manualSubjects, subjectsAuto),
    manualSubjects,
    autoSubjects: subjectsAuto,
    people: unirCampo(manualPeople, pessoasAuto),
    manualPeople,
    autoPeople: pessoasAuto,
    places: unirCampo(manualPlaces, lugaresAuto),
    manualPlaces,
    autoPlaces: lugaresAuto,
    segments: Array.isArray(anterior?.segments) ? anterior.segments : [],
  };
}

export function gerarEnriquecimentoCatalogo({
  registros = [],
  creditos = {},
  anterior = { schemaVersion: 1, items: {} },
  afiliadas = {},
  generatedAt,
} = {}) {
  const items = {};
  const itensAnteriores = anterior?.items && typeof anterior.items === "object" ? anterior.items : {};
  const mapaCreditos = creditos && typeof creditos === "object" ? creditos : {};

  for (const registro of Array.isArray(registros) ? registros : []) {
    const ids = extrairIds(registro?.ID);
    for (const id of ids) {
      const credito = mapaCreditos[id] || {};
      items[id] = gerarEnriquecimentoRegistro(
        { ...registro, ID: id },
        credito,
        itensAnteriores[id] || {},
        afiliadas
      );
    }
  }

  return {
    schemaVersion: 1,
    generatedAt: generatedAt || new Date().toISOString(),
    items,
  };
}
