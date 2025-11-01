# 🔧 Configuración de Variables de Entorno

## 📋 Paso 1: Actualizar .env.local

Copia tus variables existentes al archivo `.env.local` con estos nombres:

```bash
# Variables de Supabase (usa el prefijo que tengas configurado)
# Recomendado → NEXT_PUBLIC_ (se exponen automáticamente al navegador)
NEXT_PUBLIC_SUPABASE_URL="[copia tu SUPABASE_URL]"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[copia tu SUPABASE_ANON_KEY]"
# Alternativa → STORAGE_ (si ya las tenías creadas)
STORAGE_SUPABASE_URL="[copia tu SUPABASE_URL]"
STORAGE_SUPABASE_ANON_KEY="[copia tu SUPABASE_ANON_KEY]"
SUPABASE_SERVICE_ROLE_KEY="[copia tu SUPABASE_SERVICE_ROLE_KEY]"

# OpenAI (NECESITAS OBTENER ESTA)
OPENAI_API_KEY="sk-..."

# Resend (OPCIONAL)
RESEND_API_KEY="re_..."
```

---

## 🗄️ Paso 2: Configurar Base de Datos en Supabase

### Opción A: Si aún NO has ejecutado el schema SQL

1. Ve a tu proyecto de Supabase
2. Click en **SQL Editor** en el menú lateral
3. Abre el archivo `supabase-schema.sql` de este proyecto
4. Copia todo el contenido
5. Pégalo en el SQL Editor de Supabase
6. Click en **RUN** para ejecutar
7. Verifica que las tablas se hayan creado:
   - `profiles`
   - `planificaciones`
   - `evaluaciones`

### Opción B: Si YA ejecutaste el schema

¡Perfecto! Puedes continuar al siguiente paso.

---

## 🤖 Paso 3: Obtener API Key de OpenAI

**IMPORTANTE**: Esta es obligatoria para que funcione la generación de planificaciones.

1. Ve a https://platform.openai.com/api-keys
2. Click en **"Create new secret key"**
3. Dale un nombre (ej: "ProfeFlow")
4. Copia la key (comienza con `sk-...`)
5. Agrégala a tu `.env.local`:
   ```bash
   OPENAI_API_KEY="sk-tu-key-aqui"
   ```

**💰 Nota sobre costos:**
- Cada planificación cuesta aproximadamente $0.01-0.03 USD
- Asegúrate de tener créditos en tu cuenta de OpenAI
- Puedes comprar créditos en: https://platform.openai.com/account/billing

---

## 📧 Paso 4: (Opcional) Configurar Resend para Emails

Si quieres enviar emails de bienvenida:

1. Ve a https://resend.com
2. Crea una cuenta (es gratis hasta 3,000 emails/mes)
3. Obtén tu API key
4. Agrégala a `.env.local`:
   ```bash
   RESEND_API_KEY="re-tu-key-aqui"
   ```

**Si no configuras Resend:**
- La aplicación funcionará perfectamente
- Simplemente no se enviarán emails de bienvenida

---

## ✅ Paso 5: Verificar configuración

### Prueba local:

```bash
# 1. Instalar dependencias (si no lo has hecho)
npm install

# 2. Ejecutar en desarrollo
npm run dev

# 3. Abrir en el navegador
# http://localhost:3000

# 4. Probar registro
# - Intenta registrarte con un email
# - Deberías poder acceder al dashboard
```

### Verificar base de datos:

```bash
# En el SQL Editor de Supabase, ejecuta:
SELECT * FROM profiles;

# Si ves tu perfil creado, ¡todo funciona!
```

---

## 🚀 Paso 6: Desplegar en Vercel

### Variables de entorno para Vercel:

Cuando despliegues en Vercel, agrega estas variables de entorno:

```
NEXT_PUBLIC_SUPABASE_URL=[tu valor]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[tu valor]
STORAGE_SUPABASE_URL=[tu valor - opcional]
STORAGE_SUPABASE_ANON_KEY=[tu valor - opcional]
SUPABASE_SERVICE_ROLE_KEY=[tu valor]
OPENAI_API_KEY=[tu valor]
RESEND_API_KEY=[tu valor - opcional]
```

### Desde la web:

1. Ve a vercel.com
2. Importa el proyecto
3. En "Environment Variables", agrega las variables listadas
4. Deploy!

### Desde la terminal:

```bash
# Login
vercel login

# Agregar variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add STORAGE_SUPABASE_URL production # opcional
vercel env add STORAGE_SUPABASE_ANON_KEY production # opcional
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add OPENAI_API_KEY production
vercel env add RESEND_API_KEY production

# Deploy
vercel --prod
```

---

## 🐛 Troubleshooting

### Error: "No database connection"
```bash
# Verifica en Supabase SQL Editor:
SELECT * FROM profiles LIMIT 1;

# Si falla, ejecuta el schema SQL nuevamente
```

### Error: "OpenAI API error"
```bash
# Verifica tu API key:
# 1. Debe comenzar con "sk-"
# 2. Debe estar activa en platform.openai.com
# 3. Debe tener créditos disponibles
```

### No puedo registrarme
```bash
# Verifica en Supabase:
# 1. Authentication → Email templates están configurados
# 2. Authentication → Providers → Email está habilitado
# 3. No hay políticas RLS bloqueando inserts
```

---

## 📞 ¿Necesitas ayuda?

Si tienes problemas:

1. Revisa los logs de Vercel (si estás desplegado)
2. Revisa la consola del navegador (F12)
3. Revisa los logs de Supabase
4. Contacta al soporte

---

## ✨ ¡Listo para empezar!

Una vez configurado todo:

1. Registra una cuenta
2. Crea tu primera planificación
3. Explora las evaluaciones con IA
4. ¡Disfruta de ProfeFlow! 🎓
