# syntax=docker/dockerfile:1.7

###############################################################################
# BlakPath production image — multi-stage build for Next.js 16 standalone.
#
# Stages:
#   base    - pinned Node + pnpm, tini for signal handling
#   deps    - full dependency install (cached on lockfile)
#   build   - compile Next.js standalone output + the worker
#   runner  - minimal, non-root runtime for the web server
#   worker  - minimal, non-root runtime for the BullMQ worker
#
# Security posture:
#   - Non-root user (uid 1001) in every runtime stage.
#   - No secrets are baked in; all config is injected at runtime via env_file /
#     secret manager (see docker-compose.prod.example.yml).
#   - Only production artefacts are copied into the runtime images.
#   - tini as PID 1 for correct SIGTERM propagation → graceful shutdown.
###############################################################################

ARG NODE_VERSION=20.18.1

########################################  base  ###############################
FROM node:${NODE_VERSION}-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="${PNPM_HOME}:${PATH}"
# tini gives us a real init for signal handling; ca-certificates for TLS to
# managed Postgres/Redis/S3. curl is used only by the web HEALTHCHECK; procps
# provides pgrep for the worker HEALTHCHECK.
RUN apt-get update \
  && apt-get install -y --no-install-recommends tini curl ca-certificates procps \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

########################################  deps  ###############################
FROM base AS deps
# Only the manifest + lockfile so this layer caches across source changes.
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile

#######################################  build  ##############################
FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build the Next.js standalone server. `output: 'standalone'` is set in
# next.config.ts, producing .next/standalone with a minimal node_modules.
RUN pnpm build

######################################  runner  ##############################
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

# Non-root runtime user.
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# Next.js standalone: server + only the node_modules it actually needs.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# Liveness/readiness probe hitting the app health endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/api/health" || exit 1

# tini as PID 1 → forwards SIGTERM to node → Next flushes and exits cleanly.
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]

######################################  worker  ##############################
# The worker is TypeScript run via tsx (a pinned project dependency). tsx honours
# the tsconfig path aliases (@/*), so the worker can import shared contracts such
# as `@/lib/env` without a separate bundling step.
FROM base AS worker
ENV NODE_ENV=production
WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs worker

# Full dependency set (tsx lives in devDependencies and is required at runtime
# to execute the TypeScript worker). Reuses the cached pnpm store.
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile

# Only the sources the worker needs: the worker entrypoint, the shared library
# contracts it imports, the DB layer, and tsconfig for path resolution.
COPY --chown=worker:nodejs tsconfig.json ./tsconfig.json
COPY --from=build --chown=worker:nodejs /app/worker ./worker
COPY --from=build --chown=worker:nodejs /app/src ./src

USER worker

# No exposed port; the worker is not an HTTP service. A process-liveness check
# keeps orchestrators informed without opening a socket.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD pgrep -f "worker/index.ts" > /dev/null || exit 1

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["pnpm", "exec", "tsx", "worker/index.ts"]
