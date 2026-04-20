import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Change on_delete=CASCADE → PROTECT pour :
    - PurchaseOrder.supplier  : évite la destruction en cascade des commandes
    - PurchaseOrderItem.product : préserve l'historique des lignes de commande
    """

    dependencies = [
        ('suppliers', '0001_initial'),
        ('products', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='purchaseorder',
            name='supplier',
            field=models.ForeignKey(
                to='suppliers.supplier',
                on_delete=django.db.models.deletion.PROTECT,
                related_name='orders',
            ),
        ),
        migrations.AlterField(
            model_name='purchaseorderitem',
            name='product',
            field=models.ForeignKey(
                to='products.product',
                on_delete=django.db.models.deletion.PROTECT,
            ),
        ),
    ]
