#!/bin/bash

# Get current date for backup folder name
DATE=$(date +"%Y%m%d_%H%M%S")
PROJECT_NAME="captain_frank"
BACKUP_NAME="${PROJECT_NAME}_backup_${DATE}"
BACKUP_DIR="./${BACKUP_NAME}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Copy files while excluding node_modules, .next, and other unnecessary files
rsync -av \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    --exclude 'coverage' \
    --exclude '.env' \
    --exclude '*.log' \
    --exclude "$BACKUP_NAME" \
    ./ "$BACKUP_DIR"

# Create a zip file
zip -r "${BACKUP_NAME}.zip" "$BACKUP_NAME"

# Remove the unzipped backup directory
rm -rf "$BACKUP_DIR"

echo "Backup completed: ${BACKUP_NAME}.zip"