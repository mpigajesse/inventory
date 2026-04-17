from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    # DELETE autorisé : l'utilisateur peut supprimer ses propres notifications lues.
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        user = self.request.user

        # Admins can inspect any user's notifications via ?all=true&recipient=<id>
        if user.is_staff and self.request.query_params.get('all', '').lower() == 'true':
            recipient_id = self.request.query_params.get('recipient')
            qs = Notification.objects.all().select_related('related_product', 'recipient')
            if recipient_id:
                qs = qs.filter(recipient_id=recipient_id)
        else:
            qs = (
                Notification.objects.filter(recipient=user)
                .select_related('related_product')
            )

        # Filter by read status: ?is_read=true|false
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            qs = qs.filter(is_read=is_read.lower() == 'true')

        # Filter by type: ?type=stock_low|stock_critical|new_sale|new_client|system
        notif_type = self.request.query_params.get('type')
        if notif_type:
            qs = qs.filter(notification_type=notif_type)

        # Polling support: ?since=<ISO 8601 datetime> — only newer notifications
        since = self.request.query_params.get('since')
        if since:
            qs = qs.filter(created_at__gt=since)

        return qs.order_by('-created_at')

    # ------------------------------------------------------------------ #
    #  Single mark-read (detail)                                           #
    # ------------------------------------------------------------------ #

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request: Request, pk=None) -> Response:
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response({'status': 'marked as read'}, status=status.HTTP_200_OK)

    # ------------------------------------------------------------------ #
    #  Bulk mark-read (list)                                               #
    # ------------------------------------------------------------------ #

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request: Request) -> Response:
        updated = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'updated': updated}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='mark-read-bulk')
    def mark_read_bulk(self, request: Request) -> Response:
        ids = request.data.get('ids', [])
        if not isinstance(ids, list):
            return Response(
                {'detail': '`ids` doit être une liste d\'identifiants.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        updated = (
            self.get_queryset()
            .filter(id__in=ids, is_read=False)
            .update(is_read=True)
        )
        return Response({'updated': updated}, status=status.HTTP_200_OK)

    # ------------------------------------------------------------------ #
    #  Delete — utilisateur supprime ses propres notifications lues        #
    # ------------------------------------------------------------------ #

    def destroy(self, request: Request, *args, **kwargs) -> Response:
        notification = self.get_object()
        # Un utilisateur ne peut supprimer que ses propres notifications.
        if notification.recipient_id != request.user.pk:
            raise PermissionDenied("Vous ne pouvez supprimer que vos propres notifications.")
        # Seules les notifications déjà lues peuvent être supprimées.
        if not notification.is_read:
            return Response(
                {'detail': 'Marquez la notification comme lue avant de la supprimer.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        notification.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ------------------------------------------------------------------ #
    #  Unread count + latest 5 (for Topbar dropdown)                      #
    # ------------------------------------------------------------------ #

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request: Request) -> Response:
        qs = self.get_queryset().filter(is_read=False)
        count = qs.count()
        latest = qs[:5]
        return Response(
            {
                'count': count,
                'notifications': NotificationSerializer(latest, many=True).data,
            },
            status=status.HTTP_200_OK,
        )
