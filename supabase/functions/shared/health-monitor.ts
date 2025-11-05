import { createClient } from "npm:@supabase/supabase-js@2.30.0";

interface HealthCheck {
  component: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  latency_ms: number
  error?: string
  timestamp: string
}

export class HealthMonitor {
  private supabase: any;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
  }

  async checkDatabase(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      await this.supabase.from('documentos_oficiales').select('id').limit(1);
      return {
        component: 'database',
        status: 'healthy',
        latency_ms: Date.now() - start,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        component: 'database',
        status: 'unhealthy',
        latency_ms: Date.now() - start,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async checkOpenAI(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}` }
      });
      
      const status = response.ok ? 'healthy' : 'degraded';
      return {
        component: 'openai',
        status,
        latency_ms: Date.now() - start,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        component: 'openai',
        status: 'unhealthy',
        latency_ms: Date.now() - start,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async checkStorage(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      await this.supabase.storage.from('documentos-oficiales').list('', { limit: 1 });
      return {
        component: 'storage',
        status: 'healthy',
        latency_ms: Date.now() - start,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        component: 'storage',
        status: 'unhealthy',
        latency_ms: Date.now() - start,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async runAllChecks(): Promise<{
    overall_status: 'healthy' | 'degraded' | 'unhealthy'
    checks: HealthCheck[]
  }> {
    const checks = await Promise.all([
      this.checkDatabase(),
      this.checkOpenAI(),
      this.checkStorage()
    ]);

    const unhealthy = checks.filter(c => c.status === 'unhealthy').length;
    const degraded = checks.filter(c => c.status === 'degraded').length;

    let overall_status: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthy > 0) overall_status = 'unhealthy';
    else if (degraded > 0) overall_status = 'degraded';
    else overall_status = 'healthy';

    // Guardar métricas
    await this.supabase.from('health_metrics').insert({
      overall_status,
      checks,
      timestamp: new Date().toISOString()
    }).catch(() => {}); // No fallar si no se puede guardar

    return { overall_status, checks };
  }
}