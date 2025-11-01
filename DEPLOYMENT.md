# Guía de Deployment en Vercel

## 📦 Opción 1: Deploy desde la interfaz web de Vercel (Recomendado)

### 1. Conectar el repositorio
1. Ve a [vercel.com](https://vercel.com) y haz login
2. Click en "Add New" → "Project"
3. Importa el repositorio `EducaliaApp/Educa-ia`
4. Selecciona la rama: `claude/profeflow-saas-app-011CUg1eTZJdWZi9emtEkss1`

### 2. Configurar variables de entorno
En la configuración del proyecto, agrega estas variables de entorno:

**Variables públicas (prefijo STORAGE_):**
```
STORAGE_SUPABASE_URL=tu_supabase_url_aqui
STORAGE_SUPABASE_ANON_KEY=tu_supabase_anon_key_aqui
```

**Variables secretas:**
```
SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key_aqui
OPENAI_API_KEY=tu_openai_api_key_aqui
RESEND_API_KEY=tu_resend_api_key_aqui (opcional)
```

### 3. Deploy
1. Click en "Deploy"
2. Espera a que termine el build (2-3 minutos)
3. ¡Tu aplicación estará disponible en una URL de Vercel!

---

## 🖥️ Opción 2: Deploy desde la CLI

### 1. Instalar Vercel CLI
```bash
npm install -g vercel
```

### 2. Login en Vercel
```bash
vercel login
```

### 3. Configurar variables de entorno
```bash
# Desde el directorio del proyecto
vercel env add STORAGE_SUPABASE_URL
vercel env add STORAGE_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add OPENAI_API_KEY
vercel env add RESEND_API_KEY
```

### 4. Deploy a producción
```bash
vercel --prod
```

---

## 🔧 Configuración de Supabase

Antes de desplegar, asegúrate de haber configurado Supabase:

### 1. Crear proyecto en Supabase
1. Ve a [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto

### 2. Ejecutar schema SQL
1. Ve a SQL Editor en Supabase
2. Copia todo el contenido de `supabase-schema.sql`
3. Ejecuta el script

### 3. Obtener credenciales
1. Ve a Settings → API
2. Copia:
   - `Project URL` → `STORAGE_SUPABASE_URL`
   - `anon/public` key → `STORAGE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

---

## 🤖 Configuración de OpenAI

### 1. Obtener API Key
1. Ve a [platform.openai.com](https://platform.openai.com)
2. Crea una API key
3. Cópiala como `OPENAI_API_KEY`

⚠️ **Nota**: Asegúrate de tener créditos en tu cuenta de OpenAI

---

## 📧 Configuración de Resend (Opcional)

### 1. Obtener API Key
1. Ve a [resend.com](https://resend.com)
2. Crea una API key
3. Cópiala como `RESEND_API_KEY`

⚠️ **Nota**: Esta es opcional. Los emails de bienvenida solo se enviarán si está configurada.

---

## ✅ Verificar deployment

Después del deployment, verifica que:

1. ✅ La página principal carga correctamente
2. ✅ Puedes registrarte con un email
3. ✅ El dashboard muestra correctamente
4. ✅ Puedes crear una planificación (esto consumirá créditos de OpenAI)

---

## 🔄 Redeployments

Vercel redespliega automáticamente en cada push a la rama configurada.

Para redeploy manual:
```bash
vercel --prod
```

---

## 🐛 Troubleshooting

### Error: "No database connection"
- Verifica que las credenciales de Supabase sean correctas
- Verifica que el schema SQL se haya ejecutado correctamente

### Error: "OpenAI API error"
- Verifica que tu API key sea válida
- Verifica que tengas créditos disponibles en OpenAI

### Build failures
- Verifica que todas las dependencias estén instaladas
- Revisa los logs de build en Vercel dashboard

---

## 📊 Monitoreo

Una vez desplegado:

1. **Analytics**: Ve a Vercel Dashboard → Analytics
2. **Logs**: Ve a Vercel Dashboard → Functions → Logs
3. **Errores**: Configura integración con Sentry (opcional)

---

## 🚀 Dominio personalizado

Para usar un dominio personalizado:

1. Ve a Vercel Dashboard → Settings → Domains
2. Agrega tu dominio
3. Configura los DNS según las instrucciones
4. Espera propagación (puede tomar hasta 24 horas)

---

## 💰 Costos estimados

- **Vercel**: Gratis para el plan Hobby (suficiente para empezar)
- **Supabase**: Gratis hasta 500MB de base de datos
- **OpenAI**: ~$0.01-0.03 por planificación (GPT-4)
- **Resend**: Gratis hasta 3,000 emails/mes

---

¿Problemas? Revisa los logs en Vercel Dashboard o contacta soporte.
