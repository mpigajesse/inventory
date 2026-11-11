import os

from django.core import management
from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = "Lance tous les seeds dans l'ordre"

    def handle(self, *args, **options):
        # Démo publique (DEMO_PUBLIQUE=1, base SQLite neuve à chaque déploiement Render) :
        # - pas d'images téléchargées : le repli Lorem Picsum donnait des photos sans rapport
        #   avec le produit, parfois de vraies personnes ; l'interface affiche alors l'icône
        #   de la catégorie ;
        # - 30 jours de ventes vidaient tout le stock, si bien que la caisse de démo
        #   n'avait plus rien à vendre : on réassortit ensuite (voir _reassort_demo).
        demo = os.environ.get('DEMO_PUBLIQUE') == '1'
        self.stdout.write('Démarrage du peuplement...')
        management.call_command('seed_users')
        management.call_command('seed_products', skip_images=demo)
        management.call_command('seed_clients')
        management.call_command('seed_suppliers')
        management.call_command('seed_sales', days=30, sales_per_day=8)
        if demo:
            self._reassort_demo()
        self.stdout.write(self.style.SUCCESS('Base de données peuplée avec succès!'))

    @transaction.atomic
    def _reassort_demo(self):
        """Remet chaque produit à un niveau plausible, par une vraie entrée de stock.

        Un produit sur sept reste sous son seuil, pour que les alertes de stock
        aient quelque chose à montrer.
        """
        from stock.models import Stock, StockMovement

        stocks = Stock.objects.select_related('product').order_by('product__barcode')
        for i, stock in enumerate(stocks):
            cible = max(stock.min_threshold - 1, 0) if i % 7 == 3 else (stock.min_threshold + stock.max_threshold) // 2
            if cible <= stock.quantity:
                continue
            avant = stock.quantity
            stock.quantity = cible
            stock.save()
            StockMovement.objects.create(
                product=stock.product, movement_type='entry', quantity=cible - avant,
                quantity_before=avant, quantity_after=cible, note='Réassort fournisseur (démo)',
            )
        self.stdout.write(f'Réassort de démonstration : {stocks.count()} produits vérifiés.')
