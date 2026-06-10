# ============================================================
# Dockerfile pro Drápal Real Estate
# ============================================================
# Base image: Node.js 22 na Debian Bookworm
# DŮLEŽITÉ: sqlite3 musíme kompilovat ze zdroje, protože
# prebuilt binary vyžadují GLIBC 2.38+, ale Debian Bookworm
# má GLIBC 2.36. Kompilace ze zdroje vytvoří binary
# kompatibilní s naším prostředím.
# ============================================================

FROM node:22-bookworm

# Nainstalujeme build tools potřebné pro kompilaci nativních modulů
# (node-gyp potřebuje C++ kompilátor a Python)
RUN apt-get update && apt-get install -y \
  build-essential \
  python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/render/project/src

# Nejdřív zkopírujeme package.json pro optimální cacheování vrstev
COPY package*.json ./

# Klíčový krok: force build from source
# --build-from-source donutí node-gyp zkompilovat sqlite3 přímo
# na tomto serveru, místo stažení prebuilt binary.
# Bez tohoto by Render stáhl binary kompilovaný proti GLIBC 2.38,
# která na Debian Bookworm (GLIBC 2.36) nefunguje.
RUN npm install --build-from-source --production && npm cache clean --force

# Zkopírujeme zbytek aplikace
COPY . .

EXPOSE 10000

CMD ["node", "server.js"]
