import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function carregarCreditos() {
  const contexto = { console };
  vm.createContext(contexto);
  const fonte = fs.readFileSync(new URL("../js/creditos.js", import.meta.url), "utf8");
  vm.runInContext(fonte + "\nglobalThis.CreditosMedia = CreditosMedia;", contexto);
  return contexto.CreditosMedia;
}

test("botão ausente antes de carregar o cadastro de créditos", () => {
  const creditos = carregarCreditos();
  creditos.registros = {"1452B005350": { materia:"Reportagem" }};
  assert.equal(creditos.temCreditos(["1452B005350"]), false);
});

test("botão apenas quando existe documento de crédito para o ID", () => {
  const creditos = carregarCreditos();
  creditos.carregado = true;
  creditos.registros = {
    "1452B005350": { materia:"Reportagem", creditos:{imagens:"Equipe"} }
  };
  assert.equal(creditos.temCreditos(["1452B005350"]), true);
  assert.equal(creditos.temCreditos(["1452B000000"]), false);
  assert.equal(creditos.temCreditos([]), false);
  assert.equal(creditos.temCreditos(["1452B000000","1452B005350"]), true);
  assert.equal(creditos.temCreditos("1452B005350\n1452B000000"), true);
});

function simularCards({ ids, creditos, falhar = false, iniciarComBotao = false }) {
  const listeners = {};
  let resolver, rejeitar;
  const carregando = new Promise((resolve,reject) => { resolver=resolve; rejeitar=reject; });
  const slot = {
    botao: iniciarComBotao ? {dataset:{ids:ids.join(",")},remove() {slot.botao=null;}} : null,
    querySelector(selector) {
      return selector === ".figma-creditos-trigger" ? this.botao : null;
    },
    appendChild(el) {
      el.remove=()=> {this.botao=null;};
      this.botao=el;
    }
  };
  const linha = {
    nodeType:1, dataset: {figmaCardPronto:"1"},
    querySelector(selector) {
      return selector === ".resultado-creditos-slot" ? slot : null;
    },
    querySelectorAll(selector) {
      if (selector === ".btn-copiar-id[data-ids]") return [{ dataset:{ ids:ids.join("\n") } }];
      if (selector === ".id-media-link") return [];
      return [];
    }
  };
  const tbody = {
    querySelectorAll(selector) {
      return selector === "tr" || selector === "tr.figma-id-card" ? [linha] : [];
    }
  };
  const ctx={
    console:{warn() {}},
    Node:{ELEMENT_NODE:1},
    MutationObserver: class { observe() {} },
    document: {
      readyState: "complete",
      getElementById(id) {return id === "resultsBody" ? tbody : null;},
      createElement(tag) {
        return {tag, dataset:{}, setAttribute(){}};
      },
      addEventListener(type,fn) {listeners[type]=fn;}
    },
    CreditosMedia: {
      carregado: false,
      carregar() {return carregando.then(()=>{
        if(falhar) throw Error("Falha na sincronização");
        this.carregado=true; return creditos;
      });},
      temCreditos(valores) {
        return this.carregado && valores.some(id=>Object.hasOwn(creditos,id));
      }
    },
    MediaIdUtils: {
      extrair(valor) {return String(valor||"").split(/[\r\n,;]+/).map(x=>x.trim()).filter(Boolean);}
    }
  };
  vm.createContext(ctx);
  const js=fs.readFileSync(new URL("../js/figma-id-cards.js",import.meta.url),"utf8");
  vm.runInContext(js,ctx);
  return {slot,resolver,rejeitar};
}

test("cards existentes só mostram o botão depois do carregamento, se houver crédito", async () => {
  const comCredito=simularCards({
    ids:["1452B005350"],creditos:{"1452B005350":{materia:"VT"}}
  });
  assert.equal(comCredito.slot.botao,null);
  comCredito.resolver();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(comCredito.slot.botao?.textContent,"VER CRÉDITOS");
  assert.equal(comCredito.slot.botao?.dataset.ids,"1452B005350");

  const semCredito=simularCards({ids:["1452B005351"],creditos:{"1452B005350":{materia:"VT"}},iniciarComBotao:true});
  semCredito.resolver();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(semCredito.slot.botao,null);

  const variosIds=simularCards({ids:["1452B005351","1452B005350"],creditos:{"1452B005350":{materia:"VT"}}});
  variosIds.resolver();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(variosIds.slot.botao?.dataset.ids,"1452B005351,1452B005350");
});

test("se a leitura de créditos falhar, o botão continua oculto", async () => {
  const falha=simularCards({ids:["1452B005350"],creditos:{"1452B005350":{materia:"VT"}},falhar:true});
  falha.resolver();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(falha.slot.botao,null);
});

test("ambas as páginas carregam os scripts atualizados", () => {
  for(const pagina of ["resultado-busca.html","programa.html"]) {
    const html=fs.readFileSync(new URL("../pages/"+pagina,import.meta.url),"utf8");
    assert.match(html,/js\/creditos\.js\?v=6/);
    assert.match(html,/js\/figma-id-cards\.js\?v=2/);
  }
});
