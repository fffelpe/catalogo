import test from "node:test";
import assert from "node:assert/strict";
import { ehErroPermissaoGoogle } from "../scripts/google-sheets-errors.mjs";

test("identifica erros 403 de permissão do Google Sheets", () => {
  assert.equal(ehErroPermissaoGoogle({ response: { status: 403 } }), true);
  assert.equal(ehErroPermissaoGoogle({ code: 403 }), true);
  assert.equal(ehErroPermissaoGoogle({ status: 403 }), true);
});

test("não classifica outros erros como falha de permissão", () => {
  assert.equal(ehErroPermissaoGoogle({ response: { status: 500 } }), false);
  assert.equal(ehErroPermissaoGoogle({ code: "ECONNRESET" }), false);
  assert.equal(ehErroPermissaoGoogle(null), false);
});
