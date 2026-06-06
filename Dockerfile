FROM node:20-bookworm-slim

# Instalujeme základní nástroje pro kompilaci do Linuxu, aby Render neměl výmluvu
RUN apt-get update && apt-get install -y python3 make g++ rm-all && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./

# Vynutíme stažení čisté linuxové binárky bez ohledu na to, co říká package-lock
RUN npm install --platform=linux --arch=x64 sqlite3
RUN npm install

COPY . .

EXPOSE 10000

CMD ["node", "server.js"]