FROM node:16.17.0 AS base
WORKDIR /app

RUN ["apt-get", "update"]
RUN ["apt-get", "-y", "install", "vim"]

FROM base AS builder
ARG NPM_TOKEN
COPY .npmrc .
COPY package.json .
COPY yarn.lock .
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN yarn --frozen-lockfile --non-interactive
COPY . .
# Build and trim node_modules dependencies
RUN yarn build && mv yarnclean .yarnclean && yarn --frozen-lockfile --non-interactive --production

FROM base AS release
COPY --from=builder --chown=1000:1000 /app/dist ./dist
COPY --from=builder --chown=1000:1000 /app/node_modules ./node_modules
COPY --chown=1000:1000 ./ormconfig.js ./ormconfig.js
USER 1000:1000
CMD ["sh", "-c", "node node_modules/typeorm/cli migration:run && node dist/index.js"]
