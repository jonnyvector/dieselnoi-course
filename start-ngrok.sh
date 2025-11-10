#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting ngrok tunnels...${NC}\n"

# Start ngrok for backend (port 8000) in background
echo "Starting backend ngrok tunnel..."
ngrok http 8000 > /dev/null &
BACKEND_PID=$!
sleep 3

# Start ngrok for frontend (port 3000) in background
echo "Starting frontend ngrok tunnel..."
ngrok http 3000 > /dev/null &
FRONTEND_PID=$!
sleep 3

# Get ngrok URLs from API
echo -e "\nFetching ngrok URLs..."
BACKEND_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)
FRONTEND_URL=$(curl -s http://localhost:4041/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$BACKEND_URL" ] || [ -z "$FRONTEND_URL" ]; then
    echo -e "${YELLOW}Warning: Could not automatically fetch ngrok URLs.${NC}"
    echo "Please check ngrok web interfaces:"
    echo "  Backend: http://localhost:4040"
    echo "  Frontend: http://localhost:4041"
    exit 1
fi

# Extract hostnames
BACKEND_HOST=$(echo $BACKEND_URL | sed 's|https://||')
FRONTEND_HOST=$(echo $FRONTEND_URL | sed 's|https://||')

echo -e "${GREEN}✓ Backend URL: $BACKEND_URL${NC}"
echo -e "${GREEN}✓ Frontend URL: $FRONTEND_URL${NC}\n"

# Update Django settings
echo "Updating Django settings..."
SETTINGS_FILE="backend/backend/settings.py"

# Backup original settings
cp $SETTINGS_FILE "${SETTINGS_FILE}.backup"

# Update ALLOWED_HOSTS
if grep -q "ALLOWED_HOSTS.*ngrok" $SETTINGS_FILE; then
    # Replace existing ngrok host
    sed -i.tmp "s|'[^']*\.ngrok\.io'|'$BACKEND_HOST'|g" $SETTINGS_FILE
    rm "${SETTINGS_FILE}.tmp"
else
    # Add ngrok host
    sed -i.tmp "s/ALLOWED_HOSTS = \[/ALLOWED_HOSTS = ['$BACKEND_HOST', /" $SETTINGS_FILE
    rm "${SETTINGS_FILE}.tmp"
fi

# Update CORS_ALLOWED_ORIGINS
if grep -q "CORS_ALLOWED_ORIGINS.*ngrok" $SETTINGS_FILE; then
    sed -i.tmp "s|'https://[^']*\.ngrok\.io'|'$FRONTEND_URL'|g" $SETTINGS_FILE
    rm "${SETTINGS_FILE}.tmp"
else
    sed -i.tmp "s|CORS_ALLOWED_ORIGINS = \[|CORS_ALLOWED_ORIGINS = [\n    '$FRONTEND_URL',|" $SETTINGS_FILE
    rm "${SETTINGS_FILE}.tmp"
fi

# Update or add CSRF_TRUSTED_ORIGINS
if grep -q "CSRF_TRUSTED_ORIGINS" $SETTINGS_FILE; then
    if grep -q "CSRF_TRUSTED_ORIGINS.*ngrok" $SETTINGS_FILE; then
        sed -i.tmp "s|'https://[^']*\.ngrok\.io'|'$BACKEND_URL', '$FRONTEND_URL'|g" $SETTINGS_FILE
        rm "${SETTINGS_FILE}.tmp"
    else
        sed -i.tmp "s|CSRF_TRUSTED_ORIGINS = \[|CSRF_TRUSTED_ORIGINS = [\n    '$BACKEND_URL',\n    '$FRONTEND_URL',|" $SETTINGS_FILE
        rm "${SETTINGS_FILE}.tmp"
    fi
else
    echo -e "\nCSRF_TRUSTED_ORIGINS = [\n    '$BACKEND_URL',\n    '$FRONTEND_URL',\n]" >> $SETTINGS_FILE
fi

echo -e "${GREEN}✓ Django settings updated${NC}"

# Update frontend .env.local
echo "Updating frontend environment..."
ENV_FILE="frontend/.env.local"

# Create or update .env.local
if [ -f "$ENV_FILE" ]; then
    # Update existing
    if grep -q "NEXT_PUBLIC_API_URL" $ENV_FILE; then
        sed -i.tmp "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=$BACKEND_URL|" $ENV_FILE
        rm "${ENV_FILE}.tmp"
    else
        echo "NEXT_PUBLIC_API_URL=$BACKEND_URL" >> $ENV_FILE
    fi
else
    echo "NEXT_PUBLIC_API_URL=$BACKEND_URL" > $ENV_FILE
fi

echo -e "${GREEN}✓ Frontend environment updated${NC}\n"

# Print instructions
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ ngrok tunnels are running!${NC}\n"
echo -e "${YELLOW}NEXT STEPS:${NC}"
echo "1. Restart your Django backend:"
echo -e "   ${BLUE}cd backend && ./venv/bin/python manage.py runserver${NC}\n"
echo "2. Restart your Next.js frontend:"
echo -e "   ${BLUE}cd frontend && npm run dev${NC}\n"
echo "3. Visit on your phone:"
echo -e "   ${GREEN}$FRONTEND_URL${NC}\n"
echo -e "${YELLOW}ngrok Web Interfaces:${NC}"
echo "   Backend: http://localhost:4040"
echo "   Frontend: http://localhost:4041"
echo -e "\n${YELLOW}To stop ngrok tunnels:${NC}"
echo -e "   ${BLUE}./stop-ngrok.sh${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Save PIDs for cleanup
echo "$BACKEND_PID" > .ngrok-backend.pid
echo "$FRONTEND_PID" > .ngrok-frontend.pid

# Save URLs for reference
echo "BACKEND_URL=$BACKEND_URL" > .ngrok-urls
echo "FRONTEND_URL=$FRONTEND_URL" >> .ngrok-urls
