#!/usr/bin/env bash
# Aplica las migraciones de supabase/migrations/ al proyecto vinculado usando
# la Management API de Supabase (requiere sesión de `supabase login`).
#
# Uso: ./scripts/aplicar-migraciones.sh <project-ref> [archivo.sql ...]
set -euo pipefail

REF="${1:?Falta el project-ref}"
shift || true

TOKEN="$(security find-generic-password -s "Supabase CLI" -w 2>/dev/null || echo "${SUPABASE_ACCESS_TOKEN:-}")"
if [ -z "$TOKEN" ]; then
  echo "No se encontró el token de Supabase (corre 'supabase login')." >&2
  exit 1
fi

ARCHIVOS=("$@")
if [ ${#ARCHIVOS[@]} -eq 0 ]; then
  ARCHIVOS=(supabase/migrations/*.sql)
fi

for archivo in "${ARCHIVOS[@]}"; do
  echo "→ Aplicando $(basename "$archivo")…"
  PAYLOAD=$(python3 -c 'import json,sys; print(json.dumps({"query": open(sys.argv[1]).read()}))' "$archivo")
  RESPUESTA=$(curl -s -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")
  if echo "$RESPUESTA" | grep -q '"message"'; then
    echo "  ERROR: $RESPUESTA" >&2
    exit 1
  fi
  echo "  OK"
done

echo "Migraciones aplicadas."
