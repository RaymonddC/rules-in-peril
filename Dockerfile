# Hosts the static site on Cloud Run.
#
# Stage 1 builds the site (npm run build:site). Stage 2 is Caddy handing out
# the built files. The container runs no application code: the apps run in
# the visitor's browser.

FROM node:22-slim AS build
WORKDIR /repo
COPY . .
RUN npm ci --no-audit --no-fund
RUN npm run build:site

FROM caddy:2-alpine
COPY --from=build /repo/dist /srv
# Cloud Run sets PORT (8080 unless changed) and sends requests to 0.0.0.0.
CMD ["sh", "-c", "exec caddy file-server --root /srv --listen :${PORT:-8080}"]
