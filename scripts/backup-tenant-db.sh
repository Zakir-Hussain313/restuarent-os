#!/usr/bin/env bash
set -uo pipefail

TENANT_SLUG="$1"
DB_URL="$2"
BACKUP_DIR="$3"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
TENANT_DIR="${BACKUP_DIR}/${TENANT_SLUG}"
DUMP_FILE="${TENANT_DIR}/${TIMESTAMP}.dump"
KEEP=7

echo "== Backing up tenant: ${TENANT_SLUG} =="

mkdir -p "$TENANT_DIR"

pg_dump -Fc --no-owner --no-privileges "$DB_URL" -f "$DUMP_FILE"
if [ $? -ne 0 ]; then
  echo "::error::pg_dump failed for tenant ${TENANT_SLUG}"
  exit 1
fi

echo "Dump written: ${DUMP_FILE}"

mapfile -t FILES < <(ls -1t "$TENANT_DIR"/*.dump 2>/dev/null)
TOTAL=${#FILES[@]}
if [ "$TOTAL" -gt "$KEEP" ]; then
  for ((i=KEEP; i<TOTAL; i++)); do
    echo "Removing old backup: ${FILES[$i]}"
    rm -f "${FILES[$i]}"
  done
fi

echo "== Done: ${TENANT_SLUG} =="