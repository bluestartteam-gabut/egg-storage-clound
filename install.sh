#!/bin/bash

# Folder app
APP_DIR="/mnt/server/app"

# Clone repo jika belum ada
if [ ! -d "$APP_DIR" ]; then
  git clone "${GIT_REPO}" "$APP_DIR"
fi

cd "$APP_DIR" || exit 1

# Optional: checkout branch
if [ ! -z "${BRANCH}" ]; then
  git checkout "${BRANCH}"
fi

# Install packages
if [ -f package.json ]; then
  npm install --production
fi

# Jalankan bot
${CMD_RUN}
