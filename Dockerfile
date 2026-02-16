# Build (Debian para binários nativos lightningcss/Tailwind; Alpine não instala o .node corretamente)
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Sem lockfile no build: lockfile do Mac não instala opcionais nativos no Linux (lightningcss, @tailwindcss/oxide)
COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# Run
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
