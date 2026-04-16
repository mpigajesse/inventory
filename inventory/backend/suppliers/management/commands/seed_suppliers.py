from django.core.management.base import BaseCommand
from suppliers.models import Supplier

SUPPLIERS_DATA = [
    ("CERCO Distribution", "Ali Hassan", "074111222", "ali@cerco.ga", "ZI de la Charbonnière", "Libreville", "Gabon"),
    ("Tech Afrique SARL", "Pierre Mouele", "077222333", "contact@techafrique.ga", "Owendo Port", "Libreville", "Gabon"),
    ("GSM Import Gabon", "Wang Lei", "066333444", "", "PK8 Route Nationale", "Libreville", "Gabon"),
    ("Electro Plus Gabon", "Mamadou Diallo", "074444555", "electroplus@gmail.com", "Boulevard Triomphal", "Libreville", "Gabon"),
    ("Camtel Electronics", "Jean Nguele", "077555666", "", "Akanda Zone Commerciale", "Libreville", "Gabon"),
    ("Phoneland SARL", "Ibrahim Bah", "062666777", "phoneland@gmail.com", "PK12 Nzeng-Ayong", "Libreville", "Gabon"),
    ("DigiTech Gabon", "Carlos Mendes", "066777888", "digitech@gmail.com", "Quartier Lalala", "Libreville", "Gabon"),
    ("Mobile Store Distribution", "Aminata Sy", "074888999", "", "Centre Commercial Mbolo", "Libreville", "Gabon"),
]


class Command(BaseCommand):
    help = 'Popule la base avec des fournisseurs de démonstration'

    def handle(self, *args, **options):
        created = 0
        for name, contact, phone, email, address, city, country in SUPPLIERS_DATA:
            _, was_created = Supplier.objects.get_or_create(
                name=name,
                defaults={
                    'contact_name': contact,
                    'phone': phone,
                    'email': email,
                    'address': address,
                    'city': city,
                    'country': country,
                }
            )
            if was_created:
                created += 1
        self.stdout.write(self.style.SUCCESS(f'[OK] {created} fournisseurs créés'))
