# syntax=docker/dockerfile:1
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Public browser configuration is compiled into the client bundle, never a server secret.
ARG NEXT_PUBLIC_REMOTION_LICENSE_KEY=""
ENV NEXT_PUBLIC_REMOTION_LICENSE_KEY=${NEXT_PUBLIC_REMOTION_LICENSE_KEY}
# Scoped to this command: no real AI key is needed or retained in the runtime image.
RUN GEMINI_API_KEY=build-placeholder npm run build

FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN apk add --no-cache libc6-compat \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs:nodejs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "const http=require('node:http');const req=http.get({host:'127.0.0.1',port:process.env.PORT||3000,path:'/api/health'},res=>{res.resume();process.exitCode=res.statusCode===200?0:1});req.setTimeout(4000,()=>req.destroy());req.on('error',()=>process.exit(1))"
CMD ["node", "server.js"]
