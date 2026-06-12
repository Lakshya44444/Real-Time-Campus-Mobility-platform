# ---- Build + run image for the custom Next.js + Socket.IO server ----
FROM node:20-alpine

# Prisma needs openssl on Alpine.
RUN apk add --no-cache openssl

WORKDIR /app

# Install dependencies (postinstall runs `prisma generate`, so copy the schema first).
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# Copy the rest of the source and build the Next.js app.
COPY . .
RUN npm run build

ENV NODE_ENV=production
# Cloud platforms inject PORT; server.js reads it and binds 0.0.0.0 in production.
EXPOSE 8080

# Apply any pending DB migrations, then start the server (HTTP + Socket.IO).
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
