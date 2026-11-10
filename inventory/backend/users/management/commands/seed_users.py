from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

# (username, email, first, last, password, role, is_staff, is_superuser)
USERS_DATA = [
    # Comptes FICTIFS de la démo publique, affichés sur la page de connexion.
    ("admin", "admin@example.com", "Admin", "Démo", "Demo-Inventory-2026", "admin", True, True),
    ("vendeur1", "vendeuse1@example.com", "Marie", "Koumba", "Demo-Inventory-2026", "vendeur", False, False),
    ("vendeur2", "vendeur2@example.com", "Paul", "Moussavou", "Demo-Inventory-2026", "vendeur", False, False),
]


class Command(BaseCommand):
    help = 'Crée les utilisateurs de démonstration (admin Django + vendeurs)'

    def handle(self, *args, **options):
        for username, email, first, last, password, role, is_staff, is_superuser in USERS_DATA:
            if User.objects.filter(username=username).exists():
                self.stdout.write(f'  ~ {username} existe déjà')
                continue
            if is_superuser:
                user = User.objects.create_superuser(
                    username=username,
                    email=email,
                    first_name=first,
                    last_name=last,
                    password=password,
                )
            else:
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    first_name=first,
                    last_name=last,
                    password=password,
                    is_staff=is_staff,
                )
            user.profile.role = role
            user.profile.save()
            marker = '[ADMIN]' if is_superuser else '[OK]'
            self.stdout.write(f'  {marker} {username} ({role}{"  [superuser Django]" if is_superuser else ""})')
        self.stdout.write(self.style.SUCCESS('Utilisateurs crees'))
