# SPDX-License-Identifier: MIT
# Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
#
# The product. A placeholder for a plain Node app in app/ that listens on PORT.
# During setup the Lead rewrites it for the stack the owner chose. Keep the order: dependency files first, then the
# install or restore, then the source, so a source change does not repeat the install.
FROM node:22-alpine
WORKDIR /srv
COPY app/package*.json ./
# A cache mount keeps the downloaded packages between builds (BuildKit, the default in Docker).
RUN --mount=type=cache,target=/root/.npm npm install --omit=dev
COPY app/ ./
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
