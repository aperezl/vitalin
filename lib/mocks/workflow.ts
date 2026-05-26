export async function sleep(duration: string): Promise<void> {
  console.log(`[WORKFLOW SIMULATOR] 💤 Sleeping/Waiting for ${duration}...`);
  // En simulación acortamos el tiempo real a 2 segundos para poder probarlo de forma interactiva
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log(`[WORKFLOW SIMULATOR] ⏰ Woke up after simulated sleep of ${duration}`);
}

export const fetch = globalThis.fetch;

export class FatalError extends Error {}
export class RetryableError extends Error {}

export interface Hook<T> extends Promise<T>, AsyncIterable<T> {
  token: string;
}

const activeHooks = new Map<string, (value: any) => void>();

export function createHook<T>(options: { token: string }): Hook<T> {
  const token = options.token;
  console.log(`[WORKFLOW SIMULATOR] ⚓ Hook creado y esperando respuesta. Token: "${token}"`);
  
  let resolver: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    resolver = resolve;
    activeHooks.set(token, resolve);
  });

  const hookObj = promise as Hook<T>;
  hookObj.token = token;
  hookObj[Symbol.asyncIterator] = () => {
    let done = false;
    return {
      async next() {
        if (done) return { done: true, value: undefined as any };
        const value = await promise;
        done = true;
        return { done: false, value };
      }
    };
  };

  return hookObj;
}

export function triggerHookResume(token: string, payload: any) {
  const resolver = activeHooks.get(token);
  if (resolver) {
    console.log(`[WORKFLOW SIMULATOR] ✅ Despertando Hook con token "${token}" y datos:`, payload);
    resolver(payload);
    activeHooks.delete(token);
    return true;
  }
  return false;
}
