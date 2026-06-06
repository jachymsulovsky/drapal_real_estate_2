FROM node:26-bookworm

WORKDIR /app

# Kopírujeme POUZE package soubory, žádný kód ani lokální node_modules
COPY package*.json ./

# Nainstalujeme čisté balíčky přímo v Linuxu (sqlite3 se zkompiluje správně)
RUN npm install

# Teprve TEĎ dokopírujeme zbytek projektu (zdrojáky, views, atd.)
COPY . .

EXPOSE 10000

CMD ["node", "server.js"]