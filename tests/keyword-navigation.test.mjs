import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

async function carregarModulo() {
  let codigo = '';
  try {
    codigo = await fs.readFile(new URL('../js/keyword-navigation.js', import.meta.url), 'utf8');
  } catch {
    assert.fail('keyword-navigation.js ainda não existe');
  }

  const contexto = {
    URLSearchParams,
    encodeURIComponent,
    MediaIdUtils: {
      extrair(valor) {
        return String(valor || '')
          .split(/[\r\n,;+\/|&]+/)
          .map((id) => id.trim())
          .filter(Boolean);
      }
    }
  };
  vm.createContext(contexto);
  vm.runInContext(`${codigo}\nthis.__KeywordNavigation = KeywordNavigation;`, contexto);
  return contexto.__KeywordNavigation;
}

test('cria URL codificada para uma palavra-chave clicada', async () => {
  const KeywordNavigation = await carregarModulo();
  assert.equal(
    KeywordNavigation.criarUrl('agricultura familiar'),
    'resultado-busca.html?keyword=agricultura%20familiar'
  );
});

test('filtra apenas IDs que possuem exatamente a palavra-chave', async () => {
  const KeywordNavigation = await carregarModulo();
  const registros = [
    { ID: 'A001' },
    { ID: 'A002' },
    { ID: 'A003' },
    { ID: 'A004;A005' }
  ];
  const porId = {
    A001: { keywords: ['Café', 'agricultura familiar'] },
    A002: { keywords: ['cafeicultura'] },
    A003: { keywords: ['cafe'] },
    A004: { keywords: ['Safra'] },
    A005: { keywords: ['CAFÉ'] }
  };

  const encontrados = KeywordNavigation.filtrarPorKeyword(
    registros,
    'café',
    (id) => porId[id] || null
  );

  assert.deepEqual(encontrados.map((item) => item.ID), ['A001', 'A003', 'A004;A005']);
});

test('não confunde palavra-chave exata com termo apenas parecido', async () => {
  const KeywordNavigation = await carregarModulo();
  assert.equal(KeywordNavigation.corresponde(['cafeicultura'], 'café'), false);
  assert.equal(KeywordNavigation.corresponde(['Café'], 'cafe'), true);
});
