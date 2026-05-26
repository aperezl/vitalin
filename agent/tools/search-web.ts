import { llm } from '@livekit/agents';
import { z } from 'zod';

/**
 * Esquema de validación estricta para los parámetros de entrada de la herramienta.
 */
const SearchParamsSchema = z.object({
  query: z.string().describe('La cadena de búsqueda optimizada para localizar el objeto, planta o información actual.'),
});

type SearchParams = z.infer<typeof SearchParamsSchema>;

/**
 * Definición e implementación de la herramienta de búsqueda web.
 * Esta función será expuesta a Gemini para expandir su conocimiento en tiempo real.
 */
export const searchWebTool = llm.tool({
  description: 'Busca información en tiempo real en internet. Úsala cuando el usuario te muestre un objeto o planta por cámara que requiera verificación, o pregunte por datos de actualidad.',
  parameters: SearchParamsSchema,
  execute: async ({ query }: SearchParams): Promise<string> => {
    console.log(`\n[TOOL_EXECUTION] 🔍 Gemini ha invocado "searchWeb" con la consulta: "${query}"`);

    try {
      // Codificamos la query de forma segura para evitar problemas con caracteres especiales
      const targetUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Error en el motor de búsqueda (Status: ${response.status})`);
      }

      const htmlText = await response.text();

      // Extracción rápida y limpia de los tres primeros snippets de resultados usando Regex básicos
      // Evitamos meter librerías pesadas de scraping para mantener la latencia al mínimo
      const matches = [...htmlText.matchAll(/<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g)];

      if (matches.length === 0) {
        return `No se encontraron resultados web indexados para: "${query}".`;
      }

      const snippets = matches
        .slice(0, 3)
        .map((match, index) => `[Resultado ${index + 1}]: ${match[1].replace(/<[^>]*>/g, '').trim()}`)
        .join('\n\n');

      console.log(`[TOOL_SUCCESS] ✅ Búsqueda completada de forma síncrona. Enviando datos a Gemini.`);
      return `Resultados extraídos de internet en tiempo real:\n\n${snippets}`;

    } catch (error: any) {
      console.error(`[TOOL_ERROR] Error al ejecutar el scraping de búsqueda:`, error);
      return `Error de conectividad: No se pudo acceder a los resultados en tiempo real para "${query}".`;
    }
  },
});