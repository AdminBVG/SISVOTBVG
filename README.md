# Sistema de asistentes y representación BVG

Proyecto de referencia para gestionar el registro de asistencia y representación de la BVG.  El módulo de votación aún no está implementado y se añadirá en fases posteriores.

## 1. Prerrequisitos
- Ubuntu 22.04+
- Docker y Docker Compose
- Node LTS
- Python 3.11+
- OpenSSL

## 2. Clonado y estructura
```bash
git clone <repo>
cd SISVOTBVG
```
La estructura principal:
```
backend/    FastAPI + SQLAlchemy + Alembic
frontend/   React + TypeScript + Vite
nginx/      Reverse proxy
```

## 3. Variables de entorno
Copia `.env.example` a `.env` y ajusta valores (el backend carga este archivo automáticamente):
- `DATABASE_URL` (solo PostgreSQL; SQLite ya no es compatible)
- `JWT_SECRET`
- `CORS_ORIGINS`
- `API_PORT`
- `WS_URL`
- `VITE_API_URL`
- `VITE_WS_URL`

## 4. Base de datos
Este proyecto usa exclusivamente **PostgreSQL**. Las migraciones se gestionan con `backend/migrate.py`, que lee `DATABASE_URL` del archivo `.env`.
Levanta PostgreSQL vía Docker Compose y ejecuta migraciones:
```bash
docker compose up -d db
cd backend
python migrate.py
```

## 5. Seeds
Carga datos de ejemplo:
```bash
cd backend
python -m app.seed
```

## 6. Ejecución en desarrollo (paso a paso)
1. Copia el archivo de variables y ajústalo:
   ```bash
   cp .env.example .env
   # edita .env con tus valores
   ```
2. Inicia la base de datos y aplica migraciones:
   ```bash
   docker compose up -d db
   cd backend
   python migrate.py
   cd ..
   ```
3. (Opcional) Carga datos de ejemplo:
   ```bash
   cd backend
   python -m app.seed
   cd ..
   ```
4. Levanta todos los servicios de desarrollo:
   ```bash
   docker compose up --build
   ```
5. Abre en el navegador:
   - API: <http://localhost:8000>
   - Frontend: <http://localhost:5173>
   - Nginx (proxy): <http://localhost:8084>
6. Detén la pila cuando termines:
   ```bash
   # en la terminal donde corre compose
   Ctrl+C
   docker compose down
   ```

## 6.1 Windows (Docker Desktop)
Pasos rápidos usando PowerShell:

1. Instala [Docker Desktop para Windows](https://docs.docker.com/desktop/install/windows/) con soporte WSL2.
2. Clona el repositorio y entra en la carpeta del proyecto.
3. Copia las variables de entorno:
   ```powershell
   copy .env.example .env
   # edita .env con tus valores
   ```
4. Levanta PostgreSQL y ejecuta migraciones dentro del contenedor backend:
   ```powershell
   docker compose up -d db
   docker compose run --rm backend python migrate.py
   ```
5. (Opcional) Carga datos de ejemplo:
   ```powershell
   docker compose run --rm backend python -m app.seed
   ```
6. Levanta todos los servicios:
   ```powershell
   docker compose up --build
   ```
7. Abre en el navegador:
   - API: <http://localhost:8000>
   - Frontend: <http://localhost:5173>
   - Nginx: <http://localhost:8084>
8. Para detener la pila:
   ```powershell
   Ctrl+C
   docker compose down
   ```

## 6.2 Windows sin Docker
Si prefieres ejecutar los servicios sin contenedores:

1. Instala [Python 3.11+](https://www.python.org) y [Node LTS](https://nodejs.org) para Windows. También necesitarás un servidor PostgreSQL en ejecución.
2. Backend:
   ```powershell
   cd backend
   python -m venv .venv
   .\.venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```
3. Frontend (nueva terminal):
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```
4. Variables de entorno mínimas en `.env` (en la raíz del repo):
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `API_PORT`
   - `VITE_API_URL`

El archivo `.env` se carga automáticamente; asegúrate de que `DATABASE_URL` apunte a un servidor PostgreSQL en ejecución. El frontend estará en <http://localhost:5173> y la API en <http://localhost:8000>.

## 7. Despliegue en producción (paso a paso)
1. En un servidor Ubuntu 22.04 limpio instala Docker, Docker Compose, Node LTS, Python 3.11+ y OpenSSL.
2. Clona el repositorio y entra en la carpeta del proyecto.
3. Crea `.env` con valores apropiados para producción (URLs públicas, secretos, orígenes de CORS, parámetros del cronómetro).
4. Coloca certificados TLS en `nginx/certs/` si usarás HTTPS.
5. Construye las imágenes y levanta los contenedores en segundo plano:
   ```bash
   docker compose build
   docker compose up -d
   ```
6. Ejecuta migraciones de base de datos:
   ```bash
   docker compose exec backend python migrate.py
   ```
7. (Opcional) Carga datos seed:
   ```bash
   docker compose exec backend python -m app.seed
   ```
8. Verifica servicios y logs:
   ```bash
   docker compose ps
   docker compose logs -f
   ```
9. Para detener la aplicación:
   ```bash
   docker compose down
   ```
10. Asegura la persistencia de volúmenes de la base de datos y de los PDFs de poderes.

## 8. Usuarios y roles
Este prototipo no implementa autenticación completa. Se esperan roles `REGISTRADOR_BVG` y `OBSERVADOR_BVG` para controlar permisos.

Credenciales por defecto:

- Usuario: `AdminBVG`
- Contraseña: `BVG2025`

## 9. Pruebas
Backend:
```bash
cd backend
pytest
```
Frontend:
```bash
cd ../frontend
npm test
```

## 10. Troubleshooting
- **Conexión DB**: verifica credenciales y que el contenedor `db` esté activo.
- **CORS**: ajusta `CORS_ORIGINS` en `.env`.
- **Migraciones**: usa `python migrate.py` y revisa `backend/alembic`.
- **WebSocket**: asegúrate de que `WS_URL` apunte al backend correcto.
- Logs: `docker compose logs -f <servicio>`.

## 11. Salud y monitoreo
- Backend: `GET /` responde con mensaje simple.
- Se pueden añadir endpoints de healthcheck para liveness/readiness.

## 12. Backups básicos
```bash
# Dump
pg_dump -U postgres -h localhost bvg > backup.sql
# Restore
psql -U postgres -h localhost bvg < backup.sql
```
Resguarda también archivos PDF almacenados en volúmenes si aplica.
