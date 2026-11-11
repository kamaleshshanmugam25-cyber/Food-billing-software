from rest_framework import permissions

class IsAdminRole(permissions.BasePermission):
    """
    Allows access only to Admin users or superusers.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        profile = getattr(request.user, 'profile', None)
        return bool(profile and profile.role == 'admin')

class IsCashierOrAdmin(permissions.BasePermission):
    """
    Allows access to authenticated staff (both Cashier and Admin).
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Allows read-only access to all authenticated staff, but write access only to Admins.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.user.is_superuser:
            return True
        profile = getattr(request.user, 'profile', None)
        return bool(profile and profile.role == 'admin')
