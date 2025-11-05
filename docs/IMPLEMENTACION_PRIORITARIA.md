# ⚡ Plan de Implementación Prioritaria - Sistema de Documentos Oficiales

## 🎯 Objetivo
Implementar las mejoras más críticas del sistema de monitoreo y procesamiento de documentos oficiales en las próximas 8-12 semanas para maximizar el impacto inmediato.

---

## 🔥 SPRINT 1-2: Estabilización Crítica (2 semanas)

### 🚨 Problemas Críticos Identificados

#### 1. Error de Sintaxis en `procesar-documentos/index.ts`
**Línea 1**: `import { createClient } import { createClient }`
```typescript
// ❌ Actual
import { createClient } import { createClient } from "npm:@supabase/supabase-js@2.30.0";

// ✅ Corregir
import { createClient } from "npm:@supabase/supabase-js@2.30.0";
```

#### 2. Manejo de Errores Robusto
```typescript
// Implementar en monitor-documentos-oficiales/index.ts
class ErrorHandler {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    backoffMs = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        if (attempt === maxRetries) throw error
        
        console.warn(`Intento ${attempt} falló, reintentando en ${backoffMs}ms...`)
        await new Promise(resolve => setTimeout(resolve, backoffMs * attempt))
      }
    }
    throw new Error('Máximo de reintentos alcanzado')
  }
}
```

#### 3. Validación de Documentos PDF
```typescript
// Agregar en procesar-documentos/index.ts
async function validarPDF(arrayBuffer: ArrayBuffer): Promise<boolean> {
  try {
    // Verificar header PDF
    const header = new Uint8Array(arrayBuffer.slice(0, 4))
    const pdfHeader = String.fromCharCode(...header)
    
    if (!pdfHeader.startsWith('%PDF')) {
      throw new Error('Archivo no es un PDF válido')
    }
    
    // Verificar que se puede abrir con pdfjs
    const pdf = await getDocument({ data: arrayBuffer }).promise
    return pdf.numPages > 0
    
  } catch (error) {
    console.error('Error validando PDF:', error)
    return false
  }
}
```

### 📊 Entregables Sprint 1-2
- ✅ Corregir errores de sintaxis críticos
- ✅ Implementar retry logic con backoff exponencial
- ✅ Agregar validación robusta de PDFs
- ✅ Mejorar logging estructurado
- ✅ Tests unitarios básicos

---

## 🔧 SPRINT 3-4: Mejoras de Procesamiento (2 semanas)

### 🎯 Optimizaciones Clave

#### 1. Chunking Inteligente Mejorado
```typescript
// Mejorar en procesar-documentos/index.ts
function chunkearRubricaMejorado(texto: string, documento: any) {
  const chunks = []
  
  // Detectar múltiples patrones de criterios
  const patrones = [
    /(?:Criterio|Descriptor|Nivel)\s+([A-D]\.?\d+)/gi,
    /Estándar\s+([A-D])\.(\d+)/gi,
    /Dominio\s+([A-D])/gi
  ]
  
  // Usar el patrón que más matches encuentre
  let mejorPatron = null
  let maxMatches = 0
  
  for (const patron of patrones) {
    const matches = [...texto.matchAll(patron)]
    if (matches.length > maxMatches) {
      maxMatches = matches.length
      mejorPatron = patron
    }
  }
  
  if (!mejorPatron) {
    return chunkearGenerico(texto, documento)
  }
  
  // Procesar con el mejor patrón encontrado
  const matches = [...texto.matchAll(mejorPatron)]
  // ... resto de la lógica
}
```

#### 2. Detección Automática de Tipo de Documento
```typescript
// Agregar función de clasificación inteligente
async function clasificarDocumentoConIA(texto: string): Promise<{
  tipo: string
  nivel_educativo: string
  modalidad: string
  confianza: number
}> {
  
  const prompt = `
  Analiza este texto de documento educativo chileno y clasifica:
  
  TIPOS POSIBLES:
  - manual_portafolio: Manual de Portafolio Docente
  - rubrica: Rúbricas de evaluación MBE
  - mbe: Marco para la Buena Enseñanza
  - instructivo: Instructivos y guías
  
  NIVELES EDUCATIVOS:
  - parvularia, basica_1_6, basica_7_8_media, media_tp, especial_regular, etc.
  
  MODALIDADES:
  - regular, especial, hospitalaria, encierro, lengua_indigena
  
  Texto: ${texto.substring(0, 2000)}
  
  Responde en JSON:
  {
    "tipo": "...",
    "nivel_educativo": "...", 
    "modalidad": "...",
    "confianza": 0.95
  }
  `
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1
    })
  })
  
  const result = await response.json()
  return JSON.parse(result.choices[0].message.content)
}
```

#### 3. Cache de Embeddings
```typescript
// Implementar cache simple en memoria
class EmbeddingCache {
  private cache = new Map<string, number[]>()
  
  getKey(texto: string): string {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
      .then(hash => Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0')).join(''))
  }
  
  async get(texto: string): Promise<number[] | null> {
    const key = await this.getKey(texto)
    return this.cache.get(key) || null
  }
  
  async set(texto: string, embedding: number[]): Promise<void> {
    const key = await this.getKey(texto)
    this.cache.set(key, embedding)
  }
}
```

