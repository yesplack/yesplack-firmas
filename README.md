# Grupo El Ombú — Firmas Digitales

Sistema de firma digital de listas de precios para acopios de construcción.

## Stack

| Capa | Tecnología | Plan gratuito |
|------|-----------|---------------|
| Frontend + Backend | Next.js 14 (App Router) | — |
| Base de datos | Supabase (PostgreSQL) | 500 MB, 50k filas |
| Almacenamiento PDFs | Cloudinary | 25 GB, 25k transformaciones |
| Deploy | Vercel | Gratis (hobby) |
| Auth | Supabase Auth | Incluido |

---

## Flujo de uso

1. **Admin** sube un PDF de lista de precios para un cliente
2. La app genera un **link único** (`/firmar/{token}`)
3. El admin comparte el link por WhatsApp
4. El **cliente** abre el link, ve el PDF y firma con el dedo
5. La app **incrusta la firma en el PDF** y lo guarda en Cloudinary
6. El admin puede **descargar el PDF firmado** desde la cuenta del cliente

---

## Instalación local

```bash
# 1. Clonar y entrar al proyecto
git clone https://github.com/TU_USUARIO/ombu-firmas
cd ombu-firmas

# 2. Instalar dependencias
npm install

# 3. Copiar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales (ver sección abajo)

# 4. Crear tablas en Supabase (ver sección abajo)

# 5. Importar clientes desde CSV
npm run import-csv -- --file ./clientes.csv

# 6. Correr en desarrollo
npm run dev
```

---

## Configuración de servicios

### 1. Supabase

1. Crear proyecto en https://supabase.com
2. Ir a **SQL Editor → New query**
3. Copiar y ejecutar el contenido de `supabase/schema.sql`
4. Ir a **Settings → API**:
   - Copiar `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - Copiar `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copiar `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ La clave `service_role` es secreta. **Nunca** la expongas en el frontend.

### 2. Cloudinary

1. Crear cuenta en https://cloudinary.com (plan Free incluye 25 GB)
2. Ir al **Dashboard**
3. Copiar las 3 credenciales:
   - `Cloud name` → `CLOUDINARY_CLOUD_NAME`
   - `API Key`    → `CLOUDINARY_API_KEY`
   - `API Secret` → `CLOUDINARY_API_SECRET`

### 3. Variables de entorno

Completar `.env.local` con todos los valores:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx

NEXT_PUBLIC_APP_URL=https://ombu-firmas.vercel.app
```

---

## Importar clientes (CSV)

El script `scripts/import-csv.ts` lee el CSV y hace upsert en Supabase.

```bash
# Con el archivo en la raíz del proyecto:
npm run import-csv -- --file ./clientes.csv

# Con una ruta específica:
npm run import-csv -- --file /ruta/al/archivo/clientes.csv
```

El script trabaja en **lotes de 500** y muestra progreso en tiempo real.
Si ya existen registros (por `id`), los actualiza con `upsert`.

---

## Deploy en Vercel

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Primer deploy (te pregunta nombre del proyecto, etc.)
vercel

# 4. Configurar variables de entorno en Vercel Dashboard:
#    vercel.com → tu proyecto → Settings → Environment Variables
#    Agregar todas las variables de .env.local

# 5. Deploy a producción
vercel --prod
```

**O más fácil: conectar GitHub**
1. Hacer push a GitHub
2. Ir a vercel.com → Import Project → seleccionar el repo
3. Agregar las variables de entorno
4. Deploy automático en cada push

---

## Crear el primer usuario admin

Supabase Auth gestiona los admins. Para crear el primer usuario:

```bash
# Opción A: Desde Supabase Dashboard
# Authentication → Users → Invite user

# Opción B: Con el script (requiere service role)
npx tsx -e "
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
sb.auth.admin.createUser({ email: 'admin@grupoelombu.com.ar', password: 'TU_CONTRASEÑA', email_confirm: true })
  .then(r => console.log(r));
"
```

---

## Estructura del proyecto

```
ombu-firmas/
├── app/
│   ├── (admin)/              # Panel admin (protegido por auth)
│   │   ├── layout.tsx        # Header con logout
│   │   ├── clientes/
│   │   │   ├── page.tsx      # Lista de 18k clientes con búsqueda
│   │   │   └── [id]/
│   │   │       ├── page.tsx         # Perfil: info + listas firmadas
│   │   │       ├── UploadModal.tsx  # Subir nuevo PDF
│   │   │       └── LinkModal.tsx    # Copiar/enviar link
│   ├── firmar/
│   │   └── [token]/
│   │       ├── page.tsx        # Carga datos del servidor
│   │       └── SigningClient.tsx # PDF + canvas firma (cliente)
│   ├── api/
│   │   ├── listas/route.ts     # POST: upload PDF
│   │   └── firmar/[token]/route.ts  # POST: procesar firma
│   ├── login/page.tsx
│   └── layout.tsx
├── lib/
│   ├── supabase.ts        # Cliente browser
│   ├── supabase-server.ts # Cliente server + admin
│   ├── cloudinary.ts      # Upload/download PDFs
│   ├── pdf-sign.ts        # Incrustar firma con pdf-lib
│   └── database.types.ts  # Tipos TypeScript del schema
├── supabase/
│   └── schema.sql         # Tablas, índices, RLS
├── scripts/
│   └── import-csv.ts      # Importar clientes del CSV
└── middleware.ts           # Proteger rutas /admin
```

---

## Tecnologías clave

- **[pdf-lib](https://pdf-lib.js.org/)** — incrusta la firma PNG directamente en el PDF, sin popups ni plugins
- **Supabase RLS** — el link público `/firmar/{token}` solo puede leer/actualizar esa lista específica
- **Cloudinary `raw`** — almacena PDFs con URLs permanentes y seguras
