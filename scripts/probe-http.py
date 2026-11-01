import os
import struct
import time
import urllib.error
import urllib.request

ALVOS = [
    "https://venus.web.telegram.org/api",
    "https://venus.web.telegram.org/apiw",
    "http://149.154.167.51:80/api",
    "http://149.154.167.51:80/apiw",
    "http://149.154.167.91:80/api",
]


def pacote():
    nonce = os.urandom(16)
    msg_id = int(time.time() * 2**32) & ~3
    dados = struct.pack("<I", 0xBE7E8EF1) + nonce
    return struct.pack("<QQI", 0, msg_id, len(dados)) + dados, nonce


for alvo in ALVOS:
    corpo, nonce = pacote()
    pedido = urllib.request.Request(alvo, data=corpo, headers={"Content-Type": "application/octet-stream"})
    try:
        with urllib.request.urlopen(pedido, timeout=15) as resposta:
            status, cabecalhos, dados = resposta.status, dict(resposta.headers), resposta.read()
    except urllib.error.HTTPError as erro:
        status, cabecalhos, dados = erro.code, dict(erro.headers), erro.read()
    except Exception as erro:
        print(alvo, "FALHOU", type(erro).__name__, erro)
        continue
    construtor = struct.unpack_from("<I", dados, 20)[0] if len(dados) >= 24 else None
    print(alvo, "status", status, "bytes", len(dados), "server", cabecalhos.get("Server"), "inicio", dados[:40].hex(), "construtor", hex(construtor) if construtor is not None else None, "nonce igual", dados[24:40] == nonce)
