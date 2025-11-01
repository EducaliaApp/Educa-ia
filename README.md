# ProfeFlow - Planificación Inteligente para Profesores

ProfeFlow es una aplicación SaaS diseñada para profesores chilenos que permite generar planificaciones curriculares y evaluar trabajos de estudiantes utilizando inteligencia artificial.

## 🚀 Características

- **Generador de Planificaciones con IA**: Crea planificaciones curriculares detalladas alineadas al curriculum Mineduc
- **Asistente de Evaluación**: Evalúa trabajos de estudiantes con retroalimentación constructiva generada por IA
- **Exportación a PDF**: Descarga tus planificaciones en formato PDF profesional
- **Sistema de Planes**: FREE (con límites) y PRO (ilimitado)
- **Dashboard Intuitivo**: Interfaz limpia y profesional para gestionar todo tu contenido

## 🛠️ Stack Tecnológico

- **Framework**: Next.js 14 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **IA**: OpenAI API (GPT-4)
- **Emails**: Resend
- **PDF**: jsPDF

## 📋 Requisitos Previos

- Node.js 18+
- npm o yarn
- Cuenta de Supabase
- API Key de OpenAI
- API Key de Resend (opcional)

## 🔧 Instalación

1. **Clonar el repositorio**
```bash
git clone <url-del-repositorio>
cd Educa-ia
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
# Supabase
# Elige el prefijo que utilices en tus variables (puedes definir ambos para mayor compatibilidad)
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
STORAGE_SUPABASE_URL=tu_supabase_url
STORAGE_SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key

# OpenAI
OPENAI_API_KEY=tu_openai_api_key

# Resend (opcional)
RESEND_API_KEY=tu_resend_api_key
```

4. **Configurar la base de datos**

Ejecuta el script SQL en tu proyecto de Supabase:

```bash
# Copia el contenido de supabase-schema.sql
# y ejecútalo en el SQL Editor de Supabase
```

5. **Ejecutar en desarrollo**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📁 Estructura del Proyecto

```
Educa-ia/
├── app/
│   ├── (auth)/           # Páginas de autenticación
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/      # Páginas del dashboard
│   │   └── dashboard/
│   │       ├── planificaciones/
│   │       ├── evaluaciones/
│   │       └── settings/
│   ├── api/              # API routes
│   │   └── planificaciones/
│   └── upgrade/          # Página de planes
├── components/
│   ├── ui/               # Componentes UI reutilizables
│   ├── Sidebar.tsx
│   └── ExportPDFButton.tsx
├── lib/
│   ├── supabase/         # Configuración de Supabase
│   ├── utils.ts
│   └── resend.ts
└── supabase-schema.sql   # Esquema de base de datos
```

## 🎯 Funcionalidades Principales

### Planificaciones
- Generar planificaciones con IA basadas en asignatura, nivel y unidad temática
- Ver lista de todas tus planificaciones
- Ver detalle completo de cada planificación
- Exportar a PDF con/sin marca de agua según el plan

### Evaluaciones
- Subir trabajos de estudiantes (imagen o PDF)
- Generar feedback constructivo con IA
- Ver historial de evaluaciones realizadas

### Sistema de Planes
- **FREE**: 5 planificaciones/mes, 3 evaluaciones/mes, PDF con marca de agua
- **PRO**: Ilimitado todo, PDF sin marca de agua

### Mi Cuenta
- Ver y editar perfil
- Monitorear uso de créditos
- Gestionar plan actual

## 🔐 Autenticación

El sistema usa Supabase Auth con email/password. Al registrarse:
1. Se crea el usuario en `auth.users`
2. Se crea automáticamente un perfil en `profiles` (via trigger)
3. Se envía email de bienvenida (si Resend está configurado)

## 🗄️ Esquema de Base de Datos

### Tabla `profiles`
- Extiende `auth.users` de Supabase
- Almacena información adicional del usuario
- Gestiona plan y créditos

### Tabla `planificaciones`
- Almacena planificaciones generadas
- Contenido en formato JSONB
- Relacionada con `profiles` via `user_id`

### Tabla `evaluaciones`
- Almacena evaluaciones realizadas
- Feedback en formato JSONB
- Relacionada con `profiles` via `user_id`

## 🚀 Deployment

### Vercel (Recomendado)

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno
3. Deploy automático en cada push

### Otras plataformas

La aplicación es compatible con cualquier plataforma que soporte Next.js 14:
- Railway
- Render
- AWS Amplify
- Netlify

## 📝 Próximas Funcionalidades

- [ ] Integración real de pagos (Stripe/Flow)
- [ ] Edición de planificaciones generadas
- [ ] Duplicar planificaciones
- [ ] Compartir planificaciones públicamente
- [ ] Búsqueda y filtros avanzados
- [ ] Análisis con OpenAI Vision para imágenes de evaluaciones
- [ ] Exportación a Word
- [ ] Templates personalizables
- [ ] Colaboración en tiempo real
- [ ] App móvil

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

## 📧 Contacto

Para consultas o soporte: contacto@profeflow.com

---

Hecho con ❤️ para profesores chilenos