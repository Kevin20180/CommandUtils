#!/bin/bash

source .env

while inotifywait -r behavior_packs resource_packs -e modify,attrib,moved_to,moved_from,move,move_self,create,delete,delete_self; do
    cp -r behavior_packs/* "$MINECRAFT_DIR/development_behavior_packs"
    cp -r resource_packs/* "$MINECRAFT_DIR/development_resource_packs"
    
    sleep 0.5
done
