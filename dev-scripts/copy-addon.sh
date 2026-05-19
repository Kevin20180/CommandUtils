#!/bin/bash
set -e
source .env

cp dist/index.js "behavior_packs/$PROJECT_NAME/scripts/index.js"

cp -r behavior_packs/* "$MINECRAFT_DIR/development_behavior_packs"
cp -r resource_packs/* "$MINECRAFT_DIR/development_resource_packs"