# 🎓 ProfeFlow - Planificación Inteligente para Profesores

ProfeFlow es una plataforma SaaS diseñada específicamente para profesores chilenos que permite generar planificaciones curriculares y evaluar trabajos de estudiantes utilizando inteligencia artificial. La aplicación está alineada con el currículum nacional chileno del Ministerio de Educación (Mineduc).

## ✨ Características Principales

### 📚 Generador de Planificaciones con IA

- Crea planificaciones curriculares detalladas por asignatura y nivel
- Alineado completamente con el currículum Mineduc chileno
- Genera objetivos de aprendizaje, actividades y evaluaciones
- Planificación clase por clase con duración personalizable

### 📊 Asistente de Evaluación con IA

- Evalúa trabajos de estudiantes con retroalimentación constructiva
- Soporte para imágenes y documentos PDF
- Feedback personalizado según criterios pedagógicos

### 📄 Exportación Profesional

- Descarga planificaciones en formato PDF profesional
- Marca de agua opcional según plan del usuario
- Formato optimizado para impresión y presentación

### 💎 Sistema de Planes Flexible

- **Plan FREE**: 5 planificaciones/mes, 3 evaluaciones/mes, PDF con marca de agua
- **Plan PRO**: Planificaciones y evaluaciones ilimitadas, PDF sin marca de agua

### 🏢 Panel de Administración

- Dashboard completo para administradores
- Métricas de uso y analytics detallados
- Gestión de usuarios y planes
- Estadísticas de conversión y ingresos

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

## 🔧 Instalación y Configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/EducaliaApp/Educa-ia.git
cd Educa-ia
```

### 2. Instalar dependencias

```bash
npm install
# o usando yarn
yarn install
```

### 3. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto basándote en `SETUP-ENV.md`:

```env
# Supabase (Obligatorio)
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key

# OpenAI (Obligatorio para IA)
OPENAI_API_KEY=tu_openai_api_key

