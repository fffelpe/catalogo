(() => {
  const CAMPOS_CREDITOS = new Set([
    "CREDITOS_MATERIA",
    "CREDITOS_FONTES",
    "CREDITOS_EQUIPE",
    "CREDITOS_CARGOS"
  ]);

  const normalizar = (valor) => String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");

  function termosDaBusca() {
    const valor = document.getElementById("searchInput")?.value || "";
    return [...new Set(
      normalizar(valor)
        .split(/\s+/)
        .map((termo) => termo.trim())
        .filter((termo) => termo.length >= 2)
    )];
  }

  function destacarTextoNoElemento(elemento, termos) {
    if (!elemento || !termos.length) return;

    const walker = document.createTreeWalker(
      elemento,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
          if (node.parentElement?.closest("mark.busca-destaque, .credito-match-indicador, button")) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nos = [];
    while (walker.nextNode()) nos.push(walker.currentNode);

    nos.forEach((node) => {
      const original = node.nodeValue;
      const normalizado = normalizar(original);
      const intervalos = [];

      termos.forEach((termo) => {
        let inicio = 0;
        while ((inicio = normalizado.indexOf(termo, inicio)) !== -1) {
          intervalos.push([inicio, inicio + termo.length]);
          inicio += termo.length;
        }
      });

      if (!intervalos.length) return;

      intervalos.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
      const unidos = [];
      intervalos.forEach(([ini, fim]) => {
        const ultimo = unidos[unidos.length - 1];
        if (!ultimo || ini > ultimo[1]) unidos.push([ini, fim]);
        else ultimo[1] = Math.max(ultimo[1], fim);
      });

      const fragmento = document.createDocumentFragment();
      let cursor = 0;
      unidos.forEach(([ini, fim]) => {
        if (ini > cursor) fragmento.appendChild(document.createTextNode(original.slice(cursor, ini)));
        const mark = document.createElement("mark");
        mark.className = "busca-destaque";
        mark.textContent = original.slice(ini, fim);
        fragmento.appendChild(mark);
        cursor = fim;
      });
      if (cursor < original.length) fragmento.appendChild(document.createTextNode(original.slice(cursor)));
      node.replaceWith(fragmento);
    });
  }

  function encontrarRegistroPorLinha(tr) {
    if (typeof DadosMedia === "undefined") return null;
    const ids = tr.querySelector(".btn-copiar-id")?.dataset.ids || "";
    const primeiroId = String(ids).split(/[\r\n,;]+/)[0]?.trim().toUpperCase();
    if (!primeiroId) return null;

    return DadosMedia.registros.find((registro) =>
      String(registro.ID || "")
        .split(/[\r\n,;]+/)
        .map((id) => id.trim().toUpperCase())
        .includes(primeiroId)
    ) || null;
  }

  function adicionarIndicadorCredito(tr, consulta) {
    tr.querySelector(".credito-match-indicador")?.remove();
    if (!consulta || typeof SearchEngine === "undefined") return;

    const registro = encontrarRegistroPorLinha(tr);
    if (!registro) return;

    const relevancia = SearchEngine.calcularRelevancia(registro, consulta);
    const encontrouEmCredito = (relevancia.correspondencias || [])
      .some((match) => CAMPOS_CREDITOS.has(match.campo));

    if (!encontrouEmCredito) return;

    const celulaDescricao = tr.querySelector('td[data-label="Descrição"]');
    if (!celulaDescricao) return;

    const aviso = document.createElement("div");
    aviso.className = "credito-match-indicador";
    aviso.textContent = `Correspondência encontrada nos créditos: ${consulta}`;
    celulaDescricao.appendChild(aviso);
  }

  function aplicarDestaques() {
    const tbody = document.getElementById("resultsBody");
    const input = document.getElementById("searchInput");
    if (!tbody || !input) return;

    tbody.querySelectorAll("mark.busca-destaque").forEach((mark) => {
      mark.replaceWith(document.createTextNode(mark.textContent || ""));
    });

    const consulta = input.value.trim();
    const termos = termosDaBusca();
    if (!consulta || !termos.length) {
      tbody.querySelectorAll(".credito-match-indicador").forEach((el) => el.remove());
      return;
    }

    tbody.querySelectorAll("tr").forEach((tr) => {
      tr.querySelectorAll("td").forEach((td) => destacarTextoNoElemento(td, termos));
      adicionarIndicadorCredito(tr, consulta);
    });
  }

  function iniciar() {
    const tbody = document.getElementById("resultsBody");
    const input = document.getElementById("searchInput");
    if (!tbody || !input) return;

    let agendado = false;
    let observer;

    const observar = () => observer.observe(tbody, { childList: true, subtree: true });

    const agendar = () => {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(() => {
        agendado = false;
        observer.disconnect();
        aplicarDestaques();
        observar();
      });
    };

    observer = new MutationObserver(agendar);
    observar();

    input.addEventListener("input", agendar);
    document.getElementById("searchForm")?.addEventListener("submit", () => setTimeout(agendar, 0));
    document.getElementById("loadMoreBtn")?.addEventListener("click", () => setTimeout(agendar, 0));

    agendar();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
