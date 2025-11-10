#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Restoring local development settings...${NC}\n"

# Restore Django settings if backup exists
if [ -f backend/backend/settings.py.backup ]; then
    mv backend/backend/settings.py.backup backend/backend/settings.py
    echo -e "${GREEN}✓ Django settings restored${NC}"
else
    echo -e "${YELLOW}! No Django settings backup found${NC}"
fi

# Restore frontend .env.local if backup exists
if [ -f frontend/.env.local.backup ]; then
    mv frontend/.env.local.backup frontend/.env.local
    echo -e "${GREEN}✓ Frontend environment restored${NC}"
else
    # If no backup, set back to localhost
    if [ -f frontend/.env.local ]; then
        sed -i.tmp "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=http://localhost:8000|" frontend/.env.local
        rm frontend/.env.local.tmp
        echo -e "${GREEN}✓ Frontend environment reset to localhost${NC}"
    fi
fi

# Clean up IP file
rm -f .local-network-ip

echo -e "\n${GREEN}✓ Local network configuration removed${NC}\n"
echo -e "${YELLOW}Remember to restart your servers with local configuration!${NC}"
echo -e "Backend: ${BLUE}./venv/bin/python manage.py runserver${NC}"
echo -e "Frontend: ${BLUE}npm run dev${NC}\n"
