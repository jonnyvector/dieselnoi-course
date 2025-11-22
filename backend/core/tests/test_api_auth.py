"""Tests for authentication and authorization."""
import pytest
from django.contrib.auth import get_user_model
from rest_framework import status

User = get_user_model()


@pytest.mark.django_db
class TestUserRegistration:
    """Tests for user registration."""
    
    def test_register_user_success(self, api_client):
        data = {
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'securepass123',
            'password_confirm': 'securepass123'
        }
        response = api_client.post('/api/auth/register/', data)

        assert response.status_code == status.HTTP_201_CREATED
        assert 'user' in response.data
        assert User.objects.filter(username='newuser').exists()

    def test_register_password_mismatch(self, api_client):
        data = {
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'pass1',
            'password_confirm': 'pass2'
        }
        response = api_client.post('/api/auth/register/', data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_duplicate_username(self, api_client, user):
        data = {
            'username': 'testuser',  # Already exists
            'email': 'another@example.com',
            'password': 'pass123',
            'password_confirm': 'pass123'
        }
        response = api_client.post('/api/auth/register/', data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestUserLogin:
    """Tests for user login."""

    def test_login_success(self, api_client, user):
        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        response = api_client.post('/api/auth/login/', data)

        assert response.status_code == status.HTTP_200_OK
        assert 'user' in response.data
        assert response.data['user']['username'] == 'testuser'

    def test_login_wrong_password(self, api_client, user):
        data = {
            'username': 'testuser',
            'password': 'wrongpassword'
        }
        response = api_client.post('/api/auth/login/', data)
        # Should return 401 Unauthorized for wrong password
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_nonexistent_user(self, api_client):
        data = {
            'username': 'nonexistent',
            'password': 'password'
        }
        response = api_client.post('/api/auth/login/', data)
        # Should return 401 Unauthorized for nonexistent user
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestUserLogout:
    """Tests for user logout."""

    def test_logout_authenticated(self, authenticated_client):
        response = authenticated_client.post('/api/auth/logout/')
        assert response.status_code == status.HTTP_200_OK

    def test_logout_unauthenticated(self, api_client):
        response = api_client.post('/api/auth/logout/')
        # Should still return 200 even if not logged in
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_403_FORBIDDEN]


@pytest.mark.django_db
class TestGetCurrentUser:
    """Tests for getting current user info."""

    def test_get_user_authenticated(self, authenticated_client, user):
        response = authenticated_client.get('/api/auth/user/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['username'] == 'testuser'
        assert response.data['email'] == 'test@example.com'

    def test_get_user_unauthenticated(self, api_client):
        response = api_client.get('/api/auth/user/')
        assert response.status_code == status.HTTP_403_FORBIDDEN
