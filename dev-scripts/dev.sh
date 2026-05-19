#!/bin/bash

set -e
source .env

tsc -w &
mcbundler watch scripts/index.ts \
    -o dist/index.js \
    --build-delay 500 \
    -c "cp dist/index.js behavior_packs/$PROJECT_NAME/scripts/index.js" &
bash dev-scripts/watch-addon.sh