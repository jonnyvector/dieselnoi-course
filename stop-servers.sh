#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Stopping development servers...${NC}\n"

# Kill servers using saved PIDs
if [ -f .server-backend.pid ]; then
    BACKEND_PID=$(cat .server-backend.pid)
    kill $BACKEND_PID 2>/dev/null
    echo -e "${GREEN}✓ Stopped backend server${NC}"
    rm .server-backend.pid
fi

if [ -f .server-frontend.pid ]; then
    FRONTEND_PID=$(cat .server-frontend.pid)
    kill $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}✓ Stopped frontend server${NC}"
    rm .server-frontend.pid
fi

# Force kill any remaining processes on these ports
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null

echo -e "\n${GREEN}✓ All servers stopped${NC}\n"
