# Prod-Image für Sitzplan Studio.
#
# Zwei Stufen: Bun baut, Node führt aus. Nitro erzeugt mit dem Preset
# `node-server` einen eigenständigen Server unter `.output/`, der keine
# node_modules mehr braucht — deshalb wandert nur `.output/` ins Laufzeit-Image.
#
# Die VITE_-Variablen schreibt Vite beim Bauen fest ins ausgelieferte
# JavaScript. Sie müssen darum als Build-Arg anliegen, nicht erst zur Laufzeit.
# Der Service-Role-Schlüssel ist das Gegenteil: er kommt ausschließlich zur
# Laufzeit aus der Umgebung und darf nie in eine Image-Schicht geraten.

FROM oven/bun:1.3-alpine AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID \
    NITRO_PRESET=node-server

RUN bun run build


FROM node:24-alpine AS runtime
WORKDIR /app

# Marke und Herkunft am Abbild selbst. `docker inspect` und Registry-Oberflächen
# lesen diese Schlüssel — ohne sie ist das Abbild auf dem Server namenlos.
LABEL org.opencontainers.image.title="Sitzplan Studio" \
      org.opencontainers.image.description="Klassen verwalten, Räume maßstabsgetreu zeichnen, Sitzpläne stellen — ein Werkzeug für Lehrkräfte." \
      org.opencontainers.image.authors="Alexander Schneider <schneider@alexle135.de>" \
      org.opencontainers.image.vendor="Alexander Schneider — alexle135.de" \
      org.opencontainers.image.url="https://alexle135.de" \
      org.opencontainers.image.documentation="https://github.com/arn0ld87/sitzplan-studio#readme" \
      org.opencontainers.image.source="https://github.com/arn0ld87/sitzplan-studio" \
      org.opencontainers.image.licenses="AGPL-3.0-or-later"

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

COPY --from=builder --chown=node:node /app/.output ./.output

USER node
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
