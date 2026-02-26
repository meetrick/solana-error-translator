#!/bin/bash

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

# 색상
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

cleanup() {
  echo -e "\n${YELLOW}[*] 종료 중...${NC}"
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  echo -e "${GREEN}[*] 모두 종료됐습니다.${NC}"
  exit 0
}

trap cleanup INT TERM

# Backend 실행
echo -e "${GREEN}[*] Backend 시작 (FastAPI)...${NC}"
cd "$BACKEND_DIR"
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
deactivate

# Frontend 실행
echo -e "${GREEN}[*] Frontend 시작 (Next.js)...${NC}"
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

echo -e "${GREEN}[*] 실행 중${NC}"
echo -e "   Backend:  http://localhost:8000"
echo -e "   Frontend: http://localhost:3000"
echo -e "${YELLOW}   종료하려면 Ctrl+C${NC}\n"

wait
