# Container image for the mock API server — the Node/Express stand-in for the
# Go backend. It serves the same read-only GET routes from JSON seed files.
#
# This is the *mock* backend. The real Go API in ../../backend/ is handwritten
# and is NOT built here — see AGENTS.md. This image exists so the public site
# has a working API to point at before the Go service is stood up.
#
# Runtime posture follows docs/decision-points/vps.md §3: distroless base (no
# shell, no package manager, minimal attack surface), single static-ish process.
#
# Build context is this directory (frontend/mock-server):
#   docker build -t mock-api frontend/mock-server

# ---- deps: install production node_modules (express only) ------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

# ---- runtime: distroless node, no shell / package manager ------------------
FROM gcr.io/distroless/nodejs22-debian12 AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8787

# Production deps from the deps stage, then the server + seed data. The
# build-time seed generator (build-photo-seed.mjs) is intentionally excluded.
COPY --from=deps /app/node_modules ./node_modules
COPY server.js ./
COPY data ./data

# Run as the image's built-in unprivileged user (uid 65532).
USER nonroot

EXPOSE 8787

# distroless nodejs images set `node` as the ENTRYPOINT, so CMD is just args.
# HEALTHCHECK runs the command directly (not via ENTRYPOINT), so call node by
# its absolute path; node 22 ships a global fetch.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/api/site').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["server.js"]
