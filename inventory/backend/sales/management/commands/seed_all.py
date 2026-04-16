from django.core.management.base import BaseCommand
from django.core import management


class Command(BaseCommand):
    help = "Lance tous les seeds dans l'ordre"

    def handle(self, *args, **options):
        self.stdout.write('Démarrage du peuplement...')
        management.call_command('seed_users')
        management.call_command('seed_products')
        management.call_command('seed_clients')
        management.call_command('seed_suppliers')
        management.call_command('seed_sales', days=30, sales_per_day=8)
        self.stdout.write(self.style.SUCCESS('Base de données peuplée avec succès!'))
