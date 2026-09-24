import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const mediaIdPath = fileURLToPath(new URL("../js/media-id.js", import.meta.url));
const detailPath = fileURLToPath(new URL("../js/media-detail.js", import.meta.url));

function carregar() {
  assert.ok(fs.existsSync(detailPath), "media-detail.js deve existir");
  const sandbox = {
    console,
    URLSearchParams,
    document: { addEventListener() {} }
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(mediaIdPath, "utf8"), sandbox);
  vm.runInContext(fs.readFileSync(detailPath, "utf8"), sandbox);
  vm.runInContext("globalThis.__MediaDetail = MediaDetail;", sandbox);
  return sandbox.__MediaDetail;
}

test("interpreta Media ID e timecode válidos da URL", () => {
  const MediaDetail = carregar();
  assert.deepEqual(
    JSON.parse(JSON.stringify(MediaDetail.parseParametros("?id=1452B004869&t=28.5"))),
    { id: "1452B004869", start: 28.5 }
  );
});

test("rejeita ID inválido e limita timecode a valor não negativo", () => {
  const MediaDetail = carregar();
  assert.deepEqual(
    JSON.parse(JSON.stringify(MediaDetail.parseParametros("?id=%3Cscript%3E&t=-9"))),
    { id: "", start: 0 }
  );
});

test("lista IDs associados sem repetir o ID principal", () => {
  const MediaDetail = carregar();
  assert.deepEqual(
    JSON.parse(JSON.stringify(MediaDetail.idsAssociados(
      { ID: "1452B004869 / 1452B004870" },
      "1452B004869"
    ))),
    ["1452B004870"]
  );
});
