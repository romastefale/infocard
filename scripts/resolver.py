import asyncio
import html
import json
import os
import re
import sys
import traceback
import urllib.error
import urllib.request

import telethon
from telethon import TelegramClient, errors, utils
from telethon.sessions import StringSession
from telethon.tl.functions.contacts import ResolveUsernameRequest
from telethon.tl.types import Channel, PeerUser, User

USERNAME_VALIDO = re.compile(r"[A-Za-z0-9_]{1,32}")
CHAT_VALIDO = re.compile(r"-?[0-9]{1,16}")


def esc(valor):
    return html.escape(str(valor), quote=False)


def enviar(chat_id, texto):
    corpo = json.dumps({"chat_id": int(chat_id), "text": texto, "parse_mode": "HTML"}).encode()
    pedido = urllib.request.Request(
        f"https://api.telegram.org/bot{os.environ['BOT_TOKEN']}/sendMessage",
        data=corpo,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(pedido, timeout=20) as resposta:
            retorno = json.load(resposta)
    except urllib.error.HTTPError as erro:
        retorno = json.load(erro)
    if not retorno.get("ok"):
        raise RuntimeError(f"sendMessage falhou: {retorno.get('error_code')} {retorno.get('description')}")


def descrever(resultado, alvo):
    if isinstance(resultado.peer, PeerUser):
        entidade = next(u for u in resultado.users if u.id == resultado.peer.user_id)
    else:
        entidade = resultado.chats[0]
    foto = getattr(entidade, "photo", None)
    usernames = [u.username for u in (getattr(entidade, "usernames", None) or []) if getattr(u, "active", False)]
    info = {
        "consultado": alvo,
        "usernames": usernames,
        "id": utils.get_peer_id(entidade),
        "username": getattr(entidade, "username", None),
        "foto": foto is not None and not type(foto).__name__.endswith("Empty"),
    }
    if isinstance(entidade, User):
        info["tipo"] = "bot" if entidade.bot else "usuário"
        info["nome"] = " ".join(p for p in (entidade.first_name, entidade.last_name) if p)
        marcas = (("verificado", "verified"), ("premium", "premium"), ("scam", "scam"), ("fake", "fake"), ("restrito", "restricted"), ("conta excluída", "deleted"))
    elif isinstance(entidade, Channel):
        info["tipo"] = "supergrupo" if entidade.megagroup else "canal"
        info["nome"] = entidade.title
        marcas = (("verificado", "verified"), ("scam", "scam"), ("fake", "fake"), ("restrito", "restricted"))
    else:
        info["tipo"] = "grupo"
        info["nome"] = entidade.title
        marcas = ()
    info["marcas"] = [rotulo for rotulo, atributo in marcas if getattr(entidade, atributo, False)]
    return info


def relatorio(info):
    linhas = [
        "<b>Lido via MTProto (contacts.resolveUsername)</b>",
        f"Tipo: {esc(info['tipo'])}",
        f"ID: <code>{esc(info['id'])}</code>",
        f"Nome: {esc(info['nome'])}" if info["nome"] else "Nome: (vazio)",
    ]
    linhas.append(f"Consultado: @{esc(info['consultado'])}")
    if info["username"]:
        linhas.append(f"Username principal: @{esc(info['username'])}")
    if info["usernames"]:
        linhas.append("Usernames ativos: " + ", ".join(f"@{esc(u)}" for u in info["usernames"]))
    if info["marcas"]:
        linhas.append(f"Marcas: {esc(', '.join(info['marcas']))}")
    linhas.append(f"Foto de perfil: {'sim' if info['foto'] else 'não'}")
    if info["tipo"] in ("usuário", "bot"):
        linhas.append(f'<a href="tg://user?id={info["id"]}">Abrir perfil</a>')
    return "\n".join(linhas)


def falha(alvo, motivo):
    return f"<b>Não foi possível ler</b>\nEntrada: @{esc(alvo)} (username)\n{esc(motivo)}"


async def resolver(alvo):
    cliente = TelegramClient(StringSession(), int(os.environ["API_ID"]), os.environ["API_HASH"])
    await cliente.start(bot_token=os.environ["BOT_TOKEN"])
    try:
        return await cliente(ResolveUsernameRequest(alvo))
    finally:
        await cliente.disconnect()


async def principal():
    print("telethon", telethon.__version__)
    alvo = os.environ.get("ALVO", "").strip().lstrip("@")
    chat = os.environ.get("CHAT_ID", "").strip()
    if chat and not CHAT_VALIDO.fullmatch(chat):
        print("CHAT_ID inválido")
        return 1
    if not USERNAME_VALIDO.fullmatch(alvo):
        texto = falha(alvo or "(vazio)", "Username inválido: use de 1 a 32 letras, números ou _.")
        print("username inválido")
        codigo = 1
    else:
        try:
            info = descrever(await resolver(alvo), alvo)
            print(json.dumps(info, ensure_ascii=False))
            texto = relatorio(info)
            codigo = 0
        except errors.UsernameNotOccupiedError:
            texto = falha(alvo, "Esse username não existe.")
            print("UsernameNotOccupiedError")
            codigo = 1
        except errors.UsernameInvalidError:
            texto = falha(alvo, "Username inválido segundo o Telegram.")
            print("UsernameInvalidError")
            codigo = 1
        except errors.FloodWaitError as erro:
            texto = falha(alvo, f"Limite do Telegram atingido: aguarde {erro.seconds} s.")
            print("FloodWaitError", erro.seconds)
            codigo = 1
        except errors.RPCError as erro:
            texto = falha(alvo, f"O Telegram respondeu {type(erro).__name__}: {erro}")
            print("RPCError", type(erro).__name__, erro)
            codigo = 1
        except Exception as erro:
            traceback.print_exc()
            texto = falha(alvo, f"Erro inesperado: {type(erro).__name__}: {erro}")
            codigo = 1
    if chat:
        enviar(chat, texto)
        print("mensagem enviada ao chat")
    return codigo


if __name__ == "__main__":
    sys.exit(asyncio.run(principal()))
