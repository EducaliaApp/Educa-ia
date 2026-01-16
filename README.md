# 🎓 ProfeFlow - Planificación Inteligente para Profesores

ProfeFlow es una plataforma SaaS diseñada específicamente para profesores chilenos que permite generar planificaciones curriculares y evaluar trabajos de estudiantes utilizando inteligencia artificial. La aplicación está alineada con el currículum nacional chileno del Ministerio d# 🎓 ProfeFlow - Planificación Inteligente para Profesores

ProfeFlow es una plataforma SaaS diseñada específicamente para profesores chilenos que permite generar planificaciones curriculares y evaluar trabajos de estudiantes utilizando inteligencia artificial. La aplicación está alineada con el currículum nacional chileno del Ministerio de Educación (Mineduc).

## ✨ Características Principales

### 📚 Generador de Planificaciones con LIA

- Crea planificaciones curriculares detalladas por asignatura y nivel
- Alineado completamente con el currículum Mineduc chileno
- Genera objetivos de aprendizaje, actividades y evaluaciones
- Planificación clase por clase con duración personalizable

### 📊 Asistente de Evaluación con LIA

- Evalúa trabajos de estudiantes con retroalimentación constructiva
- Soporte para imágenes y documentos PDF
- Feedback personalizado según criterios pedagógicos
- Análisis de portafolios docentes con rúbricas oficiales MBE
- Evaluación automatizada por módulos y tareas

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
- **Lenguaje**: TypeScript 5.5.4
- **Estilos**: Tailwind CSS 3.4.9
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **LIA**: OpenAI 4.56.0 (GPT-4) + Anthropic Claude
- **Emails**: Resend 4.0.0
- **PDF**: jsPDF 2.5.2
- **Formularios**: React Hook Form 7.52.2 + Zod 3.23.8
- **Feature Flags**: Hypertune 2.10.0
- **Gráficos**: Recharts 3.3.0

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

# OpenAI (Obligatorio para LIA)
OPENAI_API_KEY=tu_openai_api_key

# Resend (Opcional para emails)
RESEND_API_KEY=tu_resend_api_key
```

### 4. Configurar base de datos

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta los archivos SQL en orden:
   - `sql/schema/supabase-schema.sql` - Esquema principal
   - `sql/schema/portafolio-schema.sql` - Esquema de portafolios
   - `sql/schema/ai-analysis.sql` - Tablas de análisis LIA
3. Ejecuta las migraciones en `supabase/migrations/`
4. Configura las políticas RLS ejecutando `sql/admin/supabase-admin-setup.sql`

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
│   │   ├── analytics/          # Dashboard de métricas
│   │   └── system/             # Monitoreo del sistema
│   ├── api/                    # API Routes de Next.js
│   │   ├── planificaciones/    # Endpoints de planificaciones
│   │   └── profile/            # Endpoints de perfil
│   └── upgrade/                # Página de planes y pagos
├── components/                 # Componentes React
│   ├── ui/                    # Componentes UI base
│   ├── admin/                 # Componentes específicos del admin
│   ├── portafolio/            # Componentes de portafolio
│   ├── notificaciones/        # Sistema de notificaciones
│   ├── Sidebar.tsx            # Navegación principal
│   └── ExportPDFButton.tsx    # Exportación a PDF
├── supabase/                   # Backend Supabase
│   ├── functions/             # Edge Functions para LIA
│   │   ├── analizar-planificacion/
│   │   ├── analizar-portafolio-completo/
│   │   └── shared/            # Utilidades compartidas
│   └── migrations/            # Migraciones de BD
├── scripts/                    # Scripts de automatización
│   ├── pipeline-document-mineduc/      # Monitor de documentos Python
│   └── cron/                  # Tareas programadas
├── sql/                        # Esquemas de base de datos
│   ├── schema/                # Esquemas principales
│   ├── admin/                 # Configuración admin
│   └── fixes/                 # Parches y correcciones
├── lib/                       # Lógica de negocio y utilidades
│   ├── supabase/             # Cliente y configuración de Supabase
│   ├── auth/                 # Helpers de autenticación
│   └── flags/                # Feature flags
├── types/                      # Definiciones TypeScript
├── docs/                       # Documentación
│   └── evaluacion_docente_2025/ # Documentación MBE
└── middleware.ts               # Middleware de autenticación
```

