import gspread
import requests
import google.generativeai as genai
import time
from google.oauth2.service_account import Credentials

# ===== CONFIGURAÇÕES =====
GEMINI_API_KEY = "AQ.Ab8RN6LPhszWy4qjwOTOfCF_sPdgV1A8pMl6OzZzHz_GzAJHJw"
CREDENCIAIS_JSON = "optical-realm-448218-j6-5d78c731d4ed.json"  # arquivo baixado no Passo 2
PLANILHA_NOME = "imgs"  # nome exato da planilha no Google Sheets
ABA_NOME = "ims"  # nome exato da aba
BASE_URL = "http://lowres.tvcultura.com.br/"
LIMITE_POR_EXECUCAO = 10

# Colunas (ajuste se a ordem for diferente)
COL_ID = 0
COL_DESCRICAO = 1
COL_DATA = 2
COL_PROGRAMA = 3
COL_DESCRICAO_SUGERIDA = 4

# ===== CONEXÃO COM GOOGLE SHEETS =====
escopo = ["https://www.googleapis.com/auth/spreadsheets"]
credenciais = Credentials.from_service_account_file(CREDENCIAIS_JSON, scopes=escopo)
cliente = gspread.authorize(credenciais)
planilha = cliente.open(imgs).worksheet(imgs)

# ===== CONEXÃO COM GEMINI =====
genai.configure(api_key=AQ.Ab8RN6LPhszWy4qjwOTOfCF_sPdgV1A8pMl6OzZzHz_GzAJHJw)
modelo = genai.GenerativeModel("gemini-2.0-flash")

PROMPT = (
    "Decupe este material jornalístico em português: descreva o que aparece "
    "(cenas, local, pessoas, ações) e resuma qualquer fala relevante, em até "
    "3 frases objetivas, no estilo usado em catálogo de arquivo de TV. "
    "Não invente informações que não estejam visíveis/audíveis."
)

def baixar_video(id_video):
    url = BASE_URL + id_video + ".mp4"
    resposta = requests.get(url, timeout=60)
    if resposta.status_code != 200:
        raise Exception(f"Vídeo não encontrado (HTTP {resposta.status_code})")
    caminho_local = f"temp_{id_video}.mp4"
    with open(caminho_local, "wb") as f:
        f.write(resposta.content)
    return caminho_local

def decupar_video(caminho_local):
    arquivo = genai.upload_file(caminho_local)
    # aguarda o processamento
    while arquivo.state.name == "PROCESSING":
        time.sleep(3)
        arquivo = genai.get_file(arquivo.name)
    if arquivo.state.name == "FAILED":
        raise Exception("Falha ao processar vídeo no Gemini")
    resposta = modelo.generate_content([arquivo, PROMPT])
    return resposta.text.strip()

def main():
    linhas = planilha.get_all_values()
    processados = 0

    for i, linha in enumerate(linhas[1:], start=2):  # start=2 pois linha 1 é cabeçalho
        if processados >= LIMITE_POR_EXECUCAO:
            break

        id_video = linha[COL_ID].strip() if len(linha) > COL_ID else ""
        descricao_atual = linha[COL_DESCRICAO].strip() if len(linha) > COL_DESCRICAO else ""
        ja_sugerido = linha[COL_DESCRICAO_SUGERIDA].strip() if len(linha) > COL_DESCRICAO_SUGERIDA else ""

        if not id_video or descricao_atual or ja_sugerido:
            continue

        print(f"Processando {id_video}...")

        try:
            caminho = baixar_video(id_video)
            resultado = decupar_video(caminho)
            planilha.update_cell(i, COL_DESCRICAO_SUGERIDA + 1, resultado)
            print(f"  OK: {resultado[:80]}...")
            processados += 1
        except Exception as e:
            planilha.update_cell(i, COL_DESCRICAO_SUGERIDA + 1, f"ERRO: {e}")
            print(f"  ERRO: {e}")
        finally:
            import os
            if os.path.exists(f"temp_{id_video}.mp4"):
                os.remove(f"temp_{id_video}.mp4")

    print(f"\nTotal processado: {processados}")

if __name__ == "__main__":
    main()