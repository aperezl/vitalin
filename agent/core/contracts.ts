/**
 * Idiomas soportados nativamente por el Agente en su capa de traducción contextual.
 */
export type SupportedLanguages = 'es' | 'en';

/**
 * Configuración estructural del Agente Multimodal.
 */
export interface AgentCapabilities {
  hasVision: boolean;
  hasAudio: boolean;
  maxTemperature: number;
}

/**
 * Contrato de ejecución para las herramientas (Function Calling) asociadas al Agente.
 */
export interface ToolDefinition<TParams = any, TOutput = string> {
  name: string;
  description: string;
  schema: any; // Validado en infraestructura mediante Zod
  execute: (params: TParams) => Promise<TOutput>;
}

/**
 * Representación interna de un evento de desconexión o desasignación de sala.
 */
export interface SessionContext {
  roomId: string;
  participantIdentity: string;
  connectedAt: Date;
}