### 📊 Entregables Sprint 3-4
- ✅ Chunking inteligente con múltiples patrones
- ✅ Clasificación automática con GPT-4
- ✅ Cache de embeddings para optimización
- ✅ Procesamiento paralelo de chunks
- ✅ Métricas de performance detalladas

---

## 🔍 SPRINT 5-6: Monitoreo Inteligente (2 semanas)

### 🎯 Detección Avanzada de Cambios

#### 1. Análisis Semántico de Diferencias
```typescript
// Agregar en monitor-documentos-oficiales/index.ts
async function analizarCambiosSemanticos(
  textoAnterior: string,
  textoNuevo: string
): Promise<AnalisisCambios> {
  
  const prompt = `
  Analiza los cambios entre estas dos versiones de un documento educativo oficial:
  
  VERSIÓN ANTERIOR:
  ${textoAnterior.substring(0, 3000)}
  
  VERSIÓN NUEVA:
  ${textoNuevo.substring(0, 3000)}
  
  Identifica:
  1. Tipo de cambios (contenido_nuevo, criterio_modificado, estructura_cambiada)
  2. Impacto (critico, alto, medio, bajo)
  3. Secciones afectadas
  4. Recomendaciones de acción
  
  Responde en JSON estructurado.
  `
  
  // Llamada a OpenAI para análisis
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1
    })
  })
  
  const result = await response.json()
  return JSON.parse(result.choices[0].message.content)
}
```

#### 2. Scraping Más Robusto
```typescript
// Mejorar extracción de links
function extraerLinksPDFMejorado(html: string, baseUrl: string): Array<{ nombre: string; url: string }> {
  const links: Array<{ nombre: string; url: string }> = []
  
  // Múltiples patrones para diferentes estructuras HTML
  const patrones = [
    /href=[\"']([^\"']*\.pdf)[\"'][^>]*>([^<]*)<\/a>/gi,
    /href=[\"']([^\"']*\.pdf)[\"'][^>]*title=[\"']([^\"']*)[\"']/gi,
    /<a[^>]*href=[\"']([^\"']*\.pdf)[\"'][^>]*>.*?<span[^>]*>([^<]*)<\/span>/gi
  ]
  
  for (const patron of patrones) {
    let match
    while ((match = patron.exec(html)) !== null) {
      const url = match[1]
      const nombre = (match[2] || url.split('/').pop() || '').trim()
      
      if (nombre && !links.some(l => l.url === url)) {
        links.push({
          nombre,
          url: url.startsWith('http') ? url : new URL(url, baseUrl).href
        })
      }
    }
  }
  
  return links
}
```

#### 3. Notificaciones Inteligentes
```typescript
// Mejorar sistema de notificaciones
interface NotificacionContextual {
  tipo: 'documento_nuevo' | 'cambio_critico' | 'error_procesamiento'
  prioridad: 'alta' | 'media' | 'baja'
  documento: {
    nombre: string
    tipo: string
    url: string
  }
  cambios?: {
    resumen: string
    impacto: string
    acciones_recomendadas: string[]
  }
  destinatarios: string[]
}

async function enviarNotificacionContextual(notif: NotificacionContextual) {
  // Determinar canal según prioridad
  const canales = notif.prioridad === 'alta' 
    ? ['realtime', 'email'] 
    : ['realtime']
  
  for (const canal of canales) {
    switch (canal) {
      case 'realtime':
        await supabase
          .channel('notificaciones-documentos')
          .send({
            type: 'broadcast',
            event: 'nueva_notificacion',
            payload: notif
          })
        break
        
      case 'email':
        // Implementar con Resend
        await enviarEmailNotificacion(notif)
        break
    }
  }
}
```

### 📊 Entregables Sprint 5-6
- ✅ Análisis semántico de cambios con GPT-4
- ✅ Scraping robusto con múltiples patrones
- ✅ Notificaciones contextuales inteligentes
- ✅ Dashboard básico de monitoreo
- ✅ Alertas automáticas por criticidad

---

## 📊 SPRINT 7-8: Dashboard y Métricas (2 semanas)

### 🎨 Panel de Control Administrativo

