# Dockerfile
FROM node:20-alpine AS base
WORKDIR /usr/src/app

# Install pnpm
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

FROM node:20-alpine AS runtime
WORKDIR /usr/src/app
RUN npm install -g pnpm
COPY --from=base /usr/src/app/package.json ./
COPY --from=base /usr/src/app/dist ./dist
COPY --from=base /usr/src/app/node_modules ./node_modules

EXPOSE 5000
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]