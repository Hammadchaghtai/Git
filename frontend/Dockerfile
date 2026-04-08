FROM node:20-alpine

WORKDIR /app

# Install dependencies first (cached layer)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source (overridden by volume mount in dev)
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
