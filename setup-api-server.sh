#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  AJKMart - API Server Setup & Diagnostic Script        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print status
print_check() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_warn() {
  echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

# Step 1: Check Node.js and pnpm
echo ""
echo -e "${YELLOW}[1/6] Checking Node.js and pnpm...${NC}"
if command -v node &> /dev/null; then
  NODE_VERSION=$(node --version)
  print_check "Node.js installed: $NODE_VERSION"
else
  print_error "Node.js not found"
  exit 1
fi

if command -v pnpm &> /dev/null; then
  PNPM_VERSION=$(pnpm --version)
  print_check "pnpm installed: $PNPM_VERSION"
else
  print_error "pnpm not found"
  exit 1
fi

# Step 2: Check root .env
echo ""
echo -e "${YELLOW}[2/6] Checking root .env configuration...${NC}"
if [ ! -f .env ]; then
  print_warn ".env not found in root"
  print_info "Running permanent-setup.sh to create .env..."
  bash permanent-setup.sh
  print_check ".env created"
else
  print_check ".env exists"
fi

# Check critical variables
REQUIRED_VARS=("DATABASE_URL" "JWT_SECRET" "ADMIN_JWT_SECRET" "PORT")
for var in "${REQUIRED_VARS[@]}"; do
  if grep -q "^$var=" .env; then
    print_check "$var is configured"
  else
    print_warn "$var not found in .env"
  fi
done

# Step 3: Copy .env to api-server
echo ""
echo -e "${YELLOW}[3/6] Propagating .env to api-server...${NC}"
if [ ! -f artifacts/api-server/.env ]; then
  cp .env artifacts/api-server/.env
  print_check ".env copied to artifacts/api-server/"
else
  print_check "artifacts/api-server/.env already exists"
fi

# Step 4: Install dependencies (if needed)
echo ""
echo -e "${YELLOW}[4/6] Checking dependencies...${NC}"
if [ ! -d artifacts/api-server/node_modules ]; then
  print_info "Installing api-server dependencies..."
  cd artifacts/api-server
  pnpm install
  cd - > /dev/null
  print_check "Dependencies installed"
else
  print_check "Dependencies already installed"
fi

# Step 5: Test database connection
echo ""
echo -e "${YELLOW}[5/6] Testing database connection...${NC}"
if grep -q "^DATABASE_URL=" .env; then
  DB_URL=$(grep "^DATABASE_URL=" .env | cut -d= -f2- | tr -d '"')
  if [ ! -z "$DB_URL" ]; then
    print_check "DATABASE_URL found"
    print_info "Connection will be tested when server starts"
  else
    print_error "DATABASE_URL is empty"
  fi
else
  print_error "DATABASE_URL not configured"
fi

# Step 6: Ready message
echo ""
echo -e "${YELLOW}[6/6] Generating startup instructions...${NC}"
print_check "All checks completed!"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Ready to Start API Server                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}To start the API server, run:${NC}"
echo ""
echo -e "  ${YELLOW}cd artifacts/api-server${NC}"
echo -e "  ${YELLOW}pnpm run dev${NC}"
echo ""
echo -e "${BLUE}Then verify with:${NC}"
echo ""
echo -e "  ${YELLOW}curl http://localhost:4000/api/health${NC}"
echo ""
echo -e "Expected response:"
echo -e "  ${GREEN}{\"status\":\"ok\",\"db\":\"ok\",...}${NC}"
echo ""
echo -e "${BLUE}Configuration Details:${NC}"
echo -e "  ${YELLOW}API Server Port${NC}: 4000"
echo -e "  ${YELLOW}Encryption Password${NC}: Khan@123.com"
echo -e "  ${YELLOW}Database${NC}: Neon PostgreSQL"
echo ""
echo -e "${BLUE}Troubleshooting:${NC}"
echo -e "  See ${YELLOW}API_SERVER_SETUP_GUIDE.md${NC} for detailed docs"
echo ""
