#!/bin/bash

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Ensure Node is available
if ! command -v node &> /dev/null
then
    echo "Node could not be found, attempting to use nvm default"
    nvm use default
fi

# 1. Start Database
echo "Starting PostgreSQL database..."
docker-compose up -d

# 2. Start Backend
echo "Starting Backend (NestJS)..."
cd backend
npx prisma generate
nohup npm run start:dev > backend_output.log 2>&1 &
echo "Backend started in background. Logs: backend/backend_output.log"

# 3. Start Frontend
echo "Starting Frontend (Next.js)..."
cd ../frontend
nohup npm run dev > frontend_output.log 2>&1 &
echo "Frontend started in background. Logs: frontend/frontend_output.log"

echo "Servers are being launched."
