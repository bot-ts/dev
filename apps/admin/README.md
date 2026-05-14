# Admin Dashboard of Bot.ts [WIP]

This repository contains the source code of the admin dashboard included in the [Bot.ts](https://ghom.gitbook.io/bot.ts) framework.

> ⚠️ **Warning:** This project is only for local use and is not intended to be deployed on a server. It is not secure and can expose your bot to attacks.

## To Do

### With private API in the bot to access private data (http or ws):

- discord.js cache monitoring
- bot's cpu/memory monitoring
- bot's cache monitoring (simple cache and ORM cache)
- bot's usage metrics (commands, listeners, etc.)

### With fetching of bot's files:

- browse the last bot's logs from a log file
- browse the last bot's SQL queries from a log file
- browse the last bot's API requests from a log file

### With managing of bot's files:

- add or remove dashboard's modules
- add or remove bot's components (commands, listeners, etc.)

### With connexion to the bot's database (impossible with sqlite3):

- browse and monitor the database

### With connexion to the discord.js API as bot:

- list of all guilds and its bot's permissions, with possibility to leave guilds.
- show and edit the bot's status/activity/profile picture/username