## 🎯 Funcionalidades Principales

### 📚 Planificaciones

- Generar planificaciones con LIA basadas en asignatura, nivel y unidad temática
- Ver lista de todas tus planificaciones
- Ver detalle completo de cada planificación
- Exportar a PDF con/sin marca de agua según el plan
- Planificación clase por clase con objetivos específicos

### 📊 Evaluaciones y Portafolios

- Subir trabajos de estudiantes (imagen o PDF)
- Generar feedback constructivo con LIA
- Análisis de portafolios docentes completos
- Evaluación por módulos según Marco para la Buena Enseñanza (MBE)
- Rúbricas oficiales MINEDUC 2025
- Ver historial de evaluaciones realizadas

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

### Tablas Principales

- **`profiles`**: Extiende `auth.users`, gestiona planes y créditos
- **`planificaciones`**: Planificaciones generadas por LIA (JSONB)
- **`evaluaciones`**: Evaluaciones de trabajos estudiantiles
- **`portafolios`**: Portafolios docentes completos
- **`tareas_portafolio`**: Tareas individuales por módulo
- **`analisis_ia_portafolio`**: Análisis de LIA con rúbricas MBE

### Tablas de Rúbricas y Documentación

- **`rubricas_mbe`**: Rúbricas oficiales Marco para la Buena Enseñanza
- **`documentos_oficiales`**: Documentos MINEDUC con embeddings
- **`fuentes_documentacion`**: Fuentes oficiales monitoreadas

### Tablas de Administración

- **`metricas_uso`**: Métricas de uso por usuario
- **`notificaciones_admin`**: Notificaciones del sistema
- **`function_logs`**: Logs de funciones Edge

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

# Base de Datos
npm run seed:rubricas    # Poblar rúbricas MBE en la base de datos
```

## 🔧 Configuración de Desarrollo

### Variables de Entorno Requeridas

- `NEXT_PUBLIC_SUPABASE_URL`: URL de tu proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Clave anónima de Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Clave de servicio para operaciones admin
- `OPENAI_API_KEY`: Clave de la API de OpenAI para generación de contenido

### Variables Opcionales

- `RESEND_API_KEY`: Para envío de emails de bienvenida y notificaciones
- `ANTHROPIC_API_KEY`: Para usar Claude como modelo alternativo
- `NEXT_PUBLIC_SITE_URL`: URL del sitio en producción
- `ENABLE_NOTIFICATIONS`: Habilitar notificaciones del sistema (true/false)

## 📝 Roadmap y Próximas Funcionalidades

### ✅ Completado Recientemente

- [x] Sistema completo de análisis de portafolios docentes
- [x] Rúbricas oficiales MBE 2025 integradas
- [x] Monitor automático de documentos MINEDUC
- [x] Edge Functions para procesamiento LIA
- [x] Sistema de notificaciones administrativas
- [x] Dashboard de métricas y analytics

### 🔄 En Desarrollo

- [ ] Sistema de pagos integrado (Stripe/Flow/MercadoPago)
- [ ] Edición directa de planificaciones generadas
- [ ] Duplicar y clonar planificaciones existentes
- [ ] Mejoras en la interfaz de portafolios

### 🎯 Funcionalidades Planificadas

- [ ] Compartir planificaciones públicamente con enlaces
- [ ] Búsqueda y filtros avanzados por asignatura/nivel
- [ ] Análisis con OpenAI Vision para evaluaciones de imágenes
- [ ] Exportación a formato Word (.docx)
- [ ] Templates personalizables por usuario
- [ ] Colaboración en tiempo real entre profesores
- [ ] Aplicación móvil nativa

### 🔮 Visión a Largo Plazo

- [ ] Integración con Google Classroom
- [ ] Banco de recursos educativos compartidos
- [ ] Sistema de calificaciones automático
- [ ] Analytics avanzados de desempeño estudiantil
- [ ] LIA multimodal para análisis de videos de clases

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

