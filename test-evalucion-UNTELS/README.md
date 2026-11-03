# test-evalucion-UNTELS — Instrumentos de Evaluación

Editor de instrumentos (tests y encuestas), enlace público para responder, resultados, imagen JPG del resultado y sincronización con Google Sheets.

Todo corre en servicios **gratuitos**: Vercel Hobby (app), Neon Free (Postgres), Google Cloud (login y Sheets) y GitHub Actions (copias).

## Desarrollo local

```bash
cd test-evalucion-UNTELS
npm install
cp .env.example .env          # completa APP_SECRET (ver comentario en el archivo)
npm run db:migrate            # base local PGlite en ./.data/dev
npm run admin -- emergencia   # imprime usuario, contraseña y QR del código de 6 dígitos (guárdalos)
npm run dev                   # http://localhost:3000
npm test
```

PGlite admite un solo proceso: detén `npm run dev` antes de usar `npm run admin` o `npm run db:migrate`.

## Cómo funciona

| Ruta | Quién | Qué |
|---|---|---|
| `/login` | admin | Ingreso con Google (solo correos autorizados) o cuenta de emergencia (contraseña + código TOTP). |
| `/` | admin | Lista de instrumentos. |
| `/instrumento/[id]` | admin | Editor, Configuración (incluye Google Sheets) y Resultados. Se guarda solo en la base. |
| `/instrumento/[id]/vista-previa` | admin | Se abre en otra ventana; botón arriba a la derecha para ver como celular. No guarda respuestas. |
| `/usuarios` | admin | Autorizar o desactivar correos de Google. |
| `/responder/[id]` | público | Lo que ve el encuestado (link y QR al publicar). |

- **Publicar** copia el borrador a la versión pública; para que los encuestados vean cambios, pulsa "Actualizar publicación". "Despublicar" (menú ⋮) cierra el enlace sin borrar respuestas.
- El **resultado se calcula en el servidor**: puntaje por área (preguntas asignadas en Paso 1) → percentil (Paso 2) → nivel (Paso 3) → carreras (Paso 4).
- **"Solo puede responder una vez"** se controla por dispositivo (token anónimo en el navegador). Desactivado, el encuestado puede volver y modificar su respuesta.
- Al terminar, el encuestado puede **descargar su resultado en JPG** o **compartirlo** con el menú nativo del celular (si el navegador no lo soporta, se descarga).

## Despliegue (Vercel + Neon, gratis)

1. **Neon** (neon.tech, plan Free): crea un proyecto. Copia dos cadenas: la **pooled** (`...-pooler...neon.tech`) y la **directa**.
2. **Migrar y crear cuentas** (desde tu PC, con la cadena directa):
   ```bash
   DATABASE_URL="postgresql://...directa..." APP_SECRET="<el mismo de Vercel>" npm run db:migrate
   DATABASE_URL="postgresql://...directa..." APP_SECRET="<el mismo de Vercel>" npm run admin -- emergencia
   DATABASE_URL="postgresql://...directa..." npm run admin -- agregar tu-correo@gmail.com
   ```
   `APP_SECRET` debe ser **el mismo** que pongas en Vercel: cifra el código de emergencia y los permisos de Sheets.
3. **Vercel** (plan Hobby): importa el repositorio con *Root Directory* `test-evalucion-UNTELS`. *Build Command*:
   `if [ "$VERCEL_ENV" = "production" ]; then npm run db:migrate; fi && npm run build`
4. **Variables de entorno** en Vercel (Production):
   - `DATABASE_URL`: cadena **pooled** de Neon.
   - `APP_URL`: `https://<tu-proyecto>.vercel.app` (sin barra final).
   - `APP_SECRET`: 32 bytes en base64.
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: ver la sección Google.
   - `TRUSTED_IP_HEADER`: déjala vacía en Vercel.
5. **Google Cloud** (gratis):
   1. Crea un proyecto, configura la **pantalla de consentimiento OAuth** (tipo Externo) y agrega como *usuarios de prueba* los correos admin, o publícala.
   2. Habilita **Google Sheets API**.
   3. Crea un **ID de cliente OAuth** (aplicación web) con estas URI de redirección:
      `https://<tu-proyecto>.vercel.app/api/auth/google/callback` y `https://<tu-proyecto>.vercel.app/api/sheets/callback`
      (y las mismas con `http://localhost:3000` para desarrollo).

### Capacidad

Probado en local con 100 encuestados simultáneos (consultar + enviar + generar JPG): 0 errores. Cada encuestado hace ~3 solicitudes; el límite es 300 solicitudes por minuto por IP (un colegio suele salir por una sola IP). Neon Free se "duerme" sin uso: la primera visita tarda ~1 s más.

Prueba en producción antes de una jornada: `npx autocannon -c 100 -d 20 https://<tu-proyecto>.vercel.app/responder/<id>` y revisa que no haya errores 5xx.

**Aviso:** Vercel Hobby es para uso no comercial. Para una institución suele bastar, pero confírmalo con TI.

## Google Sheets

En el instrumento: **Configuración → Configuración General → Google Sheets**.

- **Vincular**: crea una hoja nueva o usa una existente (pega el enlace; tu cuenta debe ser Editor). Google pide autorizar tu cuenta.
- Cada respuesta se guarda **primero en la base** y luego en la pestaña **Respuestas** de la hoja (segundos después). Si Google falla, queda pendiente; "Sincronizar ahora" reintenta, y también se reintenta con el siguiente envío.
- **Agregar dashboard en otra hoja**: crea la pestaña **Dashboard** (totales, niveles por área, carreras, respuestas por día, con gráficos). Se crea una vez y se actualiza sola; desactivarlo no la borra.
- **Desvincular** solo quita el vínculo: la base y la hoja anterior conservan todo. **Vincular a otra hoja** reenvía todas las respuestas guardadas a la nueva.

## Copias de seguridad

`.github/workflows/backup-web-front.yml` corre cada día (03:30 Lima) o a mano. Vuelca Neon, comprime, cifra con AES-256 y guarda el archivo como artefacto del flujo por 30 días.

Secretos de GitHub: `WF_DATABASE_URL` (cadena **directa** de Neon) y `WF_BACKUP_PASSPHRASE` (guárdala fuera del repo).

Restaurar sobre una base vacía:

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE -in web-front-AAAA-MM-DD.sql.gz.enc | gunzip | psql -v ON_ERROR_STOP=1 "$DATABASE_URL"
```

## Prueba de carga

Local, con Postgres del tamaño de Neon Free (0.25 CU) y el mismo driver de producción:

```bash
cd load && docker compose up -d && cd ..          # CPU=2 docker compose up -d → 2 CU
export DATABASE_URL="postgres://postgres:carga@localhost:5432/carga" NEON_LOCAL_WSPROXY="localhost:55433/v1"
npx tsx load/seed.ts                              # publica un test de 40 preguntas
APP_URL=http://localhost:3200 APP_SECRET=... npm run build && npx next start -p 3200
node load/run.mjs 100 --ip=una                    # 100 a la vez detrás de una IP (colegio)
```

Contra el despliegue real: sembrar con la cadena directa de Neon y `node load/run.mjs 100 --base=https://tu-app.vercel.app`.
