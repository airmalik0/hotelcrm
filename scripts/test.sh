#!/bin/bash
# Convenient script to run tests in Docker container

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Container name
CONTAINER="hotelcrm-backend-1"

# Check if container is running
if ! docker ps | grep -q "$CONTAINER"; then
    echo -e "${RED}Error: Container $CONTAINER is not running${NC}"
    echo "Please start the container first: docker compose up -d"
    exit 1
fi

# Default test command
TEST_CMD="uv run python -m pytest"

# Parse arguments
case "$1" in
    "")
        # Run all tests
        echo -e "${GREEN}Running all tests...${NC}"
        TEST_ARGS=""
        ;;
    "quick")
        # Quick test run (stop on first failure)
        echo -e "${YELLOW}Running quick test (stops on first failure)...${NC}"
        TEST_ARGS="-x"
        ;;
    "verbose")
        # Verbose output
        echo -e "${YELLOW}Running tests with verbose output...${NC}"
        TEST_ARGS="-xvs"
        ;;
    "coverage")
        # With coverage
        echo -e "${GREEN}Running tests with coverage...${NC}"
        TEST_ARGS="--cov=app --cov-report=term-missing"
        ;;
    "failed")
        # Only failed tests from last run
        echo -e "${YELLOW}Running only failed tests from last run...${NC}"
        TEST_ARGS="--lf"
        ;;
    *)
        # Run specific test file or custom args
        echo -e "${GREEN}Running tests: $@${NC}"
        TEST_ARGS="$@"
        ;;
esac

# Execute tests in Docker container
docker exec "$CONTAINER" bash -c "export TESTING_IN_DOCKER=1 && $TEST_CMD $TEST_ARGS"

# Check exit code
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Tests passed successfully${NC}"
else
    echo -e "${RED}✗ Tests failed${NC}"
    exit 1
fi