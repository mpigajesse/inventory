from django.core.management.base import BaseCommand
from clients.models import Client

CLIENTS_DATA = [
    ("Marie Obiang", "074123456", "marie.obiang@gmail.com", "Quartier Louis", "Libreville"),
    ("Jean-Pierre Mba", "077234567", "jp.mba@gmail.com", "Akanda", "Libreville"),
    ("Solange Nzé", "062345678", "", "PK8", "Libreville"),
    ("André Bekale", "066456789", "a.bekale@gmail.com", "Nzeng-Ayong", "Libreville"),
    ("Christine Oyane", "074567890", "", "Owendo", "Owendo"),
    ("Paul Nguema", "077678901", "p.nguema@gmail.com", "Quartier Glass", "Libreville"),
    ("Françoise Minko", "062789012", "", "PK12", "Libreville"),
    ("David Engone", "066890123", "d.engone@gmail.com", "Alibandeng", "Libreville"),
    ("Sylvie Moussavou", "074901234", "", "Montagne Sainte", "Libreville"),
    ("Robert Ndong", "077012345", "r.ndong@gmail.com", "Plaine Orety", "Libreville"),
    ("Armelle Ondo", "062123456", "", "Nomba", "Libreville"),
    ("Théodore Mboula", "066234567", "t.mboula@gmail.com", "Bambouchine", "Libreville"),
    ("Nadège Assoumou", "074345678", "", "PK5", "Libreville"),
    ("Michel Boundono", "077456789", "m.boundono@gmail.com", "Nkembo", "Libreville"),
    ("Patricia Kombila", "062567890", "", "Libreville Centre", "Libreville"),
    ("Éric Mabika", "066678901", "e.mabika@gmail.com", "PK10", "Libreville"),
    ("Joséphine Nze", "074789012", "", "Akébé", "Libreville"),
    ("Gaston Meye", "077890123", "g.meye@gmail.com", "PK14", "Libreville"),
    ("Albertine Otoumou", "062901234", "", "Quartier IBW", "Libreville"),
    ("Rodrigue Bouanga", "066012345", "r.bouanga@gmail.com", "PK15 Nzamaligue", "Libreville"),
]


class Command(BaseCommand):
    help = 'Popule la base avec des clients de démonstration'

    def handle(self, *args, **options):
        created = 0
        for name, phone, email, address, city in CLIENTS_DATA:
            _, was_created = Client.objects.get_or_create(
                name=name,
                defaults={'phone': phone, 'email': email, 'address': address, 'city': city}
            )
            if was_created:
                created += 1
        self.stdout.write(self.style.SUCCESS(f'[OK] {created} clients créés'))
