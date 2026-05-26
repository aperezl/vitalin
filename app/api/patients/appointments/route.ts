import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const doctorId = searchParams.get('doctorId');

    let appts = db.getAppointments();

    if (email) {
      appts = appts.filter(a => a.patientEmail.toLowerCase().trim() === email.toLowerCase().trim());
    }
    if (doctorId) {
      appts = appts.filter(a => a.doctorId === doctorId);
    }

    return NextResponse.json({
      status: 'success',
      data: appts
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Error al procesar la solicitud.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientName, patientEmail, clinicId, specialtyId, doctorId, dateTime } = body;

    if (!patientName || !patientEmail || !clinicId || !specialtyId || !doctorId || !dateTime) {
      return NextResponse.json(
        { status: 'error', message: 'Datos incompletos para agendar la cita.' },
        { status: 400 }
      );
    }

    // Basic date validation
    const dateObj = new Date(dateTime);
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json(
        { status: 'error', message: 'La fecha y hora de la cita no es válida.' },
        { status: 400 }
      );
    }

    const newAppt = db.addAppointment({
      patientName,
      patientEmail,
      clinicId,
      specialtyId,
      doctorId,
      dateTime
    });

    return NextResponse.json({
      status: 'success',
      data: newAppt
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Error al procesar la solicitud.' },
      { status: 550 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { status: 'error', message: 'Falta el parámetro id para cancelar la cita.' },
        { status: 400 }
      );
    }

    const success = db.deleteAppointment(id);
    if (success) {
      return NextResponse.json({
        status: 'success',
        message: 'Cita cancelada correctamente.'
      });
    } else {
      return NextResponse.json(
        { status: 'error', message: 'No se encontró ninguna cita registrada con ese ID.' },
        { status: 404 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Error al procesar la solicitud de cancelación.' },
      { status: 500 }
    );
  }
}

