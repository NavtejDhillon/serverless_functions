#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================${NC}"
echo -e "${BLUE}   Building Serverless Platform     ${NC}"
echo -e "${BLUE}====================================${NC}"

# 1. Install backend dependencies
echo -e "${GREEN}Installing backend dependencies...${NC}"
npm install

# 2. Install frontend dependencies
echo -e "${GREEN}Installing frontend dependencies...${NC}"
cd frontend && npm install

# 3. Build frontend
echo -e "${GREEN}Building frontend...${NC}"
npm run build
cd ..

# 4. Ensure public directory exists
echo -e "${GREEN}Setting up public directory...${NC}"
mkdir -p public

# 5. Copy frontend build to public
echo -e "${GREEN}Copying frontend build to public directory...${NC}"
cp -r frontend/dist/* public/

# 6. Build backend
echo -e "${GREEN}Building backend...${NC}"
npm run build

# 7. Set permissions to ensure serverless directories exist
echo -e "${GREEN}Setting up serverless directories...${NC}"
mkdir -p functions
mkdir -p uploads
mkdir -p dist/functions
mkdir -p tmp

echo -e "${BLUE}====================================${NC}"
echo -e "${GREEN}Build completed successfully!${NC}"
echo -e "${BLUE}====================================${NC}"
echo -e "Run the application with: ${GREEN}npm start${NC}"
echo -e "For development, use: ${GREEN}npm run dev:all${NC}" 