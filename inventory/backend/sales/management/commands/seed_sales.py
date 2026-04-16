import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from django.contrib.auth.models import User
from products.models import Product
from stock.models import Stock, StockMovement
from clients.models import Client
from sales.models import Sale, SaleItem
from invoices.models import Invoice

PAYMENT_METHODS = ['cash', 'cash', 'cash', 'mobile_money', 'card']  # cash most common


class Command(BaseCommand):
    help = 'Génère des ventes de démonstration (30 jours)'

    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=30)
        parser.add_argument('--sales-per-day', type=int, default=5)

    def handle(self, *args, **options):
        days = options['days']
        sales_per_day = options['sales_per_day']

        users = list(User.objects.filter(profile__role__in=['admin', 'vendeur']))
        clients = list(Client.objects.all())
        products = list(Product.objects.filter(is_active=True).select_related('stock'))

        if not users:
            self.stdout.write(self.style.ERROR("Aucun utilisateur trouvé. Lancez seed_users d'abord."))
            return
        if not products:
            self.stdout.write(self.style.ERROR("Aucun produit trouvé. Lancez seed_products d'abord."))
            return

        total_sales = 0
        today = timezone.now().date()

        for day_offset in range(days, 0, -1):
            sale_date = today - timedelta(days=day_offset)
            daily_sales = random.randint(max(1, sales_per_day - 2), sales_per_day + 3)

            for _ in range(daily_sales):
                cashier = random.choice(users)
                client = random.choice(clients) if random.random() > 0.4 else None
                payment_method = random.choice(PAYMENT_METHODS)

                # Pick 1-4 random products
                num_items = random.randint(1, 4)
                available_products = [p for p in products if hasattr(p, 'stock') and p.stock.quantity > 0]
                if not available_products:
                    continue

                sale_products = random.sample(available_products, min(num_items, len(available_products)))

                total_amount = 0
                items_data = []
                for product in sale_products:
                    qty = random.randint(1, min(3, product.stock.quantity))
                    unit_price = product.selling_price
                    subtotal = qty * unit_price
                    total_amount += subtotal
                    items_data.append((product, qty, unit_price, subtotal))

                if total_amount == 0:
                    continue

                amount_paid = total_amount + random.choice([0, 0, 0, 500, 1000, 5000])

                with transaction.atomic():
                    sale = Sale.objects.create(
                        client=client,
                        cashier=cashier,
                        total_amount=total_amount,
                        amount_paid=amount_paid,
                        change_given=amount_paid - total_amount,
                        payment_method=payment_method,
                    )
                    # Backdate
                    Sale.objects.filter(pk=sale.pk).update(
                        created_at=timezone.make_aware(
                            timezone.datetime.combine(
                                sale_date,
                                timezone.datetime.min.time().replace(
                                    hour=random.randint(8, 19),
                                    minute=random.randint(0, 59),
                                )
                            )
                        )
                    )

                    for product, qty, unit_price, subtotal in items_data:
                        SaleItem.objects.create(
                            sale=sale,
                            product=product,
                            quantity=qty,
                            unit_price=unit_price,
                            subtotal=subtotal,
                        )
                        # Decrement stock
                        stock = product.stock
                        qty_before = stock.quantity
                        stock.quantity = max(0, stock.quantity - qty)
                        stock.save()
                        StockMovement.objects.create(
                            product=product,
                            movement_type='sale',
                            quantity=-qty,
                            quantity_before=qty_before,
                            quantity_after=stock.quantity,
                            note=f'Vente #{sale.pk}',
                            performed_by=cashier,
                        )

                    Invoice.objects.create(
                        sale=sale,
                        client=client,
                        total_amount=total_amount,
                        amount_paid=amount_paid,
                        status='paid',
                        issued_by=cashier,
                    )
                    total_sales += 1

        self.stdout.write(self.style.SUCCESS(f'{total_sales} ventes créées sur {days} jours'))
