#!/usr/bin/env python
"""
Remet à zéro et re-peuple la base de données.
ATTENTION : supprime TOUTES les données existantes.
Usage : python scripts/reset_db.py
"""
import subprocess
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
PYTHON = sys.executable


def run(command: list[str]) -> None:
    print(f"\n\033[96m> {' '.join(command)}\033[0m")
    result = subprocess.run(command, cwd=BACKEND_DIR)
    if result.returncode != 0:
        print(f"\033[91mERREUR : {' '.join(command)}\033[0m")
        sys.exit(1)


def main() -> None:
    print("\033[91mATTENTION : cette opération supprime toutes les données.\033[0m")
    confirm = input("Continuer ? (oui/non) : ").strip().lower()
    if confirm != "oui":
        print("Annulé.")
        sys.exit(0)

    manage = [PYTHON, "manage.py"]

    print("\n\033[93m=== Migration + peuplement ===\033[0m")
    run(manage + ["migrate"])
    run(manage + ["seed_all"])

    print("\n\033[92m=== Terminé ===\033[0m")


if __name__ == "__main__":
    main()
