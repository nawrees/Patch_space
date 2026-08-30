# Deliberately does NOT install Docker CLI or bundle a socket — this image
# only ever talks to the HOST's Docker engine via a bind-mounted socket
# (see docker-compose.yml), the same "sibling containers" pattern
# docker.service.js already assumes (it auto-detects /var/run/docker.sock
# on Linux). Running Docker-in-Docker here would be a different, heavier
# setup this app was never built for.
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 4000

CMD ["node", "server.js"]
