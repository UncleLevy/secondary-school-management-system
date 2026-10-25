from rest_framework.permissions import BasePermission

class IsAdmin(BasePermission):
    """Allow access only to admin users."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'

class IsAdminOrManagement(BasePermission):
    """Allow access to admin and management users."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and \
                request.user.role in ('admin', 'management')

class IsAdminOrReadOnly(BasePermission):
    """Allow read to all authenticated; write to admin only."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return request.user.role == 'admin'