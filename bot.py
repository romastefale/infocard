import asyncio
import html
import os
import re
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

from aiogram import Bot, Dispatcher
from aiogram.types import (
    InlineQuery,
    InlineQueryResultArticle,
    InputMediaPhoto,
    InputRichMessage,
    InputRichMessageContent,
    InputRichMessageMedia,
)

TOKEN = os.environ["TOKEN"]
CHAT = os.environ.get("CHAT")
USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{5,32}$")
photo_file_ids: dict[str, str] = {}


def page(username: str) -> str:
    request = Request(f"https://t.me/{username}", headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(request, timeout=10) as response:
        return response.read().decode("utf-8", "replace")


def photo(source: str) -> str:
    patterns = (
        r'<meta[^>]+property="og:image"[^>]+content="([^"]+)',
        r"<meta[^>]+property='og:image'[^>]+content='([^']+)",
        r'<meta[^>]+content="([^"]+)"[^>]+property="og:image"',
        r"<meta[^>]+content='([^']+)'[^>]+property='og:image'",
    )
    match = next((re.search(pattern, source, re.I) for pattern in patterns if re.search(pattern, source, re.I)), None)
    if not match:
        raise ValueError("profile photo not found")

    image = html.unescape(match.group(1))
    parsed = urlsplit(image)
    if parsed.scheme != "https" or not parsed.netloc:
        raise ValueError("profile photo must use HTTPS")
    return image


async def file(bot: Bot, url: str) -> str:
    if cached := photo_file_ids.get(url):
        return cached
    if not CHAT:
        raise RuntimeError("Defina CHAT para o chat privado de cache do bot")

    message = await bot.send_photo(chat_id=CHAT, photo=url, disable_notification=True)
    file_id = message.photo[-1].file_id
    photo_file_ids[url] = file_id
    return file_id


def card(username: str, file_id: str) -> InputRichMessage:
    name = html.escape(username)
    return InputRichMessage(
        html="\n".join([
            '<img src="tg://photo?id=photo">',
            f"<h3>@{name}</h3>",
            '<tg-button-row align="center">',
            f'<tg-button type="url" url="https://t.me/{name}">@{name}</tg-button>',
            "</tg-button-row>",
        ]),
        media=[InputRichMessageMedia(id="photo", media=InputMediaPhoto(media=file_id))],
    )


async def inline(query: InlineQuery, bot: Bot):
    username = query.query.strip().lstrip("@")
    if not USERNAME_RE.fullmatch(username):
        await query.answer([], cache_time=0, is_personal=True)
        return

    try:
        source = await asyncio.to_thread(page, username)
        file_id = await file(bot, photo(source))
        content = InputRichMessageContent(message=card(username, file_id))
    except (OSError, TimeoutError, ValueError):
        await query.answer([], cache_time=0, is_personal=True)
        return

    await query.answer([
        InlineQueryResultArticle(
            id=username,
            title=f"@{username}",
            input_message_content=content,
        )
    ], cache_time=0, is_personal=True)


async def main():
    bot = Bot(TOKEN)
    dp = Dispatcher()
    dp.inline_query.register(inline)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
