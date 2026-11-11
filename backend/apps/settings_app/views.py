from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import RestaurantSettings
from .serializers import RestaurantSettingsSerializer
from apps.accounts.permissions import IsAdminOrReadOnly

class RestaurantSettingsView(APIView):
    permission_classes = [IsAdminOrReadOnly]

    def get(self, request):
        settings = RestaurantSettings.get_settings()
        serializer = RestaurantSettingsSerializer(settings)
        return Response(serializer.data)

    def put(self, request):
        settings = RestaurantSettings.get_settings()
        serializer = RestaurantSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
