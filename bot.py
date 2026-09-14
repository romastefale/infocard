import asyncio
import os

from aiogram import Bot, Dispatcher
from aiogram.types import InlineQuery, InlineQueryResultArticle, InputTextMessageContent

TOKEN = os.environ["TOKEN"]


async def inline(query: InlineQuery):
    username = query.query.strip().lstrip("@")
    if not username:
        await query.answer([], cache_time=0, is_personal=True)
        return

    await query.answer([
        InlineQueryResultArticle(
            id=username,
            title=f"@{username}",
            input_message_content=InputTextMessageContent(message_text=f"@{username}"),
        )
    ], cache_time=0, is_personal=True)


async def main():
    bot = Bot(TOKEN)
    dp = Dispatcher()
    dp.inline_query.register(inline)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
