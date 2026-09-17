# BreakBox web. Written by Max-Anton Horvat. Complex Software Systems (S6). sig 0x4D414836.
# Multi-stage: build the static site with Node, then serve it with nginx.
# Build context is ./frontend (see docker-compose.yml).

FROM node:22 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
