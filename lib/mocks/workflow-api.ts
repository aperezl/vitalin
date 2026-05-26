import { triggerHookResume } from "./workflow";

export async function start(workflowFn: Function, args?: any[]): Promise<{ runId: string; returnValue: Promise<any> }> {
  const runId = `run-${Math.random().toString(36).substring(2, 9)}`;
  console.log(`[WORKFLOW SIMULATOR] 🚀 Iniciando ejecución del Workflow con ID: ${runId}`);
  
  const returnValue = (async () => {
    try {
      return await workflowFn(...(args || []));
    } catch (e) {
      console.error(`[WORKFLOW SIMULATOR] ❌ Error en ejecución del Workflow ${runId}:`, e);
      throw e;
    }
  })();

  return { runId, returnValue };
}

export async function resumeHook(token: string, payload: any): Promise<void> {
  console.log(`[WORKFLOW SIMULATOR] 📥 Solicitando reanudación para token: "${token}"`);
  const success = triggerHookResume(token, payload);
  if (!success) {
    console.warn(`[WORKFLOW SIMULATOR] ⚠️ No se encontró ningún Hook activo esperando con el token: "${token}"`);
  }
}