#### 1. Componente de Dashboard Principal
```typescript
// components/admin/DocumentosDashboard.tsx
export function DocumentosDashboard() {
  const [metricas, setMetricas] = useState<DashboardMetrics>()
  const [documentos, setDocumentos] = useState<DocumentoOficial[]>([])
  const [cambiosRecientes, setCambiosRecientes] = useState<CambioDocumento[]>([])
  
  useEffect(() => {
    cargarDashboard()
    
    // Actualización en tiempo real
    const channel = supabase
      .channel('dashboard-documentos')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'documentos_oficiales'
      }, () => {
        cargarDashboard()
      })
      .subscribe()
      
    return () => supabase.removeChannel(channel)
  }, [])
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Documentos Monitoreados"
        value={metricas?.documentos_monitoreados || 0}
        icon={FileText}
        trend="+2 esta semana"
      />
      
      <MetricCard
        title="Cambios Detectados"
        value={metricas?.cambios_detectados_hoy || 0}
        icon={AlertTriangle}
        trend="Últimas 24h"
      />
      
      <MetricCard
        title="Procesamiento Pendiente"
        value={metricas?.procesamiento_pendiente || 0}
        icon={Clock}
        trend={metricas?.procesamiento_pendiente > 5 ? "Alto" : "Normal"}
      />
      
      <MetricCard
        title="Salud del Sistema"
        value={metricas?.salud_sistema || 'Desconocido'}
        icon={Activity}
        trend="Tiempo real"
      />
    </div>
  )
}
```

#### 2. Visualización de Cambios
```typescript
// components/admin/TimelineCambios.tsx
export function TimelineCambios({ cambios }: { cambios: CambioDocumento[] }) {
  return (
    <div className="space-y-4">
      {cambios.map((cambio) => (
        <div key={cambio.id} className="flex items-start space-x-4 p-4 border rounded-lg">
          <div className={`w-3 h-3 rounded-full mt-2 ${
            cambio.impacto_estimado === 'alto' ? 'bg-red-500' :
            cambio.impacto_estimado === 'medio' ? 'bg-yellow-500' : 'bg-green-500'
          }`} />
          
          <div className="flex-1">
            <h4 className="font-medium">{cambio.documento?.titulo}</h4>
            <p className="text-sm text-gray-600">{cambio.diff_resumen}</p>
            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
              <span>{cambio.version_anterior} → {cambio.version_nueva}</span>
              <span>{formatDistanceToNow(new Date(cambio.detectado_at))} ago</span>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => verDetallesCambio(cambio.id)}
          >
            Ver Detalles
          </Button>
        </div>
      ))}
    </div>
  )
}
```

#### 3. API de Métricas
```typescript
// app/api/admin/metricas/route.ts
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  // Obtener métricas en paralelo
  const [
    documentosCount,
    cambiosHoy,
    procesamientoPendiente,
    ultimaActualizacion
  ] = await Promise.all([
    supabase.from('documentos_oficiales').select('id', { count: 'exact' }),
    supabase.from('historial_cambios_documentos')
      .select('id', { count: 'exact' })
      .gte('detectado_at', new Date().toISOString().split('T')[0]),
    supabase.from('documentos_oficiales')
      .select('id', { count: 'exact' })
      .eq('procesado', false),
    supabase.from('documentos_oficiales')
      .select('fecha_procesamiento')
      .order('fecha_procesamiento', { ascending: false })
      .limit(1)
      .single()
  ])
  
  const metricas: DashboardMetrics = {
    documentos_monitoreados: documentosCount.count || 0,
    cambios_detectados_hoy: cambiosHoy.count || 0,
    procesamiento_pendiente: procesamientoPendiente.count || 0,
    salud_sistema: procesamientoPendiente.count > 10 ? 'advertencia' : 'optimo',
    ultima_actualizacion: ultimaActualizacion.data?.fecha_procesamiento || ''
  }
  
  return Response.json(metricas)
}
```

### 📊 Entregables Sprint 7-8
- ✅ Dashboard administrativo completo
- ✅ Visualización de cambios en timeline
- ✅ API de métricas en tiempo real
- ✅ Alertas visuales por criticidad
- ✅ Herramientas básicas de debugging

---

## 🎯 RESULTADOS ESPERADOS (8 semanas)

### 📈 Métricas de Impacto
- **Estabilidad**: Reducir fallos de procesamiento de ~15% a <3%
- **Performance**: Tiempo de procesamiento de documentos <5 minutos
- **Confiabilidad**: Detección de cambios con >95% de precisión
- **Usabilidad**: Dashboard funcional para administradores

### 🔧 Funcionalidades Entregadas
1. ✅ Sistema de monitoreo estable y robusto
2. ✅ Procesamiento inteligente con IA
3. ✅ Detección semántica de cambios
4. ✅ Dashboard administrativo funcional
5. ✅ Notificaciones contextuales
6. ✅ API de métricas en tiempo real

### 💡 Valor de Negocio
- **Automatización**: 90% menos intervención manual
- **Confianza**: Información siempre actualizada
- **Eficiencia**: Profesores con acceso inmediato a cambios
- **Escalabilidad**: Base sólida para futuras mejoras

---

## 🚀 PRÓXIMOS PASOS POST-IMPLEMENTACIÓN

### Semana 9-12: Optimización y Monitoreo
- Ajustar parámetros basado en uso real
- Optimizar performance de embeddings
- Implementar métricas avanzadas
- Preparar para Fase 2 del roadmap completo

### Preparación para Fases Futuras
- Documentar lecciones aprendidas
- Establecer baseline de métricas
- Planificar integración con sistema de evaluación
- Evaluar necesidades de escalamiento