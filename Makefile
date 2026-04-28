.PHONY: dev dev-db dev-fresh dev-stop dev-backend dev-frontend firebase-emulators

FRONTEND_HOST ?= 127.0.0.1
FRONTEND_PORT ?= 5173

dev:
	$(MAKE) -j2 dev-backend dev-frontend

dev-db:
	$(MAKE) -j3 firebase-emulators dev-backend dev-frontend

dev-fresh: dev-stop
	$(MAKE) dev

dev-stop:
	powershell -NoProfile -ExecutionPolicy Bypass -Command "$$ports = @(3333, $(FRONTEND_PORT), 4000, 4400, 4500, 8081, 9099, 9150, 9199); Get-NetTCPConnection -LocalPort $$ports -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $$_ -Force -ErrorAction SilentlyContinue }"

dev-backend:
	cd backend && npm run dev

dev-frontend:
	cd frontend && npm run dev -- --host $(FRONTEND_HOST) --port $(FRONTEND_PORT) --strictPort

firebase-emulators:
	firebase emulators:start --only auth,firestore,storage
