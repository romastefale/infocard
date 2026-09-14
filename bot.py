import asyncio
import html
import os
import re

from aiogram import Bot, Dispatcher, F
from aiogram.types import InlineQuery, InlineQueryResultArticle, InputTextMessageContent, Message

TOKEN = os.environ["TOKEN"]
GROUP = int(os.environ["GROUP"])
USER = re.compile(r"^[A-Za-z][A-Za-z0-9_]{3,31}$")
BOTS = (("MissRose_bot", "/id"), ("GroupHelpBot", "/info"), ("combot", "/info"))
WAIT: dict[str, asyncio.Future[int]] = {}


def username(text: str) -> str | None:
    text = (text or "").strip().split()[0].removeprefix("@").split("?", 1)[0].rstrip("/")
    if "/" in text:
        text = text.rsplit("/", 1)[-1]
    return text if USER.fullmatch(text) else None


async def resolve(bot: Bot, name: str) -> int | None:
    loop = asyncio.get_running_loop()
    for target, command in BOTS:
        future = loop.create_future()
        WAIT[name.lower()] = future
        sent = await bot.send_message(GROUP, f"{command}@{target} @{name}")
        try:
            return await asyncio.wait_for(future, 5)
        except TimeoutError:
            pass
        finally:
            WAIT.pop(name.lower(), None)
    return None


async def replies(message: Message):
    if message.chat.id != GROUP or not message.text:
        return
    text = message.text
    ids = re.findall(r"(?<!\d)-?\d{5,15}(?!\d)", text)
    if not ids:
        return
    lower = text.lower()
    for name, future in tuple(WAIT.items()):
        if f"@{name}" in lower and not future.done():
            future.set_result(int(ids[0]))
            return
    if len(WAIT) == 1:
        future = next(iter(WAIT.values()))
        if not future.done():
            future.set_result(int(ids[0]))


async def inline(query: InlineQuery, bot: Bot):
    name = username(query.query)
    if not name:
        await query.answer([], cache_time=0, is_personal=True)
        return
    uid = await resolve(bot, name)
    if uid is None:
        await query.answer([], cache_time=0, is_personal=True)
        return
    photos = await bot.get_user_profile_photos(uid, limit=1)
    photo = photos.photos[0][-1].file_id if photos.total_count else None
    body = f"<h3>@{html.escape(name)} #{uid}</h3>"
    if photo:
        body = f'<img src="tg://photo?id=photo"/>\n{body}'
    await query.answer([
        InlineQueryResultArticle(
            id=str(uid),
            title=f"@{name}",
            description=str(uid),
            input_message_content=InputTextMessageContent(message_text=body, parse_mode="HTML"),
        )
    ], cache_time=0, is_personal=True)


async def main():
    bot = Bot(TOKEN)
    dp = Dispatcher()
    dp.message.register(replies, F.chat.id == GROUP)
    dp.inline_query.register(inline)
    await dp.start_polling(bot, allowed_updates=["message", "inline_query"])


if __name__ == "__main__":
    asyncio.run(main())
