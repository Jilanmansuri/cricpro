FROM node:20-alpine

# Install Sharp dependencies inside Alpine
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# Build typescript code using local ts version
RUN npm run build

# Remove devDependencies
RUN npm prune --production

EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "dist/server.js"]
