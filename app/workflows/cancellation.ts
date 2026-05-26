import { FatalError } from "workflow";
import { resumeHook } from "workflow/api";
import { Appointment } from "@/lib/db";

// ─── Steps ───────────────────────────────────────────────────────────────────

/** Valida que la cancelación se realiza con más de 1 hora de antelación. */
export async function validateCancellationStep(appointment: Appointment) {
  "use step";
  const appointmentTime = new Date(appointment.dateTime).getTime();
  const oneHourFromNow = Date.now() + 60 * 60 * 1000;
  if (appointmentTime <= oneHourFromNow) {
    throw new FatalError(
      `[WORKFLOW CANCEL] ❌ No se puede cancelar la cita "${appointment.id}": faltan menos de 60 minutos.`
    );
  }
  console.log(`[WORKFLOW CANCEL] ✅ Validación superada para cita "${appointment.id}".`);
  return { valid: true };
}

/** Actualiza el estado de la cita a 'cancelled' en la base de datos. */
export async function markCancelledInDbStep(appointmentId: string) {
  "use step";
  const { db } = await import("@/lib/db");
  const updated = db.updateAppointmentStatus(appointmentId, "cancelled");
  if (!updated) {
    throw new FatalError(`[WORKFLOW CANCEL] ❌ No se encontró la cita "${appointmentId}" en la base de datos.`);
  }
  console.log(`[WORKFLOW CANCEL] 💾 Cita "${appointmentId}" marcada como CANCELADA en la base de datos.`);
  return { success: true };
}

/** Mock: envía email de cancelación al paciente. */
export async function sendCancellationEmailStep(appointment: Appointment) {
  "use step";
  console.log(`[WORKFLOW CANCEL] ✉️ Enviando email de cancelación a "${appointment.patientEmail}"...`);
  await new Promise((resolve) => setTimeout(resolve, 300));
  console.log(
    `[WORKFLOW CANCEL] ✅ Email de cancelación enviado a "${appointment.patientEmail}". ` +
    `Asunto: "Tu cita del ${new Date(appointment.dateTime).toLocaleDateString('es-ES')} ha sido cancelada."`
  );
  return { success: true };
}

/** Mock: envía SMS de cancelación al paciente. */
export async function sendCancellationSmsStep(appointment: Appointment) {
  "use step";
  console.log(`[WORKFLOW CANCEL] 📱 Enviando SMS de cancelación a "${appointment.patientName}"...`);
  await new Promise((resolve) => setTimeout(resolve, 200));
  console.log(
    `[WORKFLOW CANCEL] ✅ SMS enviado: "Hola ${appointment.patientName}, tu cita médica del ` +
    `${new Date(appointment.dateTime).toLocaleDateString('es-ES')} ha sido cancelada correctamente."`
  );
  return { success: true };
}

/** Mock: elimina el evento de Google Calendar del médico. */
export async function removeFromCalendarStep(appointment: Appointment) {
  "use step";
  const eventId = Buffer.from(appointment.id).toString("base64");
  console.log(`[WORKFLOW CANCEL] 📅 Eliminando evento "${eventId}" de Google Calendar para el médico "${appointment.doctorId}"...`);
  await new Promise((resolve) => setTimeout(resolve, 250));
  console.log(`[WORKFLOW CANCEL] ✅ Evento eliminado de Google Calendar.`);
  return { success: true, removedEventId: eventId };
}

/**
 * Si el workflow de agendamiento original estaba suspendido esperando la
 * confirmación del paciente (hook `confirm-{id}`), lo reanudamos con
 * `confirmed: false` para que termine limpiamente sin quedarse huérfano.
 */
export async function closeConfirmationHookStep(appointmentId: string) {
  "use step";
  try {
    await resumeHook(`confirm-${appointmentId}`, { confirmed: false });
    console.log(`[WORKFLOW CANCEL] ⚓ Hook de confirmación "confirm-${appointmentId}" cerrado correctamente.`);
    return { closed: true };
  } catch (err: any) {
    // El hook puede no existir si el workflow original ya terminó o nunca llegó
    // a ese punto. En ese caso simplemente ignoramos el error.
    console.log(
      `[WORKFLOW CANCEL] ℹ️ Hook "confirm-${appointmentId}" no encontrado o ya cerrado (normal si la cita es reciente). Error: ${err?.message}`
    );
    return { closed: false };
  }
}

// ─── Workflow principal ───────────────────────────────────────────────────────

/**
 * Workflow durable de cancelación de cita médica.
 *
 * Pasos:
 * 1. Validar que la cancelación es válida (>1h de antelación).
 * 2. Marcar la cita como cancelada en la BD.
 * 3. En paralelo: enviar email + SMS + eliminar de Google Calendar.
 * 4. Cerrar el hook de confirmación pendiente (si existe).
 */
export async function cancellationWorkflow(appointment: Appointment) {
  "use workflow";

  console.log(`[WORKFLOW CANCEL] 🎬 Iniciando flujo de cancelación para cita: "${appointment.id}"`);

  // 1. Validar la regla de negocio (FatalError si no cumple)
  await validateCancellationStep(appointment);

  // 2. Actualizar estado en BD
  await markCancelledInDbStep(appointment.id);

  // 3. Notificaciones en paralelo (el calendario y el paciente)
  await Promise.all([
    sendCancellationEmailStep(appointment),
    sendCancellationSmsStep(appointment),
    removeFromCalendarStep(appointment),
  ]);

  // 4. Cerrar el hook de confirmación del workflow de agendamiento si estaba pendiente
  await closeConfirmationHookStep(appointment.id);

  console.log(`[WORKFLOW CANCEL] 🏁 Flujo de cancelación completado para cita "${appointment.id}".`);
  return { success: true, appointmentId: appointment.id, status: "cancelled" };
}
