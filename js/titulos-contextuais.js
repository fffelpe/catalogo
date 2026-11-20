// Títulos exibidos nos cards. Nunca altera descrições nem registros de planilhas.
// Adaptação à consulta apenas quando todos os conceitos principais estão na descrição.
const TitulosContextuais = (() => {
  const IGNORAR = new Set([
    "a","o","as","os","de","do","da","dos","das","no","na","nos","nas","em",
    "e","com","por","pelo","pela","para","um","uma","se","que",
    "quero","preciso","procurando","procuro","busco","buscar","mostre",
    "imagem","imagens","video","videos","cena","cenas","foto","fotos","filmagem","filmagens"
  ]);
  // Equivalências restritas: associação contextual só quando a própria descrição comprova.
  const CONCEITOS = [
    { chave:"prisao_domiciliar", termos:[
      "prisao domiciliar","prisao em casa","preso em casa","presa em casa",
      "detido em casa","detida em casa","preso na propria casa","presa na propria casa",
      "reclusao domiciliar"
    ] },
    { chave:"enchente", termos:[
      "enchente","enchentes","alagamento","alagamentos","inundacao","inundacoes",
      "alagada","alagado","alagadas","alagados"
    ] },
    { chave:"vista_aerea", termos:[
      "vista aerea","vistas aereas","imagem aerea","imagens aereas",
      "vista de cima","visto de cima","sobrevoo","drone"
    ] }
  ];

  function texto(valor) {
    return String(valor ?? "").replace(/\s+/g," ").trim();
  }

  function normalizar(valor) {
    return texto(valor).normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .toLocaleLowerCase("pt-BR").replace(/[^\p{L}\p{N}\s]/gu," ").replace(/\s+/g," ").trim();
  }

  function canonizar(valor) {
    let resultado = " " + normalizar(valor) + " ";
    for (const conceito of CONCEITOS) {
      for (const alias of [...conceito.termos].sort((a,b) => b.length - a.length)) {
        const normalizado = normalizar(alias);
        resultado = resultado.split(" " + normalizado + " ").join(" " + conceito.chave + " ");
      }
    }
    return resultado.trim().replace(/\s+/g," ");
  }

  function termosImportantes(valor) {
    return [...new Set(canonizar(valor).split(" ").filter(
      (palavra) => palavra.length >= 3 && !IGNORAR.has(palavra)
    ))];
  }

  function limparPedido(consulta) {
    return texto(consulta)
      .replace(/\b(?:programa|local|rep[oó]rter|reporter|uf|pgm|editoria):(?:"[^"]*"|'[^']*'|\S+)/gi," ")
      .replace(/^(?:(?:quero|preciso|procuro|busco|mostre(?:-me)?|gostaria de)\s+)?(?:imagens?|v[ií]deos?|cenas?|fotos?|filmagens?)\s+(?:de|do|da|dos|das)\s+/i,"")
      .replace(/^(?:quero|preciso|procuro|busco|mostre(?:-me)?)\s+/i,"")
      .trim();
  }

  function resumir(descricao, limite = 58) {
    const original = texto(descricao);
    if (!original || original === "—") return "Sem descrição";
    let titulo = original
      .split(/\s*(?:[—–|;+]|\s\/{2,}\s)\s*/)[0]
      .replace(/^(?:(?:imagens?|takes?|copi[aã]o|arquivo|gerais?|sonora)\s+(?:de|do|da|em)?\s*)/i,"")
      .split(/\s+(?:(?:com|sob)\s+ilumina[cç][aã]o|iluminad[oa]\s+(?:em|de|na)|(?:durante|pelo|pela)\s+o?\s*outubro\s+rosa)\b/i)[0]
      .replace(/^fachada do pal[aá]cio\b/i,(m)=>m.replace(/\bdo\b/i,"").replace(/\s+/g," ").trim())
      .trim();
    if (!titulo) titulo = original;
    const maximo = Math.max(30, Math.min(90, limite));
    if (titulo.length <= maximo) return titulo;
    const parte = titulo.slice(0,maximo+1);
    const corte = parte.lastIndexOf(" ");
    return (corte >= Math.floor(maximo*.55) ? parte.slice(0,corte) : titulo.slice(0,maximo))
      .replace(/[\s,.;:!?-]+$/g,"") + "…";
  }

  // Não usa score isolado: palavras principais e equivalências têm de estar na descrição.
  // Assim, um resultado apenas parcialmente semelhante não recebe um título que a imagem não confirma.
  function adaptar(descricao, consulta) {
    const pedido = limparPedido(consulta);
    if (!pedido || pedido.length < 6 || pedido.length > 85 ||
        /^\d{4}[a-z]\d{5,6}$/i.test(pedido)) return "";
    const termos = termosImportantes(pedido);
    if (termos.length < 2 || termos.length > 9) return "";
    const presentes = new Set(termosImportantes(descricao));
    if (!termos.every((item)=>presentes.has(item))) return "";
    return pedido.charAt(0).toLocaleUpperCase("pt-BR") + pedido.slice(1);
  }

  return { resumir, adaptar, normalizar, termosImportantes, limparPedido };
})();
