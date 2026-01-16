interface CambioDetectado {
  tipo: 'contenido_nuevo' | 'criterio_modificado' | 'estructura_cambiada'
  impacto: 'critico' | 'alto' | 'medio' | 'bajo'
  descripcion: string
  seccionesAfectadas: string[]
  recomendacionesAccion: string[]
}

interface EntidadEducativa {
  tipo: 'objetivo_aprendizaje' | 'criterio_evaluacion' | 'estandar_mbe'
  texto: string
  dominio?: string
  nivel_taxonomico?: string
  asignaturas_relacionadas: string[]
}

interface ClasificacionDocumento {
  tipo_documento: string
  nivel_educativo: string
  modalidad: string
  asignatura?: string
  confianza: number
}

export class AIAnalyzer {
  private apiKey: string;

  constructor() {
    this.apiKey = Deno.env.get('OPENAI_API_KEY')!;
  }

  async clasificarDocumento(texto: string): Promise<ClasificacionDocumento> {
    const prompt = `Analiza este documento educativo chileno y clasifica:

TEXTO: ${texto.substring(0, 3000)}

Responde SOLO en JSON:
{
  "tipo_documento": "rubrica|manual_portafolio|mbe|instructivo",
  "nivel_educativo": "parvularia|basica_1_6|basica_7_8_media|media_tp|especial_regular|hospitalaria|encierro|lengua_indigena|epja",
  "modalidad": "regular|especial|hospitalaria|encierro|lengua_indigena",
  "asignatura": "matematica|lenguaje|ciencias|historia|etc",
  "confianza": 0.95
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1
      })
    });

    const result = await response.json();
    return JSON.parse(result.choices[0].message.content);
  }

  async detectarCambios(textoAnterior: string, textoNuevo: string): Promise<CambioDetectado[]> {
    const prompt = `Compara estas versiones de documento educativo:

ANTERIOR: ${textoAnterior.substring(0, 2000)}

NUEVA: ${textoNuevo.substring(0, 2000)}

Identifica cambios y responde en JSON:
[{
  "tipo": "contenido_nuevo|criterio_modificado|estructura_cambiada",
  "impacto": "critico|alto|medio|bajo", 
  "descripcion": "descripción del cambio",
  "seccionesAfectadas": ["sección1", "sección2"],
  "recomendacionesAccion": ["acción1", "acción2"]
}]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1
      })
    });

    const result = await response.json();
    return JSON.parse(result.choices[0].message.content);
  }

  async extraerEntidades(texto: string): Promise<EntidadEducativa[]> {
    const prompt = `Extrae entidades educativas de este texto:

${texto.substring(0, 4000)}

Responde en JSON:
[{
  "tipo": "objetivo_aprendizaje|criterio_evaluacion|estandar_mbe",
  "texto": "texto de la entidad",
  "dominio": "A|B|C|D",
  "nivel_taxonomico": "recordar|comprender|aplicar|analizar|evaluar|crear",
  "asignaturas_relacionadas": ["matematica", "lenguaje"]
}]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
      })
    });

    const result = await response.json();
    return JSON.parse(result.choices[0].message.content);
  }

  async analizarCoherencia(documentos: Array<{id: string, texto: string, tipo: string}>): Promise<{
    coherencia_global: number
    inconsistencias: Array<{
      documento1: string
      documento2: string
      descripcion: string
      severidad: 'alta' | 'media' | 'baja'
    }>
  }> {
    const textos = documentos.map(d => `${d.tipo}: ${d.texto.substring(0, 1000)}`).join('\n\n');
    
    const prompt = `Analiza coherencia entre estos documentos educativos:

${textos}

Responde en JSON:
{
  "coherencia_global": 0.85,
  "inconsistencias": [{
    "documento1": "id1",
    "documento2": "id2", 
    "descripcion": "descripción de inconsistencia",
    "severidad": "alta|media|baja"
  }]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1
      })
    });

    const result = await response.json();
    return JSON.parse(result.choices[0].message.content);
  }
}