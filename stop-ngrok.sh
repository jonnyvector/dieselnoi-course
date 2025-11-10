#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Stopping ngrok tunnels...${NC}\n"

# Kill ngrok processes
if [ -f .ngrok-backend.pid ]; then
    BACKEND_PID=$(cat .ngrok-backend.pid)
    kill $BACKEND_PID 2>/dev/null
    echo -e "${GREEN}✓ Stopped backend ngrok tunnel${NC}"
    rm .ngrok-backend.pid
fi

if [ -f .ngrok-frontend.pid ]; then
    FRONTEND_PID=$(cat .ngrok-frontend.pid)
    kill $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}✓ Stopped frontend ngrok tunnel${NC}"
    rm .ngrok-frontend.pid
fi

# Cleanup any remaining ngrok processes (just in case)
pkill -f "ngrok http" 2>/dev/null

# Restore Django settings if backup exists
if [ -f backend/backend/settings.py.backup ]; then
    echo -e "\n${YELLOW}Restore Django settings to original? (y/n)${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        mv backend/backend/settings.py.backup backend/backend/settings.py
        echo -e "${GREEN}✓ Django settings restored${NC}"
    else
        rm backend/backend/settings.py.backup
    fi
fi

# Clean up URLs file
rm -f .ngrok-urls

echo -e "\n${GREEN}✓ ngrok tunnels stopped${NC}\n"
echo -e "${YELLOW}Remember to restart your servers with local configuration!${NC}\n"
