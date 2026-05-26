import { NextRequest, NextResponse } from "next/server";
import { resumeHook } from "workflow/api";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appointmentId, response } = body;

    if (!appointmentId || !response) {
      return NextResponse.json({ status: "error", message: "Faltan parámetros: appointmentId o response" }, { status: 400 });
    }

    const confirmed = response.toUpperCase().trim() === "SI" || response.toUpperCase().trim() === "SÍ";
    
    // Si el paciente cancela ("NO"), eliminamos la cita en nuestra base de datos local
    if (!confirmed) {
      try {
        db.deleteAppointment(appointmentId);
        console.log(`[API CONFIRM] 🗑️ Cita "${appointmentId}" eliminada de la base de datos por cancelación.`);
      } catch (dbError) {
        console.warn(`[API CONFIRM] Advertencia al eliminar cita en base de datos:`, dbError);
      }
    }

    // Despertar el Hook del workflow duradero enviando la respuesta del paciente
    await resumeHook(`confirm-${appointmentId}`, { confirmed });

    return NextResponse.json({
      status: "success",
      message: `Hook de confirmación despertado para la cita "${appointmentId}". Confirmada: ${confirmed}`
    });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error?.message || "Error al procesar confirmación." }, { status: 500 });
  }
}
