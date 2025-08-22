# BVG Frontend

Aplicación React + TypeScript que consume la API de asambleas BVG.

## Desarrollo en Windows (sin Docker)
1. **Requisitos**
   - [Node.js LTS](https://nodejs.org/) y `npm`.
2. **Instalar dependencias**
   ```powershell
   cd frontend
   npm install
   ```
3. **Configurar variables de entorno**
   - Crea un archivo `.env` (opcional) y define la URL del backend:
     ```env
     VITE_API_URL=http://localhost:8000
     ```
4. **Levantar servidor de desarrollo**
   ```powershell
   npm run dev
   ```
5. Abre <http://localhost:5173> en el navegador.

## Integración con Docker
1. Instala Docker Desktop y asegúrate de que Docker Compose esté disponible.
2. Desde la raíz del proyecto, construye e inicia los servicios:
   ```powershell
   docker compose up --build
   ```
   Esto construirá el contenedor del frontend y lo conectará con el backend.
3. El frontend quedará expuesto en <http://localhost:5173> y el backend en <http://localhost:8000>.
4. Para detener la pila:
   ```powershell
   Ctrl+C
  docker compose down
  ```

## Tokens de diseño

Los estilos del proyecto utilizan variables definidas en `src/styles/theme.css`.
Estas funcionan como _tokens_ para mantener consistencia visual:

- `--bvg-blue`: color primario.
- `--bvg-blue-light`: color secundario.
- `--bvg-celeste`: color de acento.
- `--bvg-gray`: fondo neutro.
- `--bvg-dark`: texto principal.

Al crear componentes procura usar estas variables mediante `var(--token)` o las
clases de Bootstrap ya sobreescritas. Evita declarar códigos de color fijos
directamente en los estilos.
