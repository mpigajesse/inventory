#!/usr/bin/env python
"""
Crée un superuser Django interactif si aucun n'existe.
Usage : python scripts/create_admin.py
"""
import os
import sys
import django
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth.models import User  # noqa: E402


def main() -> None:
    if User.objects.filter(is_superuser=True).exists():
        admins = User.objects.filter(is_superuser=True).values_list("username", flat=True)
        print(f"Un superuser existe déjà : {', '.join(admins)}")
        return

    print("=== Création du superuser Django ===")
    username = input("Username [admin] : ").strip() or "admin"
    email = input("Email [admin@naoservices.ga] : ").strip() or "admin@naoservices.ga"

    import getpass
    password = getpass.getpass("Mot de passe : ")
    confirm = getpass.getpass("Confirmer le mot de passe : ")

    if password != confirm:
        print("Les mots de passe ne correspondent pas.")
        sys.exit(1)

    user = User.objects.create_superuser(username=username, email=email, password=password)
    user.profile.role = "admin"
    user.profile.save()
    print(f"\n[OK] Superuser '{username}' créé avec succès.")
    print(f"  Accès Django admin : http://localhost:8000/admin/")


if __name__ == "__main__":
    main()
