import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  return NextResponse.json({
    status: 'success',
    data: db.getSpecialties()
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name || !description) {
      return NextResponse.json(
        { status: 'error', message: 'El nombre y la descripción son obligatorios.' },
        { status: 400 }
      );
    }

    const newSpecialty = db.addSpecialty({ name, description });

    return NextResponse.json({
      status: 'success',
      data: newSpecialty
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Error al procesar la solicitud.' },
      { status: 500 }
    );
  }
}
