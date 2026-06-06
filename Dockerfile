# Použijeme Node 22 na novém Debianu (Bookworm), který už GLIBC 2.38 stoprocentně obsahuje
FROM node:22-bookworm

WORKDIR /app

# Zkopírujeme package soubory
COPY package*.json ./

# Nainstalujeme balíčky přímo uvnitř čistého Linuxu
RUN npm install

# Dokopírujeme zbytek projektu
COPY . .

EXPOSE 10000

# Spustíme aplikaci
CMD ["node", "server.js"]