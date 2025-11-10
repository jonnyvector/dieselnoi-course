#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Setting up local network access...${NC}\n"

# Get local IP address
LOCAL_IP=$(ipconfig getifaddr en0)

if [ -z "$LOCAL_IP" ]; then
    # Try en1 if en0 doesn't work (some Macs use different interface)
    LOCAL_IP=$(ipconfig getifaddr en1)
fi

if [ -z "$LOCAL_IP" ]; then
    echo -e "${RED}✗ Could not detect local IP address${NC}"
    echo "Please check your WiFi connection and try again."
    exit 1
fi

echo -e "${GREEN}✓ Detected local IP: $LOCAL_IP${NC}\n"

# Update Django settings
echo "Updating Django settings..."
SETTINGS_FILE="backend/backend/settings.py"

# Backup original settings
cp $SETTINGS_FILE "${SETTINGS_FILE}.backup"

# Update ALLOWED_HOSTS
if grep -q "# LOCAL_NETWORK_HOST" $SETTINGS_FILE; then
    # Replace existing local network host
    sed -i.tmp "/# LOCAL_NETWORK_HOST/c\\    '$LOCAL_IP',  # LOCAL_NETWORK_HOST" $SETTINGS_FILE
    rm "${SETTINGS_FILE}.tmp"
else
    # Add local network host
    sed -i.tmp "s/ALLOWED_HOSTS = \[/ALLOWED_HOSTS = [\n    '$LOCAL_IP',  # LOCAL_NETWORK_HOST\n/" $SETTINGS_FILE
    rm "${SETTINGS_FILE}.tmp"
fi

# Update CORS_ALLOWED_ORIGINS
if grep -q "# LOCAL_NETWORK_CORS" $SETTINGS_FILE; then
    sed -i.tmp "/# LOCAL_NETWORK_CORS/c\\    'http://$LOCAL_IP:3000',  # LOCAL_NETWORK_CORS" $SETTINGS_FILE
    rm "${SETTINGS_FILE}.tmp"
else
    sed -i.tmp "s|CORS_ALLOWED_ORIGINS = \[|CORS_ALLOWED_ORIGINS = [\n    'http://$LOCAL_IP:3000',  # LOCAL_NETWORK_CORS\n|" $SETTINGS_FILE
    rm "${SETTINGS_FILE}.tmp"
fi

# Update or add CSRF_TRUSTED_ORIGINS
if grep -q "CSRF_TRUSTED_ORIGINS" $SETTINGS_FILE; then
    if grep -q "# LOCAL_NETWORK_CSRF" $SETTINGS_FILE; then
        sed -i.tmp "/# LOCAL_NETWORK_CSRF/d" $SETTINGS_FILE
        sed -i.tmp "s|CSRF_TRUSTED_ORIGINS = \[|CSRF_TRUSTED_ORIGINS = [\n    'http://$LOCAL_IP:8000',  # LOCAL_NETWORK_CSRF\n    'http://$LOCAL_IP:3000',  # LOCAL_NETWORK_CSRF\n|" $SETTINGS_FILE
        rm "${SETTINGS_FILE}.tmp"
    else
        sed -i.tmp "s|CSRF_TRUSTED_ORIGINS = \[|CSRF_TRUSTED_ORIGINS = [\n    'http://$LOCAL_IP:8000',  # LOCAL_NETWORK_CSRF\n    'http://$LOCAL_IP:3000',  # LOCAL_NETWORK_CSRF\n|" $SETTINGS_FILE
        rm "${SETTINGS_FILE}.tmp"
    fi
else
    echo -e "\nCSRF_TRUSTED_ORIGINS = [\n    'http://$LOCAL_IP:8000',  # LOCAL_NETWORK_CSRF\n    'http://$LOCAL_IP:3000',  # LOCAL_NETWORK_CSRF\n]" >> $SETTINGS_FILE
fi

echo -e "${GREEN}✓ Django settings updated${NC}"

# Update frontend .env.local
echo "Updating frontend environment..."
ENV_FILE="frontend/.env.local"

# Create or update .env.local
if [ -f "$ENV_FILE" ]; then
    # Backup
    cp $ENV_FILE "${ENV_FILE}.backup"
    # Update existing
    if grep -q "NEXT_PUBLIC_API_URL" $ENV_FILE; then
        sed -i.tmp "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=http://$LOCAL_IP:8000|" $ENV_FILE
        rm "${ENV_FILE}.tmp"
    else
        echo "NEXT_PUBLIC_API_URL=http://$LOCAL_IP:8000" >> $ENV_FILE
    fi
else
    echo "NEXT_PUBLIC_API_URL=http://$LOCAL_IP:8000" > $ENV_FILE
fi

echo -e "${GREEN}✓ Frontend environment updated${NC}\n"

# Save local IP for cleanup
echo "$LOCAL_IP" > .local-network-ip

# Print instructions
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Local network access configured!${NC}\n"
echo -e "${YELLOW}NEXT STEPS:${NC}"
echo "1. Start your Django backend:"
echo -e "   ${BLUE}cd backend && ./venv/bin/python manage.py runserver 0.0.0.0:8000${NC}\n"
echo "2. Start your Next.js frontend (in new terminal):"
echo -e "   ${BLUE}cd frontend && npm run dev${NC}\n"
echo "3. On your phone (connected to same WiFi):"
echo -e "   ${GREEN}http://$LOCAL_IP:3000${NC}\n"
echo -e "${YELLOW}IMPORTANT:${NC}"
echo "• Your phone must be on the SAME WiFi network as this computer"
echo "• If it doesn't work, check your Mac's firewall settings"
echo -e "\n${YELLOW}To restore original settings:${NC}"
echo -e "   ${BLUE}./stop-local-network.sh${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
