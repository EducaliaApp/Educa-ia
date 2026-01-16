import { HealthMonitor } from "../shared/health-monitor.ts";

Deno.serve(async (req: Request) => {
  try {
    const monitor = new HealthMonitor();
    const healthStatus = await monitor.runAllChecks();
    
    const statusCode = healthStatus.overall_status === 'healthy' ? 200 : 
                      healthStatus.overall_status === 'degraded' ? 206 : 503;
    
    return new Response(JSON.stringify({
      status: healthStatus.overall_status,
      timestamp: new Date().toISOString(),
      checks: healthStatus.checks,
      uptime: Deno.env.get('DENO_DEPLOYMENT_ID') || 'unknown'
    }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});