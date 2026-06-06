FROM node:20

WORKDIR /app

# Kopírujeme package soubory
COPY package*.json ./

# Čistá instalace uvnitř Dockeru
RUN npm install

# Kopírování zbytku projektu
COPY . .

EXPOSE 10000

# NUKLEÁRNÍ ZMĚNA: Smažeme node_modules a přeinstalujeme je TĚSNĚ předtím, než server nastartuje
CMD rm -rf node_modules package-lock.json && npm install && node server.js