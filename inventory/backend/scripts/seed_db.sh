#!/usr/bin/env bash
# Peuple la base de données complète (Linux/Mac/WSL)
# Usage: bash scripts/seed_db.sh
# Usage sans images: bash scripts/seed_db.sh --skip-images

set -e

SKIP_IMAGES=false
[[ "$1" == "--skip-images" ]] && SKIP_IMAGES=true

PYTHON="${PYTHON:-python}"
MANAGE="manage.py"

run() {
  echo -e "\033[0;36m> python $MANAGE $*\033[0m"
  $PYTHON $MANAGE "$@"
}

echo "=== Peuplement de la base NAOSERVICES ==="

run seed_users
run seed_clients
run seed_suppliers

if $SKIP_IMAGES; then
  run seed_products --skip-images
else
  run seed_products
fi

run seed_sales --days 30 --sales-per-day 8

echo ""
echo -e "\033[0;32m=== Base peuplée avec succès ===\033[0m"
echo "  Admin Django : admin / Admin1234!"
echo "  Vendeur 1    : vendeur1 / Vendeur1234!"
echo "  Vendeur 2    : vendeur2 / Vendeur1234!"
