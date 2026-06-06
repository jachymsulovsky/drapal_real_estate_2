FROM node:20

WORKDIR /app

# 1. Zkopírujeme POUZE package.json (lockfile ignorujeme)
COPY package.json ./

# 2. Spustíme instalaci. Protože nemá package-lock, npm si stáhne 
# přesně tu správnou binárku sqlite3, která perfektně sedí k Node v20 a starší GLIBC
RUN npm install

# 3. Teprve teď dokopírujeme zbytek projektu
COPY . .

EXPOSE 10000

# Spustíme čistě server
CMD ["node", "server.js"]