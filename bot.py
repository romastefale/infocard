import asyncio
import base64
import html
import os
import re
import struct
from urllib.request import Request, urlopen

from aiogram import Bot, Dispatcher
from aiogram.types import InlineQuery, InlineQueryResultArticle, InputTextMessageContent

TOKEN = os.environ["TOKEN"]
CHAT = os.environ.get("CHAT")


def page(username: str) -> str:
    request = Request(f"https://t.me/{username}", headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(request, timeout=10) as response:
        return response.read().decode("utf-8", "replace")


def photo(source: str) -> str:
    match = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)', source, re.I)
    if not match:
        match = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', source, re.I)
    if not match:
        raise ValueError("profile photo not found")
    return html.unescape(match.group(1))


async def file(bot: Bot, url: str) -> str:
    if not CHAT:
        raise RuntimeError("Defina CHAT para o chat privado de cache do bot")
    message = await bot.send_photo(chat_id=CHAT, photo=url, disable_notification=True)
    return message.photo[-1].file_id


def decode(value: str) -> bytes:
    value += "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value)


def dialog(data: bytes) -> int:
    # Telegram Bot API file_id uses a binary serialized FileId.  Search the
    # decoded payload for the dialog-photo source marker and read its int64
    # dialog identifier.  The marker values below are the known TDLib
    # PhotoSizeSource dialog-photo variants.
    markers = (2, 3)
    for offset in range(max(0, len(data) - 24)):
        if data[offset] not in markers:
            continue
        for shift in (1, 4):
            start = offset + shift
            if start + 8 > len(data):
                continue
            value = struct.unpack_from("<q", data, start)[0]
            if 0 < value < 10**15:
                return value
    raise ValueError("dialogId not found in file_id")


async def resolve(bot: Bot, username: str) -> tuple[int, str, str]:
    source = await asyncio.to_thread(page, username)
    image = photo(source)
    file_id = await file(bot, image)
    user_id = dialog(decode(file_id))
    return user_id, file_id, image


async def inline(query: InlineQuery, bot: Bot):
    username = query.query.strip().lstrip("@")
    if not username:
        await query.answer([], cache_time=0, is_personal=True)
        return

    try:
        user_id, _, _ = await resolve(bot, username)
        link = f"tg://user?id={user_id}"
        text = f"@{username}\n{user_id}\n{link}"
    except Exception as error:
        text = f"@{username}\n{type(error).__name__}: {error}"

    await query.answer([
        InlineQueryResultArticle(
            id=username,
            title=f"@{username}",
            input_message_content=InputTextMessageContent(message_text=text),
        )
    ], cache_time=0, is_personal=True)


async def main():
    bot = Bot(TOKEN)
    dp = Dispatcher()
    dp.inline_query.register(inline)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
