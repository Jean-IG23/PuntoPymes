from django.contrib.auth.models import Group, Permission

# Crear Grupos
owner_group, _ = Group.objects.get_or_create(name='OWNER')
manager_group, _ = Group.objects.get_or_create(name='MANAGER')