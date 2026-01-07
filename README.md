# PayrollPro 🧾

**Proyecto monorepo** para gestión de nóminas, compuesto por dos carpetas principales:

- `nomina` — Backend (API con Express, TypeScript y Prisma)
- `nomina-front` — Frontend (React + Vite + TypeScript)

---

## 🔧 Requisitos

- Node.js (v18+ recomendado)
- npm
- PostgreSQL (u otra base de datos configurada en `DATABASE_URL`)

---

## 🗂 Estructura

- `nomina/` — servidor Express en TypeScript, Prisma para acceso a BD
- `nomina-front/` — aplicación cliente con Vite + React

---

## ⚙️ Variables de entorno

Crea un archivo `.env` en `nomina/` con la variable mínima:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
```

Asegúrate de que la base de datos existe y las credenciales son correctas.

---

## Backend — `nomina` (Desarrollo)

1. Instalar dependencias:

```bash
cd nomina
npm install
```

2. Ejecutar migraciones y generar cliente Prisma:

```bash
npx prisma migrate dev --name init
# (Esto ejecuta migration y genera el cliente Prisma)
```

3. Ejecutar el seed (si aplica):

```bash
npx prisma db seed
```

4. Ejecutar en modo desarrollo:

```bash
npm run dev
# usa nodemon para reinicios automáticos
```

5. Para producción:

```bash
npm run build
npm start
```

---

## Frontend — `nomina-front` (Desarrollo)

1. Instalar dependencias:

```bash
cd nomina-front
npm install
```

2. Ejecutar en desarrollo (Vite):

```bash
npm run dev
```

3. Build de producción:

```bash
npm run build
npm run preview  # opcion para probar el build localmente
```

---

## Comandos útiles

- `npm run dev` — Inicia la app en modo desarrollo (backend o frontend según carpeta)
- `npm run build` — Compila para producción
- `npx prisma migrate dev` — Aplica migraciones y genera cliente
- `npx prisma db seed` — Ejecuta el script de seed definido en `package.json`

---

## 💡 Tips

- Verifica `DATABASE_URL` antes de correr migraciones.
- Si trabajas en Windows y tienes problemas con permisos o conexiones, revisa las variables de entorno y agentes de PostgreSQL.

---

## Contribuir

Si quieres contribuir, abre un issue o crea un PR con cambios claros y tests si aplica.

---

## Licencia

ISC (por defecto, puedes cambiarla según prefieras).

---

¡Listo! Si quieres, puedo añadir instrucciones más detalladas (ej. endpoints disponibles, diagramas de DB o notas de despliegue). 🚀
