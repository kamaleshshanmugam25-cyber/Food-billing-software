from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from .models import StaffProfile, Role

class UserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source='profile.role', read_only=True)
    phone = serializers.CharField(source='profile.phone', read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'role', 'phone', 'is_staff', 'is_superuser', 'is_active', 'date_joined']

    def get_full_name(self, obj):
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name if name else obj.username

class StaffCreateUpdateSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(choices=Role.choices, default=Role.CASHIER)
    phone = serializers.CharField(required=False, allow_blank=True, default='')
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'first_name', 'last_name', 'email', 'role', 'phone', 'is_active']

    def create(self, validated_data):
        role = validated_data.pop('role', Role.CASHIER)
        phone = validated_data.pop('phone', '')
        password = validated_data.pop('password', None)
        if not password:
            password = 'Pass@123'
        
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        if role == Role.ADMIN:
            user.is_staff = True
        user.save()
        
        profile, _ = StaffProfile.objects.get_or_create(user=user)
        profile.role = role
        profile.phone = phone
        profile.save()
        return user

    def update(self, instance, validated_data):
        role = validated_data.pop('role', None)
        phone = validated_data.pop('phone', None)
        password = validated_data.pop('password', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)

        if role:
            if role == Role.ADMIN:
                instance.is_staff = True
            elif not instance.is_superuser:
                instance.is_staff = False

        instance.save()

        profile, _ = StaffProfile.objects.get_or_create(user=instance)
        if role:
            profile.role = role
        if phone is not None:
            profile.phone = phone
        profile.save()
        return instance

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')

        if username and password:
            user = authenticate(username=username, password=password)
            if not user:
                raise serializers.ValidationError('Invalid username or password.')
            if not user.is_active:
                raise serializers.ValidationError('User account is deactivated.')
            attrs['user'] = user
            return attrs
        raise serializers.ValidationError('Both username and password are required.')
