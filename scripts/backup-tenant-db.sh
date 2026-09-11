#!/usr/bin/env bash
set -uo pipefail

TENANT_SLUG="$1"
DB_URL="$2"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
DUMP_FILE="/tmp/${TENANT_SLUG}-${TIMESTAMP}.dump"
R2_PREFIX="backups/${TENANT_SLUG}"
KEEP=7

echo "== Backing up tenant: ${TENANT_SLUG} =="

pg_dump -Fc --no-owner --no-privileges "$DB_URL" -f "$DUMP_FILE"
if [ $? -ne 0 ]; then
  echo "::error::pg_dump failed for tenant ${TENANT_SLUG}"
  exit 1
fi

aws s3 cp "$DUMP_FILE" "s3://${R2_BUCKET}/${R2_PREFIX}/${TIMESTAMP}.dump" --endpoint-url "$R2_ENDPOINT"
if [ $? -ne 0 ]; then
  echo "::error::Upload to R2 failed for tenant ${TENANT_SLUG}"
  exit 1
fi

rm -f "$DUMP_FILE"

mapfile -t OBJECTS < <(aws s3api list-objects-v2 \
  --bucket "$R2_BUCKET" \
  --prefix "${R2_PREFIX}/" \
  --endpoint-url "$R2_ENDPOINT" \
  --query 'sort_by(Contents, &LastModified)[].Key' \
  --output text | tr '\t' '\n')

TOTAL=${#OBJECTS[@]}
if [ "$TOTAL" -gt "$KEEP" ]; then
  DELETE_COUNT=$((TOTAL - KEEP))
  for ((i=0; i<DELETE_COUNT; i++)); do
    OLD_KEY="${OBJECTS[$i]}"
    echo "Deleting old backup: ${OLD_KEY}"
    aws s3 rm "s3://${R2_BUCKET}/${OLD_KEY}" --endpoint-url "$R2_ENDPOINT"
  done
fi

echo "== Backup complete for tenant: ${TENANT_SLUG} =="