import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

/**
 * Interface que modela la respuesta exitosa del dispensador de tokens.
 */
interface TokenResponse {
  token: string;
  identity: string;
  room: string;
  serverUrl: string;
}

/**
 * Interface para el control de errores tipados.
 */
interface ErrorResponse {
  error: string;
  details?: string;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<TokenResponse | ErrorResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const room = searchParams.get('room');
    const username = searchParams.get('username') || 'anonymous';

    // Validación estricta de parámetros en tiempo de ejecución
    if (!room) {
      return NextResponse.json(
        { error: 'Missing Required Parameter', details: 'El parámetro "room" es obligatorio.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !serverUrl) {
      return NextResponse.json(
        { error: 'Server Misconfiguration', details: 'Las variables de entorno de LiveKit no están definidas.' },
        { status: 500 }
      );
    }

    // Generación de una identidad única e inmutable para el participante dentro de la sesión
    const uniqueIdentity = `${username.toLowerCase().replace(/\s+/g, '-')}-${Math.random()
      .toString(36)
      .substring(2, 8)}`;

    // Instanciación del Token de Acceso con su tiempo de expiración (2 horas por defecto)
    const accessToken = new AccessToken(apiKey, apiSecret, {
      identity: uniqueIdentity,
      ttl: '2h',
    });

    // Inyección de Grants Criptográficos: Permisos requeridos para interacción en tiempo real y visión
    accessToken.addGrant({
      roomJoin: true,              // Permite entrar a la sala
      room,                        // Vincula el token a esta sala específica
      canPublish: true,            // REQUISITO CRÍTICO: Permite al cliente enviar su micrófono y cámara (visión)
      canSubscribe: true,          // Permite al cliente recibir el audio de respuesta del Agente
      canPublishData: true,        // Permite enviar eventos de control en baja latencia
    });

    // Serialización del token a formato JWT firmado
    const jwtToken = await accessToken.toJwt();

    return NextResponse.json(
      {
        token: jwtToken,
        identity: uniqueIdentity,
        room,
        serverUrl,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API_LIVEKIT_ERROR]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error?.message || 'Error desconocido' },
      { status: 500 }
    );
  }
}