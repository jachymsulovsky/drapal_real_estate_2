FROM node:22-bookworm

WORKDIR /opt/render/project/src

# Nejprve zkopírujeme package.json pro cachování vrstev
COPY package*.json ./
RUN npm install --production && npm cache clean --force

# Zkopírujeme zbytek aplikace
COPY . .

EXPOSE 10000

CMD ["node", "server.js"]
