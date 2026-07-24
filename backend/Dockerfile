FROM node:20-alpine

# Install Sharp dependencies inside Alpine
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

COPY . .

# Build typescript code
RUN npm install -g typescript && tsc

EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "dist/server.js"]
