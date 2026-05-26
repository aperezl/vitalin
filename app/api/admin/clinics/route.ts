import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  return NextResponse.json({
    status: 'success',
    data: db.getClinics()
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, address } = body;

    if (!name || !address) {
      return NextResponse.json(
        { status: 'error', message: 'Falta el nombre o la dirección de la clínica.' },
        { status: 400 }
      );
    }

    const newClinic = db.addClinic({ name, address });

    return NextResponse.json({
      status: 'success',
      data: newClinic
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Error al procesar la solicitud.' },
      { status: 550 }
    );
  }
}
