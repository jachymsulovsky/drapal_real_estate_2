FROM node:22-bookworm

# Build tools pro kompilaci nativních modulů (sqlite3, bcrypt)
RUN apt-get update && apt-get install -y build-essential python3 && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/render/project/src

# Nejdřív package.json pro cache vrstev
COPY package*.json ./

# Donutíme kompilaci ze zdrojových kódů – prebuilt binary sqlite3 vyžaduje glibc 2.38,
# ale naše prostředí má glibc 2.36. Kompilace ze zdroje vytvoří kompatibilní binary.
RUN npm_config_build_from_source=true npm install --production && npm cache clean --force

# Zkopírujeme zbytek aplikace
COPY . .

EXPOSE 10000

CMD ["node", "server.js"]
