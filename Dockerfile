FROM node:26-bookworm

WORKDIR /app

# 1. Nejdřív zkopírujeme úplně všechny soubory z Gitu do Dockeru
COPY . .

# 2. OKAMŽITĚ smažeme složku node_modules z tvého PC, pokud tam proklouzla
RUN rm -rf node_modules

# 3. Spustíme čistou instalaci balíčků přímo v Linuxu
RUN npm install

# 4. Otevřeme port pro Render
EXPOSE 10000

# 5. Spustíme server
CMD ["node", "server.js"]
