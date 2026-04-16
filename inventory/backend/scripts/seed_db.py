#!/usr/bin/env python
"""
Peuple la base de données complète.
Usage : python scripts/seed_db.py
        python scripts/seed_db.py --skip-images
"""
import argparse
import subprocess
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
PYTHON = sys.executable


def run(command: list[str]) -> None:
    print(f"\n\033[96m> {' '.join(command)}\033[0m")
    result = subprocess.run(command, cwd=BACKEND_DIR)
    if result.returncode != 0:
        print(f"\033[91mERREUR lors de : {' '.join(command)}\033[0m")
        sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(description="Peuple la base NAOSERVICES")
    parser.add_argument("--skip-images", action="store_true", help="Ne pas uploader les images Cloudinary")
    args = parser.parse_args()

    manage = [PYTHON, "manage.py"]

    print("\033[93m=== Peuplement de la base NAOSERVICES ===\033[0m")

    run(manage + ["seed_users"])
    run(manage + ["seed_clients"])
    run(manage + ["seed_suppliers"])

    products_cmd = manage + ["seed_products"]
    if args.skip_images:
        products_cmd.append("--skip-images")
    run(products_cmd)

    run(manage + ["seed_sales", "--days", "30", "--sales-per-day", "8"])

    print("\n\033[92m=== Base peuplée avec succès ===\033[0m")
    print("  Admin Django : admin      / Admin1234!")
    print("  Vendeur 1    : vendeur1   / Vendeur1234!")
    print("  Vendeur 2    : vendeur2   / Vendeur1234!")


if __name__ == "__main__":
    main()
