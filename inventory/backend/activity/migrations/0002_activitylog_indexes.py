# Generated manually — adds performance indexes on ActivityLog.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('activity', '0001_initial'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='activitylog',
            index=models.Index(fields=['-created_at'], name='activity_log_created_at_idx'),
        ),
        migrations.AddIndex(
            model_name='activitylog',
            index=models.Index(fields=['user', '-created_at'], name='activity_log_user_created_idx'),
        ),
        migrations.AddIndex(
            model_name='activitylog',
            index=models.Index(fields=['target_model', 'target_id'], name='activity_log_target_idx'),
        ),
    ]
