# SPDX-License-Identifier: MIT
# Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
#
# The frontend when it is its own app: built once, served as static files. A placeholder for a web/ folder with a
# "build" script that writes web/dist; the Lead adapts it at setup. Dependency files first, then the install, then
# the source, so a source change does not repeat the install.
FROM node:22-alpine AS build
WORKDIR /web
COPY web/package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY web/ ./
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=5s --timeout=3s --retries=12 CMD wget -q -O /dev/null http://127.0.0.1:80/ || exit 1
