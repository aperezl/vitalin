import { JobContext, ServerOptions, cli, defineAgent, voice, llm } from '@livekit/agents';
import { beta as googleBeta } from '@livekit/agents-plugin-google';
import { SYSTEM_INSTRUCTIONS } from './core/prompts.js';
import { searchWebTool } from './tools/search-web.js';
import { getClinicsTool, getSpecialtiesTool, getDoctorsTool, bookAppointmentTool, getPatientAppointmentsTool, cancelAppointmentTool } from './tools/clinic-tools.js';
import { z } from 'zod';

// Cargar variables de entorno de forma nativa en Node.js
try {
  process.loadEnvFile('.env.local');
} catch {
  // Ignorar si el archivo no existe
}

// Inicialización de la definición del Agente LiveKit
export default defineAgent({
  entry: async (ctx: JobContext): Promise<void> => {
    console.log(`\n[WORKER] 🚀 Nueva solicitud de trabajo recibida para la sala: "${ctx.room.name}"`);

    try {
      // Conexión WebRTC bidireccional
      await ctx.connect();
      console.log(`[WORKER] ✅ Conectado exitosamente a la sala: ${ctx.room.name}`);

      // Herramienta para colgar la llamada y cerrar sesión
      const endSessionTool = llm.tool({
        description: 'Cuelga la llamada y desconecta la sesión de voz actual. Debe ser invocada de inmediato cuando el usuario confirme que no desea realizar más consultas, se despida o pida colgar.',
        parameters: z.object({}),
        execute: async (): Promise<string> => {
          console.log('[WORKER] 🚪 El agente ha solicitado finalizar la sesión.');
          // Esperar 4 segundos para que el TTS reproduzca la despedida antes de desconectar
          setTimeout(() => {
            console.log('[WORKER] 🔌 Desconectando y apagando el contexto de la sesión...');
            ctx.shutdown();
          }, 4000);
          return 'Cerrando sesión. Por favor, despídete de forma cordial.';
        }
      });

      // Creación del agente de voz con el modelo en tiempo real de Gemini
      const voiceAgent = new voice.Agent({
        instructions: SYSTEM_INSTRUCTIONS,
        llm: new googleBeta.realtime.RealtimeModel({
          model: 'gemini-3.1-flash-live-preview', // Modelo nativo live multimodal por WebSockets
          apiKey: process.env.GEMINI_API_KEY || '',
          voice: 'Charon',
        }),
        // Inyección de herramientas usando el campo tools
        tools: {
          searchWeb: searchWebTool,
          getClinics: getClinicsTool,
          getSpecialties: getSpecialtiesTool,
          getDoctors: getDoctorsTool,
          bookAppointment: bookAppointmentTool,
          getPatientAppointments: getPatientAppointmentsTool,
          cancelAppointment: cancelAppointmentTool,
          endSession: endSessionTool,
        },
      });

      // Añadimos logs de ciclo de vida
      ctx.room.on('participantConnected', (participant) => {
        console.log(`[SESSION] 👤 Usuario conectado a la sesión: ${participant.identity}`);
      });

      ctx.room.on('participantDisconnected', (participant) => {
        console.log(`[SESSION] 🚪 Usuario ${participant.identity} abandonó la sala.`);
      });

      // Instanciamos e iniciamos la sesión del agente
      const session = new voice.AgentSession({
        llm: voiceAgent.llm,
      });

      await session.start({
        agent: voiceAgent,
        room: ctx.room,
      });

      // Hacer que el agente empiece hablando de forma proactiva al descolgar
      // Usamos realtime_input en lugar de generateReply porque el API Live de Gemini
      // no admite eventos 'content' desde el cliente en algunos entornos y lanza error 1008.
      const rtSession = (session as any).activity?.realtimeSession;
      if (rtSession) {
        rtSession.sendClientEvent({
          type: 'realtime_input',
          value: {
            text: 'Hola. Preséntate brevemente como Vitalin de Nazarena Clinic, indica de forma muy concisa y amable que puedes ayudar a reservar, consultar o cancelar citas, y pregúntale al usuario en qué le puedes ayudar hoy.'
          }
        });
      } else {
        session.generateReply();
      }

      console.log(`[WORKER] 🤖 Agente de voz y visión de Gemini inicializado con herramientas de búsqueda...`);
    } catch (error) {
      console.error(`[WORKER_ERROR] Fallo crítico en el ciclo de vida del agente:`, error);
      ctx.shutdown();
    }
  },
});

// Arrancamos el control de la aplicación del worker a través del CLI nativo de LiveKit
cli.runApp(new ServerOptions({
  agent: import.meta.filename,
}));