import { idValido, pesquisar } from "./outras-emissoras-data.js";
const nav = document.getElementById("listaEmissoras");
const cards = document.getElementById("cardsOutras");
const status = document.getElementById("statusOutras");
const busca = document.getElementById("buscaOutras");
const dialog = document.getElementById("videoOutras");
const video = document.getElementById("playerOutras");
const erro = document.getElementById("erroVideoOutras");
let emissoras = [];
let filtroEmissora = new URLSearchParams(location.search).get("emissora") || "";
let ultimaVersao = "";

function el(tag, classe, valor) {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (valor !== undefined) elemento.textContent = String(valor);
  return elemento;
}
function mostrarEmissoras() {
  nav.replaceChildren();
  const total = emissoras.reduce((n, a) => n + a.registros.length, 0);
  const opcoes = [{nome:"",total,rotulo:"Todas"},...emissoras.map((a) =>
    ({nome:a.nome,total:a.registros.length,rotulo:a.nome}))];
  for (const opcao of opcoes) {
    const botao = el("button","outras-aba",`${opcao.rotulo} (${opcao.total})`);
    botao.type = "button";
    botao.setAttribute("aria-pressed",String(opcao.nome === filtroEmissora));
    botao.addEventListener("click",() => {
      filtroEmissora = opcao.nome;
      const url = new URL(location.href);
      if (filtroEmissora) url.searchParams.set("emissora",filtroEmissora);
      else url.searchParams.delete("emissora");
      history.replaceState(null,"",url);
      mostrarEmissoras();
      mostrarCards();
    });
    nav.append(botao);
  }
}
function mostrarVideo(id) {
  const url = typeof MediaPlayer !== "undefined" ? MediaPlayer.criarUrl(id) : "";
  if (!url) return;
  document.getElementById("videoOutrasTitulo").textContent = "Media ID " + id;
  erro.textContent = "";
  video.src = url;
  dialog.showModal();
  video.play().catch(() => {});
}
async function copiarId(id,botao) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Sem permissão de cópia");
    await navigator.clipboard.writeText(id);
    botao.textContent = "Copiado";
    setTimeout(() => { botao.textContent = "Copiar ID"; },1200);
  } catch {
    botao.textContent = "Cópia indisponível";
  }
}
function cardDe(registro) {
  const card = el("article","outras-card");
  card.append(el("span","outras-card-emissora",registro.EMISSORA));
  card.append(el("h3","outras-card-titulo",registro.IMAGEM || "Descrição não informada"));
  const id = el("div","outras-card-id");
  id.append(el("strong","",registro.ID || "ID não informado"));
  const valido = idValido(registro.ID);
  if (valido) {
    const copiar = el("button","outras-copiar","Copiar ID");
    copiar.type = "button";
    copiar.setAttribute("aria-label","Copiar Media ID " + registro.ID);
    copiar.addEventListener("click",() => copiarId(registro.ID,copiar));
    id.append(copiar);
  }
  card.append(id);
  card.append(el("p","outras-card-data","Data: " + (registro.DATA || "Não informada")));
  const rodape = el("div","outras-card-rodape");
  if (!valido) {
    rodape.append(el("span","outras-sem-video","Vídeo sem ID válido"));
  } else {
    const url = typeof MediaPlayer !== "undefined" ? MediaPlayer.criarUrl(registro.ID) : "";
    if (url) {
      const botao = el("button","outras-card-acao","Reproduzir vídeo ›");
      botao.type = "button";
      botao.addEventListener("click",() => mostrarVideo(registro.ID));
      rodape.append(botao);
    } else {
      // O catálogo HTTPS não pode incorporar vídeo HTTP sem proxy HTTPS configurado.
      const link = el("a","outras-card-acao","Abrir arquivo MP4 ›");
      link.href = `http://lowres.tvcultura.com.br/${registro.ID}.mp4`;
      link.rel = "noopener noreferrer";
      link.target = "_blank";
      link.title = "O acesso ao arquivo pode exigir a rede da TV Cultura";
      rodape.append(link);
    }
  }
  card.append(rodape);
  return card;
}
function mostrarCards() {
  const visiveis = filtroEmissora ? emissoras.filter((a) => a.nome === filtroEmissora) : emissoras;
  const itens = visiveis.flatMap((a) =>
    a.registros.map((r) => ({...r,EMISSORA:a.nome})));
  const resultados = pesquisar(itens,busca.value);
  cards.replaceChildren();
  status.textContent = `${resultados.length} conteúdo${resultados.length===1?"":"s"} ${filtroEmissora ? "em "+filtroEmissora : "em todas as emissoras"}.`;
  if (!resultados.length) {
    const msg = busca.value.trim() ? "Nenhum conteúdo corresponde à pesquisa." :
      filtroEmissora ? "Esta emissora ainda não possui conteúdos cadastrados." :
      "Ainda não há conteúdos cadastrados.";
    cards.append(el("p","outras-vazio",msg));
    return;
  }
  const frag = document.createDocumentFragment();
  resultados.forEach((r) => frag.append(cardDe(r)));
  cards.append(frag);
}
async function carregarDados() {
  try {
    const res = await fetch(`../data/outras-emissoras.json?_=${Date.now()}`,{cache:"no-store"});
    if (!res.ok) throw new Error("Falha HTTP " + res.status);
    const payload = await res.json();
    if (payload.schemaVersion !== 1 || !Array.isArray(payload.emissoras)) throw new Error("Formato inválido");
    const versao = JSON.stringify(payload.emissoras);
    if (versao === ultimaVersao) return;
    ultimaVersao = versao;
    emissoras = payload.emissoras.filter((a) => a && typeof a.nome === "string")
      .map((a) => ({nome:a.nome,registros:Array.isArray(a.registros)?a.registros:[]}));
    if (filtroEmissora && !emissoras.some((a) => a.nome === filtroEmissora)) filtroEmissora = "";
    mostrarEmissoras();
    mostrarCards();
  } catch (e) {
    console.error("Não foi possível atualizar outras emissoras:",e);
    status.textContent = ultimaVersao
      ? "Falha temporária na atualização; dados anteriores preservados."
      : "Não foi possível carregar as imagens de outras emissoras.";
  }
}
busca.addEventListener("input",mostrarCards);
document.getElementById("fecharVideoOutras").addEventListener("click",() => dialog.close());
dialog.addEventListener("close",() => {
  video.pause();
  video.removeAttribute("src");
  video.load();
});
video.addEventListener("error",() => { erro.textContent = "Este vídeo não pôde ser reproduzido."; });
carregarDados();
setInterval(() => { if (!document.hidden) carregarDados(); },60_000);
document.addEventListener("visibilitychange",() => { if (!document.hidden) carregarDados(); });
