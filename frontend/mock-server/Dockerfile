# Container image for the mock API server — the Node/Express stand-in for the
# Go backend. It serves the same read-only GET routes from SQLite.
#
# This is the *mock* backend. The real Go API in ../../backend/ is handwritten
# and is NOT built here — see AGENTS.md. This image exists so the public site
# has a working API to point at before the Go service is stood up.
#
# Runtime posture follows docs/decision-points/vps.md §3: distroless base (no
# shell, no package manager, minimal attack surface), single static-ish process.
#
# Build context is the repository root:
#   docker build -f frontend/mock-server/Dockerfile -t mock-api .

# ---- deps: install production node_modules ---------------------------------
FROM node:22-alpine AS deps
WORKDIR /app/frontend/mock-server
COPY frontend/mock-server/package.json frontend/mock-server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
RUN mkdir /data && chown 65532:65532 /data

# ---- runtime: distroless node, no shell / package manager ------------------
FROM gcr.io/distroless/nodejs22-debian12 AS runtime
WORKDIR /app/frontend/mock-server
ENV NODE_ENV=production \
    PORT=8787 \
    DATABASE_PATH=/data/site.sqlite

# Real commit info for the footer / blog commit refs. Distroless has no git and
# the build context carries no .git, so the CI build passes HEAD in here:
#   docker build --build-arg BUILD_COMMIT="$(git rev-parse --short HEAD)" \
#                --build-arg BUILD_COMMITTED_AT="$(git log -1 --format=%cI)" ...
# server.js falls back to local git, then an unknown commit when these are unset.
ARG BUILD_COMMIT=""
ARG BUILD_COMMITTED_AT=""
ENV BUILD_COMMIT=$BUILD_COMMIT \
    BUILD_COMMITTED_AT=$BUILD_COMMITTED_AT

# Production deps from the deps stage, then the server + seed data. The
# build-time seed generator (build-photo-seed.mjs) is intentionally excluded.
COPY --from=deps /app/frontend/mock-server/node_modules ./node_modules
COPY frontend/mock-server/server.js frontend/mock-server/repository.js frontend/mock-server/reading-stats.js ./
COPY frontend/mock-server/data ./data
COPY database/db.mjs database/import.mjs database/cli.mjs /app/database/
COPY database/migrations /app/database/migrations
COPY --from=deps --chown=65532:65532 /data /data

# Run as the image's built-in unprivileged user (uid 65532).
USER nonroot

EXPOSE 8787

# distroless nodejs images set `node` as the ENTRYPOINT, so CMD is just args.
# HEALTHCHECK runs the command directly (not via ENTRYPOINT), so call node by
# its absolute path; node 22 ships a global fetch.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/api/site').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["server.js"]
