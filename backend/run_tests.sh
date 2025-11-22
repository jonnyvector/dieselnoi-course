#!/bin/bash
# Quick test runner script

# Colors for output
GREEN='\033[0.32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🧪 Running Dieselnoi Platform Tests..."
echo ""

# Activate virtual environment if not already activated
if [ -z "$VIRTUAL_ENV" ]; then
    source venv/bin/activate
fi

# Run tests with coverage
./venv/bin/pytest -v --cov=core --cov-report=term-missing --cov-report=html

# Check exit code
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ Tests passed!${NC}"
    echo "📊 Coverage report generated in htmlcov/index.html"
else
    echo -e "\n${RED}❌ Some tests failed${NC}"
    exit 1
fi
