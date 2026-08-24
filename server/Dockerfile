# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -p tsconfig.json
RUN npm prune --omit=dev

# ---- runtime stage ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S bookit && adduser -S bookit -G bookit
COPY --from=build --chown=bookit:bookit /app/node_modules ./node_modules
COPY --from=build --chown=bookit:bookit /app/dist ./dist
COPY package*.json ./
COPY scripts ./scripts

RUN mkdir -p /app/uploads && chown -R bookit:bookit /app
USER bookit
EXPOSE 5000
CMD ["node", "dist/server.js"]
