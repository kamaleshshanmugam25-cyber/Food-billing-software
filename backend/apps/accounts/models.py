from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class Role(models.TextChoices):
    ADMIN = 'admin', 'Administrator'
    CASHIER = 'cashier', 'Cashier'

class StaffProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CASHIER)
    phone = models.CharField(max_length=20, blank=True, default='')

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"

    @property
    def is_admin(self):
        return self.role == Role.ADMIN or self.user.is_superuser

    @property
    def is_cashier(self):
        return self.role == Role.CASHIER

@receiver(post_save, sender=User)
def create_or_update_staff_profile(sender, instance, created, **kwargs):
    if created:
        role = Role.ADMIN if instance.is_superuser else Role.CASHIER
        StaffProfile.objects.get_or_create(user=instance, defaults={'role': role})
    else:
        if hasattr(instance, 'profile'):
            instance.profile.save()
