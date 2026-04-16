from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
import requests
import cloudinary.uploader
from products.models import Category, Product
from stock.models import Stock


CATEGORIES_DATA = [
    {"name": "Téléphones & Smartphones", "description": "Téléphones mobiles et smartphones"},
    {"name": "Accessoires téléphones", "description": "Coques, chargeurs, câbles, écouteurs"},
    {"name": "Ordinateurs & Laptops", "description": "PC portables et de bureau"},
    {"name": "Accessoires informatique", "description": "Souris, claviers, webcams, hubs"},
    {"name": "Audio & Son", "description": "Casques, enceintes, microphones"},
    {"name": "Tablettes", "description": "Tablettes tactiles toutes marques"},
    {"name": "Stockage & Mémoire", "description": "Clés USB, disques durs, cartes SD"},
    {"name": "Réseau & Connectivité", "description": "Routeurs, câbles réseau, switches"},
]

# Real Unsplash photo IDs mapped by product (direct images.unsplash.com URLs — stable and publicly accessible)
# Format: https://images.unsplash.com/photo-{id}?w=400&auto=format&fit=crop
PRODUCT_IMAGE_IDS: dict[str, str] = {
    "BAR001": "1610945265064-0e34e5519bbf",  # Samsung Galaxy A54  — Android phone on desk
    "BAR002": "1632661674596-618f8bbf9f92",  # iPhone 14           — iPhone held in hand
    "BAR003": "1574944985070-8f3ebc6b79d2",  # Tecno Spark 10      — Android smartphone
    "BAR004": "1511707171634-5f897ff02aa9",  # Infinix Hot 30      — generic mobile phone
    "BAR005": "1616348436168-de43ad0db179",  # Samsung Galaxy A14  — Samsung phone flat lay
    "BAR006": "1601784551446-20c326f1b7df",  # Coque Samsung A54   — phone case
    "BAR007": "1583863788434-0f3c4e6e1d5f",  # Chargeur rapide 65W — USB charger
    "BAR008": "1626907757527-2e7f93ad5e48",  # Câble USB-C 1m      — USB-C cable
    "BAR009": "1505740420928-5e560c06d30e",  # Écouteurs Samsung   — earphones/earbuds
    "BAR010": "1609081219090-a6d81d3085bf",  # Film protecteur     — screen protector glass
    "BAR011": "1496181133206-80ce9b88a853",  # Laptop HP 15        — open laptop
    "BAR012": "1588872657578-7efd1f1555ef",  # Dell Inspiron 15    — Dell laptop on desk
    "BAR013": "1525547719571-a2d4ac8945e2",  # Acer Aspire 5       — silver laptop
    "BAR014": "1517694712202-14dd9538aa97",  # Lenovo IdeaPad 3    — laptop keyboard
    "BAR015": "1527864550417-7fd91fc51a46",  # Souris Logitech     — wireless mouse
    "BAR016": "1587829741301-dc798b83add3",  # Clavier USB         — mechanical keyboard
    "BAR017": "1591605267530-a61f3b85f7c8",  # Webcam HD 1080p     — webcam on monitor
    "BAR018": "1558618666-fcd25c85cd64",     # Hub USB 4 ports     — USB hub
    "BAR019": "1615655406736-b37a4b5a5c8b",  # Tapis de souris XXL — large mouse pad
    "BAR020": "1505740420928-5e560c06d30e",  # Casque JBL          — headphones
    "BAR021": "1608043152269-423dbba4e7e1",  # Enceinte JBL        — bluetooth speaker
    "BAR022": "1590658268037-41402fba1635",  # Écouteurs sans fil  — wireless earbuds
    "BAR023": "1598550476309-12e84b4c604a",  # Microphone USB      — USB microphone studio
    "BAR024": "1544244015-0df4512b69c2",     # Samsung Tab A8      — Android tablet
    "BAR025": "1561154464-02584673d65f",     # iPad 9ème génération— iPad on desk
    "BAR026": "1601784551446-20c326f1b7df",  # Coque tablette      — tablet case
    "BAR027": "1558618666-fcd25c85cd64",     # Clé USB 64GB        — USB flash drive
    "BAR028": "1597852074816-d8c8b4c5e3f2",  # Disque dur externe  — external hard drive
    "BAR029": "1544244015-0df4512b69c2",     # Carte SD 128GB      — memory card
    "BAR030": "1597853468-f0e3516ffa5c",     # SSD externe 500GB   — portable SSD
    "BAR031": "1558618666-fcd25c85cd64",     # Clé USB 32GB        — USB stick
    "BAR032": "1544197150-b99a580bb6d0",     # Routeur WiFi        — WiFi router
    "BAR033": "1558494949-ef010cbdcc31",     # Câble RJ45 5m       — ethernet cable
    "BAR034": "1544197150-b99a580bb6d0",     # Switch 8 ports      — network switch
    "BAR035": "1544197150-b99a580bb6d0",     # Répéteur WiFi       — WiFi extender
    "BAR036": "1610945265064-0e34e5519bbf",  # Samsung S23 FE      — Samsung Galaxy phone
    "BAR037": "1583863788434-0f3c4e6e1d5f",  # Chargeur iPhone     — Apple charger cable
    "BAR038": "1553062407-98eeb64c6a62",     # Sac à dos laptop    — laptop backpack
    "BAR039": "1548690312-1b0bec76d4f0",     # Onduleur 650VA      — UPS / power backup
    "BAR040": "1608043152269-423dbba4e7e1",  # Barre de son TV     — soundbar speaker
}

