# check=skip=SecretsUsedInArgOrEnv
# Docker's generic linter flags any ARG/ENV as a potential leaked secret —
# suppressed here because neither of these actually is: SUPABASE_URL is
# just a public endpoint, and SUPABASE_ANON_KEY is designed to be public
# (RLS is the real security boundary), same as everywhere else this app
# already uses it client-side. See backend's env.js comments for the same
# distinction with the service-role key, which never appears anywhere in
# this frontend build.
# Build stage — compiles the Angular app with real production values baked
# in via write-env.mjs. No API_URL build arg needed — nginx proxies /api
# to the backend on the same origin (see nginx.conf), so that value is a
# constant, not something that varies per deployment.
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm ci
COPY . .

ARG SUPABASE_URL
ARG SUPABASE_ANON_KEY
ENV SUPABASE_URL=$SUPABASE_URL
ENV SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

RUN node scripts/write-env.mjs
RUN npm run build

# Serve stage — just the compiled static output behind nginx.
FROM nginx:1.27-alpine
# A real scan turned up 26 High findings (libexpat, libpng, libxml2,
# libssl3/libcrypto3, musl, zlib, etc.) — every one already has a fixed
# version sitting in Alpine's own package repo for this same Alpine release,
# it's just not baked into this nginx image tag yet. A blanket `apk upgrade`
# only pulls patches within that pinned release (apk's repo URLs are locked
# to the image's Alpine version), so this can't silently jump nginx's own
# version or Alpine's major version the way bumping the base image tag
# could — it's the same risk profile as the previous single-package fix,
# just not needing a new RUN line named individually for every future CVE.
RUN apk update && apk upgrade --no-cache
COPY --from=build /app/dist/elearning-frontend /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
