# ============================================================
# Dockerfile pro Drápal Real Estate
# ============================================================
# Base image: Node.js 22 na Debian Bookworm
# better-sqlite3 (SQLite binding) se vždy kompiluje ze zdroje,
# takže není problém s GLIBC verzemi (žádné prebuilt binary).
# ============================================================

FROM node:22-bookworm

# Build tools potřebné pro kompilaci better-sqlite3 a bcrypt
RUN apt-get update && apt-get install -y \
  build-essential \
  python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/render/project/src

COPY package*.json ./

# better-sqlite3 se automaticky kompiluje ze zdroje při npm install
RUN npm install --production && npm cache clean --force

COPY . .

EXPOSE 10000

CMD ["node", "server.js"]