# (name, category_name, purchase_price, selling_price, barcode, _unused_query, min_stock, max_stock, initial_qty)
PRODUCTS_DATA = [
    ("Samsung Galaxy A54", "Téléphones & Smartphones", 120000, 145000, "BAR001", "", 5, 30, 15),
    ("iPhone 14", "Téléphones & Smartphones", 350000, 395000, "BAR002", "", 3, 15, 8),
    ("Tecno Spark 10", "Téléphones & Smartphones", 65000, 82000, "BAR003", "", 10, 50, 25),
    ("Infinix Hot 30", "Téléphones & Smartphones", 55000, 70000, "BAR004", "", 10, 50, 20),
    ("Samsung Galaxy A14", "Téléphones & Smartphones", 75000, 95000, "BAR005", "", 8, 40, 18),
    ("Coque Samsung A54", "Accessoires téléphones", 3000, 5000, "BAR006", "", 20, 100, 50),
    ("Chargeur rapide 65W", "Accessoires téléphones", 8000, 12000, "BAR007", "", 15, 80, 35),
    ("Câble USB-C 1m", "Accessoires téléphones", 2500, 4000, "BAR008", "", 30, 150, 80),
    ("Écouteurs Samsung", "Accessoires téléphones", 12000, 18000, "BAR009", "", 10, 60, 25),
    ("Film protecteur écran", "Accessoires téléphones", 1500, 3000, "BAR010", "", 40, 200, 100),
    ("Laptop HP 15", "Ordinateurs & Laptops", 280000, 320000, "BAR011", "", 3, 15, 6),
    ("Dell Inspiron 15", "Ordinateurs & Laptops", 320000, 365000, "BAR012", "", 2, 10, 4),
    ("Acer Aspire 5", "Ordinateurs & Laptops", 250000, 290000, "BAR013", "", 3, 12, 5),
    ("Lenovo IdeaPad 3", "Ordinateurs & Laptops", 265000, 305000, "BAR014", "", 3, 12, 4),
    ("Souris sans fil Logitech", "Accessoires informatique", 15000, 22000, "BAR015", "", 10, 60, 30),
    ("Clavier USB", "Accessoires informatique", 12000, 18000, "BAR016", "", 8, 40, 20),
    ("Webcam HD 1080p", "Accessoires informatique", 25000, 35000, "BAR017", "", 5, 25, 12),
    ("Hub USB 4 ports", "Accessoires informatique", 8000, 13000, "BAR018", "", 15, 60, 28),
    ("Tapis de souris XXL", "Accessoires informatique", 6000, 10000, "BAR019", "", 20, 80, 40),
    ("Casque Bluetooth JBL", "Audio & Son", 35000, 48000, "BAR020", "", 5, 30, 12),
    ("Enceinte portable JBL", "Audio & Son", 45000, 60000, "BAR021", "", 4, 25, 10),
    ("Écouteurs sans fil", "Audio & Son", 28000, 40000, "BAR022", "", 6, 35, 15),
    ("Microphone USB", "Audio & Son", 30000, 42000, "BAR023", "", 3, 20, 8),
    ("Samsung Galaxy Tab A8", "Tablettes", 145000, 175000, "BAR024", "", 3, 15, 6),
    ("iPad 9ème génération", "Tablettes", 220000, 260000, "BAR025", "", 2, 10, 4),
    ("Coque tablette universel", "Tablettes", 8000, 14000, "BAR026", "", 10, 50, 20),
    ("Clé USB 64GB SanDisk", "Stockage & Mémoire", 8000, 12000, "BAR027", "", 20, 100, 50),
    ("Disque dur externe 1TB", "Stockage & Mémoire", 55000, 72000, "BAR028", "", 5, 25, 10),
    ("Carte SD 128GB Samsung", "Stockage & Mémoire", 18000, 26000, "BAR029", "", 15, 70, 35),
    ("SSD externe 500GB", "Stockage & Mémoire", 65000, 85000, "BAR030", "", 4, 20, 8),
    ("Clé USB 32GB", "Stockage & Mémoire", 5000, 8000, "BAR031", "", 25, 120, 60),
    ("Routeur WiFi TP-Link", "Réseau & Connectivité", 35000, 50000, "BAR032", "", 5, 25, 10),
    ("Câble RJ45 5m", "Réseau & Connectivité", 5000, 8000, "BAR033", "", 20, 80, 40),
    ("Switch 8 ports", "Réseau & Connectivité", 28000, 40000, "BAR034", "", 4, 20, 8),
    ("Répéteur WiFi", "Réseau & Connectivité", 22000, 32000, "BAR035", "", 6, 30, 12),
    ("Samsung Galaxy S23 FE", "Téléphones & Smartphones", 220000, 260000, "BAR036", "", 3, 15, 7),
    ("Chargeur iPhone", "Accessoires téléphones", 15000, 22000, "BAR037", "", 10, 50, 25),
    ("Sac à dos laptop 15", "Accessoires informatique", 25000, 38000, "BAR038", "", 8, 35, 15),
    ("Onduleur 650VA", "Réseau & Connectivité", 55000, 75000, "BAR039", "", 3, 15, 5),
    ("Barre de son TV", "Audio & Son", 65000, 88000, "BAR040", "", 2, 10, 4),
]


