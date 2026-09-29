import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const reporteresPath = fileURLToPath(new URL("../js/reporteres.js", import.meta.url));

const snapshot = {
  schemaVersion: 1,
  afiliadas: [
    { id: "AFL001", nome: "TV BRASIL CENTRAL", uf: "GOIÁS - GO", cidade: "GOIÂNIA", ativa: true },
    { id: "AFL002", nome: "TVE / ES", uf: "ESPÍRITO SANTO - ES", cidade: "VITÓRIA", ativa: true },
  ],
  reporteres: [
    { id: "REP001", nome: "LUIZA MORAES", afiliadaId: "AFL001", funcao: "REPÓRTER", ativo: true },
  ],
};

function carregar() {
  const sandbox = {
    console,
    URL,
    window: { location: { href: "http://catalogo.test/pages/resultado-busca.html" } },
    document: { currentScript: { src: "http://catalogo.test/js/reporteres.js" } },
    fetch: async () => ({ ok: true, json: async () => snapshot }),
  };
  vm.createContext(sandbox);
  vm.runInContext(
    fs.readFileSync(reporteresPath, "utf8") + "\nglobalThis.__ReporteresMedia = ReporteresMedia;",
    sandbox
  );
  return sandbox.__ReporteresMedia;
}

test("repórter conhecido completa afiliada, cidade e UF quando o registro está sem afiliada", async () => {
  const ReporteresMedia = carregar();
  await ReporteresMedia.carregarCadastro();

  const registros = [{
    ID: "1452B005485",
    REPORTER: "LUIZA MORAES",
    AFILIADA_EMISSORA: "",
    DESCRICAO: "Reportagem",
  }];

  ReporteresMedia.aplicar(registros);

  assert.equal(registros[0].AFILIADA_EMISSORA, "TV BRASIL CENTRAL");
  assert.equal(registros[0]._AFILIADA_ID, "AFL001");
  assert.equal(registros[0]._AFILIADA_CIDADE, "GOIÂNIA");
  assert.equal(registros[0]._AFILIADA_UF, "GOIÁS - GO");
  assert.equal(registros[0]._REPORTER_ID, "REP001");
});

test("afiliada já existente em imgs é preservada", async () => {
  const ReporteresMedia = carregar();
  await ReporteresMedia.carregarCadastro();

  const registros = [{
    ID: "1452B005485",
    REPORTER: "LUIZA MORAES",
    AFILIADA_EMISSORA: "EMISSORA ORIGINAL",
    DESCRICAO: "Reportagem",
  }];

  ReporteresMedia.aplicar(registros);

  assert.equal(registros[0].AFILIADA_EMISSORA, "EMISSORA ORIGINAL");
});

test("afiliada existente reconhecida pela base recebe cidade e UF sem trocar o nome original", async () => {
  const ReporteresMedia = carregar();
  await ReporteresMedia.carregarCadastro();

  const registros = [{
    ID: "1452B005486",
    REPORTER: "",
    AFILIADA_EMISSORA: "TVE / ES",
    DESCRICAO: "Material da afiliada",
  }];

  ReporteresMedia.aplicar(registros);

  assert.equal(registros[0].AFILIADA_EMISSORA, "TVE / ES");
  assert.equal(registros[0]._AFILIADA_ID, "AFL002");
  assert.equal(registros[0]._AFILIADA_CIDADE, "VITÓRIA");
  assert.equal(registros[0]._AFILIADA_UF, "ESPÍRITO SANTO - ES");
});
