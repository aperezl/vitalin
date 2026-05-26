import { sleep, createHook } from "workflow";
import { Appointment } from "@/lib/db";

// Paso duradero para simular la sincronización con Google Calendar
export async function syncGoogleCalendarStep(appointment: Appointment) {
  "use step";
  console.log(`[WORKFLOW STEP] 📅 Sincronizando cita "${appointment.id}" con Google Calendar para el médico "${appointment.doctorId}"...`);
  // Simular latencia de red
  await new Promise((resolve) => setTimeout(resolve, 300));
  const calendarLink = `https://calendar.google.com/calendar/event?eid=${Buffer.from(appointment.id).toString("base64")}`;
  console.log(`[WORKFLOW STEP] ✅ Google Calendar sincronizado. Enlace del evento: ${calendarLink}`);
  return { calendarLink };
}

// Paso duradero para simular el envío del correo de confirmación
export async function sendConfirmationEmailStep(appointment: Appointment) {
  "use step";
  console.log(`[WORKFLOW STEP] ✉️ Enviando correo de confirmación a "${appointment.patientEmail}"...`);
  await new Promise((resolve) => setTimeout(resolve, 400));
  console.log(`[WORKFLOW STEP] ✅ Correo de confirmación enviado exitosamente.`);
  return { success: true };
}

// Paso duradero para simular el envío del SMS inicial
export async function sendSmsNotificationStep(appointment: Appointment) {
  "use step";
  console.log(`[WORKFLOW STEP] 📱 Enviando SMS de confirmación inicial a "${appointment.patientName}"...`);
  await new Promise((resolve) => setTimeout(resolve, 200));
  console.log(`[WORKFLOW STEP] ✅ SMS inicial enviado a "${appointment.patientName}".`);
  return { success: true };
}

// Paso duradero para enviar el recordatorio de 24 horas antes
export async function send24hReminderStep(appointment: Appointment) {
  "use step";
  console.log(`[WORKFLOW STEP] 🔔 Enviando SMS recordatorio de 24 horas a "${appointment.patientName}" (${appointment.patientEmail})...`);
  console.log(`[WORKFLOW STEP] SMS: "Gonzalo Nazareno: Hola ${appointment.patientName}, te recordamos tu cita médica para mañana a las ${new Date(appointment.dateTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}. Por favor responde SI para confirmar o NO para cancelar."`);
  return { success: true };
}

// Paso duradero para actualizar la cita en la base de datos según respuesta
export async function updateAppointmentStatusStep(appointmentId: string, confirmed: boolean) {
  "use step";
  const action = confirmed ? "CONFIRMADA" : "CANCELADA";
  console.log(`[WORKFLOW STEP] 💾 Actualizando estado de la cita "${appointmentId}" en Base de Datos a: ${action}`);
  return { status: action };
}

// Workflow principal duradero orchestrador
export async function appointmentWorkflow(appointment: Appointment) {
  "use workflow";

  console.log(`[WORKFLOW] 🎬 Iniciando flujo de trabajo para la cita: "${appointment.id}"`);

  // 1. Ejecutar las confirmaciones y sincronizaciones iniciales en paralelo
  await Promise.all([
    syncGoogleCalendarStep(appointment),
    sendConfirmationEmailStep(appointment),
    sendSmsNotificationStep(appointment)
  ]);

  console.log(`[WORKFLOW] ⏳ Planificando sleep de recordatorio hasta 24 horas antes de la cita (${appointment.dateTime})...`);
  
  // En un flujo real calcularíamos la fecha y restaríamos 24h
  // Por ejemplo: const reminderTime = new Date(appointment.dateTime).getTime() - (24 * 60 * 60 * 1000);
  // Y haríamos: await sleep(reminderTime);
  // Para la simulación interactiva, hacemos un sleep representativo de "24h" (que nuestro mock simulará en 2 segundos)
  await sleep("24h");

  // 2. Enviar el recordatorio de 24h
  await send24hReminderStep(appointment);

  // 3. Crear un Hook duradero para esperar la interacción del usuario
  // Usamos el ID de la cita como token para poder reanudar el flujo desde el endpoint API
  const confirmationHook = createHook<{ confirmed: boolean }>({
    token: `confirm-${appointment.id}`
  });

  console.log(`[WORKFLOW] ⚓ Cita "${appointment.id}" suspendida. Esperando confirmación del paciente...`);
  const response = await confirmationHook;

  // 4. Actualizar el estado de la cita en base a la respuesta del paciente
  const updateResult = await updateAppointmentStatusStep(appointment.id, response.confirmed);

  console.log(`[WORKFLOW] 🏁 Flujo de trabajo completado con estado final de la cita: ${updateResult.status}`);
  return { success: true, status: updateResult.status };
}