class Command(BaseCommand):
    help = 'Popule la base de données avec des catégories et produits de démonstration'

    def add_arguments(self, parser):
        parser.add_argument(
            '--skip-images',
            action='store_true',
            help='Ne pas télécharger les images depuis Unsplash',
        )

    def handle(self, *args, **options):
        skip_images = options['skip_images']

        # 1. Create categories
        self.stdout.write('Création des catégories...')
        categories = {}
        for cat_data in CATEGORIES_DATA:
            cat, created = Category.objects.get_or_create(
                name=cat_data['name'],
                defaults={'description': cat_data['description']},
            )
            categories[cat_data['name']] = cat
            status = 'créée' if created else 'existante'
            self.stdout.write(f"  {'[+]' if created else '[~]'} {cat.name} ({status})")

        # 2. Resolve admin user for created_by
        admin_user = User.objects.filter(is_superuser=True).first() or User.objects.first()
        if admin_user is None:
            self.stdout.write(self.style.WARNING(
                'Aucun utilisateur trouvé — les produits seront créés sans created_by.'
            ))

        # 3. Create products
        self.stdout.write('\nCréation des produits...')
        created_count = 0
        skipped_count = 0

        for product_data in PRODUCTS_DATA:
            name, cat_name, purchase_price, selling_price, barcode, img_query, min_stock, max_stock, initial_qty = product_data

            if Product.objects.filter(barcode=barcode).exists():
                self.stdout.write(f"  [~] {name} (existe déjà, ignoré)")
                skipped_count += 1
                continue

            product = Product.objects.create(
                name=name,
                barcode=barcode,
                category=categories[cat_name],
                purchase_price=purchase_price,
                selling_price=selling_price,
                created_by=admin_user,
                is_active=True,
            )

            # Upload image to Cloudinary sourced from Unsplash
            if not skip_images:
                self._upload_image(product, barcode)
            else:
                self.stdout.write(f"  [+] {name} (sans image)")

            # Create associated stock entry
            Stock.objects.get_or_create(
                product=product,
                defaults={
                    'quantity': initial_qty,
                    'min_threshold': min_stock,
                    'max_threshold': max_stock,
                },
            )

            created_count += 1

        # 4. Summary
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Terminé — {created_count} produit(s) créé(s), '
            f'{skipped_count} ignoré(s), '
            f'{len(CATEGORIES_DATA)} catégories.'
        ))

    def _upload_image(self, product: Product, barcode: str) -> None:
        """Download an image from Unsplash (direct CDN URL) and upload it to Cloudinary.

        Uses images.unsplash.com direct photo URLs (stable, no API key required).
        source.unsplash.com was deprecated and returns errors since 2022.
        """
        photo_id = PRODUCT_IMAGE_IDS.get(barcode)
        if not photo_id:
            self.stdout.write(f"  [+] {product.name} (aucun photo_id défini — image ignorée)")
            return

        unsplash_url = (
            f"https://images.unsplash.com/photo-{photo_id}"
            "?w=400&auto=format&fit=crop&q=80"
        )
        try:
            response = requests.get(unsplash_url, timeout=15, allow_redirects=True)
            if response.status_code == 200:
                result = cloudinary.uploader.upload(
                    response.content,
                    folder='inventory/products',
                    public_id=f'product_{barcode.lower()}',
                    overwrite=True,
                )
                product.image = result['public_id']
                product.save(update_fields=['image'])
                self.stdout.write(f"  [+] {product.name} (image uploadée)")
            else:
                self.stdout.write(
                    f"  [+] {product.name} (image ignorée — statut HTTP {response.status_code})"
                )
        except requests.RequestException as exc:
            self.stdout.write(f"  [+] {product.name} (image échouée — {exc})")
        except Exception as exc:
            self.stdout.write(f"  [+] {product.name} (upload Cloudinary échoué — {exc})")
