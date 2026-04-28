.PHONY: dev dev-fresh dev-stop dev-backend dev-frontend

FRONTEND_HOST ?= 127.0.0.1
FRONTEND_PORT ?= 5173

dev:
	$(MAKE) -j2 dev-backend dev-frontend

dev-fresh: dev-stop
	$(MAKE) dev

dev-stop:
	powershell -NoProfile -ExecutionPolicy Bypass -Command "$$ports = @(3333, $(FRONTEND_PORT)); Get-NetTCPConnection -LocalPort $$ports -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $$_ -Force -ErrorAction SilentlyContinue }"

dev-backend:
	cd backend && npm run dev

dev-frontend:
	cd frontend && npm run dev -- --host $(FRONTEND_HOST) --port $(FRONTEND_PORT) --strictPort
