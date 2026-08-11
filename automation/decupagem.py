import os
import json
import time
import requests
import gspread
import google.generativeai as genai
from google.oauth2.service_account import Credentials

# ===== CONFIGURAÇÕES =====
GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
GOOGLE_CREDENTIALS_JSON = os.environ["GOOGLE_CREDENTIALS"]  # conteúdo do JSON como texto (via GitHub Secret)

PLANILHA_ID = "1EUIj1PImhdTY78Vt3Kw-ASx3RenEZGZ__1NpPpWrRNs"  # ID real da planilha (do link de edição)
ABA_GID = 0  # aba correspondente a gid=0

BASE_URL_VIDEO = "http://lowres.tvcultura.com.br/"
LIMITE_POR_EXECUCAO = 10

COLUNA_ID = "ID"
COLUNA_DESCRICAO = "DESCRIÇÃO"
COLUNA_DESCRICAO_SUGERIDA = "DESCRIÇÃO_SUGERIDA"

PROMPT = (
    "Decupe este material jornalístico em português: descreva o que aparece "
    "(cenas, local, pessoas, ações) e resuma qualquer fala relevante, em até "
    "3 frases objetivas, no estilo usado em catálogo de arquivo de TV. "
    "Não invente informações que não estejam visíveis/audíveis."
)

# ===== CONEXÃO COM GOOGLE SHEETS (via credencial — necessária pra ESCREVER) =====
escopo = ["https://www.googleapis.com/auth/spreadsheets"]
credenciais_dict = json.loads(GOOGLE_CREDENTIALS_JSON)
credenciais = Credentials.from_service_account_info(credenciais_dict, scopes=escopo)
cliente = gspread.authorize(credenciais)
planilha = cliente.open_by_key(PLANILHA_ID).get_worksheet_by_id(ABA_GID)

# ===== CONEXÃO COM GEMINI =====
genai.configure(api_key=GEMINI_API_KEY)
modelo = genai.GenerativeModel("gemini-2.0-flash")


def encontrar_indices_colunas(cabecalho):
    """Mapeia nome da coluna -> índice, normalizando espaços."""
    mapa = {}
    for i, nome in enumerate(cabecalho):
        nome_limpo = nome.strip()
        mapa[nome_limpo] = i
    return mapa


def baixar_video(id_video):
    url = BASE_URL_VIDEO + id_video.strip() + ".mp4"
    resposta = requests.get(url, timeout=60)
    if resposta.status_code != 200:
        raise Exception(f"Vídeo não encontrado (HTTP {resposta.status_code})")
    caminho_local = f"temp_{id_video.strip()}.mp4"
    with open(caminho_local, "wb") as f:
        f.write(resposta.content)
    return caminho_local


def decupar_video(caminho_local):
    arquivo = genai.upload_file(caminho_local)
    while arquivo.state.name == "PROCESSING":
        time.sleep(3)
        arquivo = genai.get_file(arquivo.name)
    if arquivo.state.name == "FAILED":
        raise Exception("Falha ao processar vídeo no Gemini")
    resposta = modelo.generate_content([arquivo, PROMPT])
    return resposta.text.strip()


def main():
    valores = planilha.get_all_values()
    if not valores:
        print("Planilha vazia.")
        return

    cabecalho = valores[0]
    colunas = encontrar_indices_colunas(cabecalho)

    for coluna_obrigatoria in [COLUNA_ID, COLUNA_DESCRICAO, COLUNA_DESCRICAO_SUGERIDA]:
        if coluna_obrigatoria not in colunas:
            raise Exception(
                f"Coluna '{coluna_obrigatoria}' não encontrada no cabeçalho da planilha. "
                f"Cabeçalhos encontrados: {cabecalho}"
            )

    idx_id = colunas[COLUNA_ID]
    idx_descricao = colunas[COLUNA_DESCRICAO]
    idx_sugerida = colunas[COLUNA_DESCRICAO_SUGERIDA]

    processados = 0

    for i, linha in enumerate(valores[1:], start=2):  # start=2: linha 1 é cabeçalho
        if processados >= LIMITE_POR_EXECUCAO:
            break

        id_video = linha[idx_id].strip() if len(linha) > idx_id else ""
        descricao_atual = linha[idx_descricao].strip() if len(linha) > idx_descricao else ""
        ja_sugerido = linha[idx_sugerida].strip() if len(linha) > idx_sugerida else ""

        if not id_video or descricao_atual or ja_sugerido:
            continue

        print(f"Processando {id_video}...")
        caminho_local = None

        try:
            caminho_local = baixar_video(id_video)
            resultado = decupar_video(caminho_local)
            planilha.update_cell(i, idx_sugerida + 1, resultado)  # gspread é 1-indexado
            print(f"  OK: {resultado[:80]}...")
            processados += 1
        except Exception as e:
            planilha.update_cell(i, idx_sugerida + 1, f"ERRO: {e}")
            print(f"  ERRO: {e}")
        finally:
            if caminho_local and os.path.exists(caminho_local):
                os.remove(caminho_local)

    print(f"\nTotal processado nesta execução: {processados}")


if __name__ == "__main__":
    main()
