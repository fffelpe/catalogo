(() => {
  const ALIASES = ["tv brasil central"];
  let materiaisAtuais = [];

  const normalizar = (valor) => String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();

  const escapeHtml = (valor) => String(valor ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));

  const pertenceAfiliada = (valor) => normalizar(valor).includes("tv brasil central");
  const extrairIds = (valor) => String(valor || "").toUpperCase().match(/\d{4}B\d{6}/g) || [];

  function registrosDaAfiliada(registros) {
    return (registros || []).filter((registro) => pertenceAfiliada(registro.AFILIADA_EMISSORA));
  }

  function idsDeItens(lista) {
    const ids = new Set();
    for (const item of lista || []) {
      const candidatos = Array.isArray(item.ids) && item.ids.length ? item.ids : extrairIds(item.id);
      candidatos.forEach((id) => ids.add(String(id || "").toUpperCase().trim()));
    }
    return ids;
  }

  function classificarPorTexto(registro) {
    const base = normalizar([registro.DESCRICAO, registro.EDITORIA, registro.PROGRAMA, registro.PGM].join(" "));
    if (/\bstand\s*-?\s*up\b/.test(base) || /\bnoticia\b/.test(base) || /\bnota\b/.test(base) || /\bpassagem\b/.test(base)) return "noticia";
    return "vt";
  }

  function classificarRegistro(registro, idsVts, idsNoticias) {
    const ids = extrairIds(registro.ID);
    if (ids.some((id) => idsNoticias.has(id))) return "noticia";
    if (ids.some((id) => idsVts.has(id))) return "vt";
    return classificarPorTexto(registro);
  }

  function reporteresDaAfiliada(registros) {
    const nomes = new Set();
    registros.forEach((registro) => {
      const nome = String(registro.REPORTER || "").trim();
      if (nome) nomes.add(nome);
    });
    return [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  function renderizarReporteres(nomes) {
    const lista = document.getElementById("afiliadaReporteresLista");
    if (!lista) return;
    if (!nomes.length) {
      lista.innerHTML = '<div class="afiliada-vazio">Nenhum repórter identificado para esta afiliada nos registros atuais.</div>';
      return;
    }
    lista.innerHTML = nomes.map((nome) => `<span class="afiliada-reporter">${escapeHtml(nome)}</span>`).join("");
  }

  function nomeTipo(tipo) {
    return tipo === "noticia" ? "Notícia / stand-up" : "VT";
  }

  function renderizarMateriais(filtro = "todos") {
    const tbody = document.getElementById("afiliadaMateriaisBody");
    if (!tbody) return;

    const lista = filtro === "todos"
      ? materiaisAtuais
      : materiaisAtuais.filter((item) => item._tipoAfiliada === filtro);

    if (!lista.length) {
      tbody.innerHTML = '<tr><td colspan="8">Nenhum material encontrado nesta categoria.</td></tr>';
      return;
    }

    tbody.innerHTML = lista.map((item) => `
      <tr>
        <td>${escapeHtml(extrairIds(item.ID).join(" / ") || item.ID)}</td>
        <td><span class="afiliada-tipo">${escapeHtml(nomeTipo(item._tipoAfiliada))}</span></td>
        <td>${escapeHtml(item.DESCRICAO)}</td>
        <td>${escapeHtml(item.REPORTER)}</td>
        <td>${escapeHtml(item.DATA)}</td>
        <td>${escapeHtml(item.LOCAL)}</td>
        <td>${escapeHtml(item.PROGRAMA)}</td>
        <td>${escapeHtml(item.EDITORIA)}</td>
      </tr>`).join("");
  }

  function ativarFiltros() {
    document.querySelectorAll("[data-filtro]").forEach((botao) => {
      botao.addEventListener("click", () => {
        document.querySelectorAll("[data-filtro]").forEach((b) => b.classList.remove("ativo"));
        botao.classList.add("ativo");
        renderizarMateriais(botao.dataset.filtro);
      });
    });
  }

  async function carregarAcervoAgroOpcional() {
    try {
      const resposta = await fetch(`../data/agrocultura-acervo.json?v=${Date.now()}`, { cache: "no-store" });
      if (!resposta.ok) return null;
      const dados = await resposta.json();
      return {
        vts: Array.isArray(dados.vts) ? dados.vts : [],
        noticias: Array.isArray(dados.noticias) ? dados.noticias : [],
      };
    } catch (erro) {
      console.warn("Acervo estruturado do AgroCultura indisponível; usando somente a planilha imgs.", erro);
      return null;
    }
  }

  async function iniciar() {
    const status = document.getElementById("afiliadaStatus");

    try {
      const [registros, acervo] = await Promise.all([
        DadosMedia.carregarCSV(),
        carregarAcervoAgroOpcional(),
      ]);

      const afiliada = registrosDaAfiliada(registros);
      const idsVts = idsDeItens(acervo?.vts || []);
      const idsNoticias = idsDeItens(acervo?.noticias || []);

      materiaisAtuais = afiliada.map((registro) => ({
        ...registro,
        _tipoAfiliada: classificarRegistro(registro, idsVts, idsNoticias),
      }));

      const todosIds = new Set();
      materiaisAtuais.forEach((registro) => extrairIds(registro.ID).forEach((id) => todosIds.add(id)));
      const vts = new Set();
      const noticias = new Set();
      materiaisAtuais.forEach((registro) => {
        const destino = registro._tipoAfiliada === "noticia" ? noticias : vts;
        extrairIds(registro.ID).forEach((id) => destino.add(id));
      });
      const reporteres = reporteresDaAfiliada(materiaisAtuais);

      document.getElementById("afiliadaTotalIds").textContent = todosIds.size;
      document.getElementById("afiliadaTotalVts").textContent = vts.size;
      document.getElementById("afiliadaTotalNoticias").textContent = noticias.size;
      document.getElementById("afiliadaTotalReporteres").textContent = reporteres.length;

      renderizarReporteres(reporteres);
      renderizarMateriais("todos");
      ativarFiltros();

      if (status) {
        status.textContent = afiliada.length
          ? `${afiliada.length} registro(s) vinculados à TV Brasil Central no catálogo.`
          : "Nenhum registro da TV Brasil Central foi encontrado na planilha imgs.";
      }
    } catch (erro) {
      console.error("Erro ao carregar página da TV Brasil Central:", erro);
      ["afiliadaTotalIds", "afiliadaTotalVts", "afiliadaTotalNoticias", "afiliadaTotalReporteres"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = "0";
      });
      if (status) status.textContent = "Não foi possível carregar os dados da afiliada.";
      renderizarReporteres([]);
      renderizarMateriais("todos");
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
