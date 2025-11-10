#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get local IP if available
LOCAL_IP=$(cat .local-network-ip 2>/dev/null || echo "localhost")

echo -e "${BLUE}Starting development servers...${NC}\n"

# Kill any existing servers on these ports
echo "Checking for existing servers..."
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
sleep 1

# Start Django backend
echo "Starting Django backend on 0.0.0.0:8000..."
cd backend
./venv/bin/python manage.py runserver 0.0.0.0:8000 > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..
sleep 2

# Check if backend started successfully
if ps -p $BACKEND_PID > /dev/null; then
    echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
else
    echo -e "${RED}✗ Backend failed to start${NC}"
    echo "Check backend.log for errors"
    exit 1
fi

# Start Next.js frontend
echo "Starting Next.js frontend on :3000..."
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
sleep 3

# Check if frontend started successfully
if ps -p $FRONTEND_PID > /dev/null; then
    echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
else
    echo -e "${RED}✗ Frontend failed to start${NC}"
    echo "Check frontend.log for errors"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Save PIDs for cleanup
echo "$BACKEND_PID" > .server-backend.pid
echo "$FRONTEND_PID" > .server-frontend.pid

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Both servers are running!${NC}\n"

if [ "$LOCAL_IP" != "localhost" ]; then
    echo -e "${YELLOW}Access on your phone:${NC}"
    echo -e "   ${GREEN}http://$LOCAL_IP:3000${NC}\n"
fi

echo -e "${YELLOW}Local access:${NC}"
echo -e "   Frontend: ${BLUE}http://localhost:3000${NC}"
echo -e "   Backend:  ${BLUE}http://localhost:8000${NC}"
echo -e "   Admin:    ${BLUE}http://localhost:8000/admin${NC}\n"

echo -e "${YELLOW}View logs:${NC}"
echo -e "   Backend:  ${BLUE}tail -f backend.log${NC}"
echo -e "   Frontend: ${BLUE}tail -f frontend.log${NC}\n"

echo -e "${YELLOW}To stop servers:${NC}"
echo -e "   ${BLUE}./stop-servers.sh${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
