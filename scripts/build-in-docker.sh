#!/usr/bin/env sh

set -ex

corepack enable # package.json => packageManager
pnpm install --no-prod --frozen-lockfile
pnpm exec prisma generate
pnpm exec tsc
pnpm exec tsc-alias --resolve-full-paths
rm -rf src
mv build/src .
node ./scripts/build-fix-source-map.mjs
pnpm install --prod
pnpm store prune
rm -rf node_modules/@types node_modules/*/*.d.ts