# Resend (Opcional para emails)
RESEND_API_KEY=tu_resend_api_key
```

### 4. Configurar base de datos

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta el contenido de `supabase-schema.sql` en el SQL Editor
3. Verifica que se crearon las tablas: `profiles`, `planificaciones`, `evaluaciones`

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📁 Estructura del Proyecto

```text
ProfeFlow/
├── app/                          # Next.js 14 App Router
│   ├── (auth)/                  # Grupo de rutas de autenticación
│   │   ├── login/              # Página de login
│   │   ├── register/           # Registro de usuarios
│   │   ├── forgot-password/    # Recuperación de contraseña
│   │   └── actions.ts          # Server actions compartidas
│   ├── (dashboard)/            # Rutas protegidas del dashboard
│   │   └── dashboard/
│   │       ├── planificaciones/  # Gestión de planificaciones
│   │       ├── evaluaciones/     # Gestión de evaluaciones
│   │       └── settings/         # Configuración de usuario
│   ├── admin/                  # Panel de administración
│   │   ├── usuarios/           # Gestión de usuarios
│   │   ├── planificaciones/    # Analytics de planificaciones
│   │   └── analytics/          # Dashboard de métricas
│   ├── api/                    # API Routes de Next.js
│   │   └── planificaciones/
│   │       └── generar/        # Endpoint para generar con IA
│   └── upgrade/                # Página de planes y pagos
├── components/                 # Componentes React
│   ├── ui/                    # Componentes UI base
│   ├── admin/                 # Componentes específicos del admin
│   ├── Sidebar.tsx            # Navegación principal
│   └── ExportPDFButton.tsx    # Exportación a PDF
├── lib/                       # Lógica de negocio y utilidades
│   ├── supabase/             # Cliente y configuración de Supabase
│   ├── utils.ts              # Utilidades generales
│   └── resend.ts             # Configuración de emails
├── middleware.ts             # Middleware de autenticación
├── supabase-schema.sql       # Esquema de base de datos
└── docs/                     # Documentación adicional
```

## 🎯 Funcionalidades Principales

### 📚 Planificaciones

- Generar planificaciones con IA basadas en asignatura, nivel y unidad temática
- Ver lista de todas tus planificaciones
- Ver detalle completo de cada planificación
- Exportar a PDF con/sin marca de agua según el plan
- Planificación clase por clase con objetivos específicos

### 📊 Evaluaciones

- Subir trabajos de estudiantes (imagen o PDF)
- Generar feedback constructivo con IA
- Ver historial de evaluaciones realizadas
- Criterios de evaluación personalizables

### 💎 Sistema de Planes

- **Plan FREE**: 5 planificaciones/mes, 3 evaluaciones/mes, PDF con marca de agua
- **Plan PRO**: Planificaciones y evaluaciones ilimitadas, PDF sin marca de agua

### ⚙️ Mi Cuenta

- Ver y editar perfil profesional
- Monitorear uso de créditos en tiempo real
- Gestionar plan actual y métodos de pago

### 🏢 Panel de Administración

- Dashboard completo con métricas de uso
- Gestión de usuarios y planes
- Analytics de conversión y ingresos
- Estadísticas detalladas de la plataforma

## 🔐 Autenticación

El sistema usa Supabase Auth con email/password. Al registrarse:

1. Se crea el usuario en `auth.users`
2. Se crea automáticamente un perfil en `profiles` (via trigger)
3. Se envía email de bienvenida (si Resend está configurado)

## 🗄️ Esquema de Base de Datos

### Tabla `profiles`

- Extiende `auth.users` de Supabase
- Almacena información adicional del usuario
- Gestiona plan y créditos disponibles/utilizados

### Tabla `planificaciones`

- Almacena planificaciones generadas por IA
- Contenido estructurado en formato JSONB
- Relacionada con `profiles` via `user_id`

### Tabla `evaluaciones`

- Almacena evaluaciones de trabajos estudiantiles
- Feedback y criterios en formato JSONB
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

## � Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Ejecuta en modo desarrollo (puerto 3000)

# Producción
npm run build        # Construye la aplicación para producción
npm run start        # Ejecuta la aplicación en producción

# Calidad de código
npm run lint         # Ejecuta ESLint para revisar el código

# Administración
npm run admin:create     # Crear usuario administrador (requiere .env.local)
npm run admin:create-sql # Generar SQL para crear admin manualmente
npm run admin:setup      # Instrucciones para configurar políticas RLS

# Feature Flags
npm run flags:test       # Probar estado de feature flags
```

## 🔧 Configuración de Desarrollo

### Variables de Entorno Requeridas

- `NEXT_PUBLIC_SUPABASE_URL`: URL de tu proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Clave anónima de Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Clave de servicio para operaciones admin
- `OPENAI_API_KEY`: Clave de la API de OpenAI para generación de contenido

### Variables Opcionales

- `RESEND_API_KEY`: Para envío de emails de bienvenida y notificaciones
- `NEXT_PUBLIC_SITE_URL`: URL del sitio en producción

## 📝 Roadmap y Próximas Funcionalidades

### 🔄 En Desarrollo

- [ ] Sistema de pagos integrado (Stripe/Flow/MercadoPago)
- [ ] Edición directa de planificaciones generadas
- [ ] Duplicar y clonar planificaciones existentes

### 🎯 Funcionalidades Planificadas

- [ ] Compartir planificaciones públicamente con enlaces
- [ ] Búsqueda y filtros avanzados por asignatura/nivel
- [ ] Análisis con OpenAI Vision para evaluaciones de imágenes
- [ ] Exportación a formato Word (.docx)
- [ ] Exportación a formato PDF (.pdf)
- [ ] Templates personalizables por usuario
- [ ] Colaboración en tiempo real entre profesores
- [ ] Aplicación móvil nativa

### 🔮 Visión a Largo Plazo

- [ ] Integración con Google Classroom
- [ ] Banco de recursos educativos compartidos
- [ ] Sistema de calificaciones automático
- [ ] Analytics avanzados de desempeño estudiantil

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

Para consultas o soporte: [contacto@profeflow.com](mailto:contacto@profeflow.com)

---

Hecho con ❤️ para profesores chilenos

