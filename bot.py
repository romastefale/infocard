import asyncio
import html
import os

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


def card(username: str, photo: str | None = None) -> InputRichMessage:
    name = html.escape(username)
    body = []
    media = None

    if photo:
        body.append('<img src="tg://photo?id=photo"/>')
        media = [InputRichMessageMedia(id="photo", media=InputMediaPhoto(media=photo))]

    body += [
        f"<h3>@{name}</h3>",
        '<h5>Conta criada aproximadamente em —</h5>',
        '<h6>"—"</h6>',
        '<tg-button-row align="center">',
        f'<tg-button type="url" url="https://t.me/{name}">@{name}</tg-button>',
        '</tg-button-row>',
    ]
    return InputRichMessage(html="\n".join(body), media=media)


async def inline(query: InlineQuery, bot: Bot):
    username = query.query.strip().lstrip("@")
    if not username:
        await query.answer([], cache_time=0, is_personal=True)
        return

    await query.answer([
        InlineQueryResultArticle(
            id=username,
            title=f"@{username}",
            input_message_content=InputRichMessageContent(message=card(username)),
        )
    ], cache_time=0, is_personal=True)


async def main():
    bot = Bot(TOKEN)
    dp = Dispatcher()
    dp.inline_query.register(inline)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
