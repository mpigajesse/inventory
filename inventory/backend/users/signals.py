from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import UserProfile


@receiver(post_save, sender=User)
def create_user_profile(sender, instance: User, created: bool, **kwargs) -> None:
    """Crée automatiquement un UserProfile à la création d'un User.

    Utilise get_or_create pour être idempotent en cas de race condition
    ou d'appel multiple (seed, migration, tests).
    """
    if created:
        UserProfile.objects.get_or_create(user=instance)

# NOTE: Le second signal save_user_profile (qui appelait instance.profile.save()
# à chaque sauvegarde d'un User) a été supprimé intentionnellement :
# - Il causait un double save inutile à chaque modification d'un User
# - Il risquait d'écraser des modifications concurrentes du profil
# - Il pouvait créer des boucles si le profil avait lui-même des signaux
# Les modifications du profil doivent être faites explicitement via profile.save().
