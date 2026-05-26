import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  return NextResponse.json({
    status: 'success',
    data: db.getDoctors()
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if it's a seed reset command
    if (body.action === 'reset') {
      db.initialize(true);
      return NextResponse.json({
        status: 'success',
        message: 'Base de datos de demostración restablecida correctamente.'
      });
    }

    const { name, specialtyId, clinicId, schedules } = body;

    if (!name || !specialtyId || !clinicId || !schedules || !Array.isArray(schedules)) {
      return NextResponse.json(
        { status: 'error', message: 'Datos incompletos para registrar un médico.' },
        { status: 400 }
      );
    }

    const newDoctor = db.addDoctor({
      name,
      specialtyId,
      clinicId,
      schedules
    });

    return NextResponse.json({
      status: 'success',
      data: newDoctor
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Error al procesar la solicitud.' },
      { status: 500 }
    );
  }
}
