import { llm } from '@livekit/agents';
import { z } from 'zod';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

/**
 * Herramienta para obtener el listado de clínicas.
 */
export const getClinicsTool = llm.tool({
  description: 'Obtiene el listado de todas las clínicas y centros médicos disponibles de la red, con sus identificadores (clinicId), nombres y direcciones.',
  parameters: z.object({}),
  execute: async (): Promise<string> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/clinics`);
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const resData = await response.json();
      if (resData.status === 'success') {
        return JSON.stringify(resData.data, null, 2);
      }
      return `Error: ${resData.message || 'No se pudieron recuperar las clínicas.'}`;
    } catch (e: any) {
      return `Error al obtener clínicas: ${e.message || e}`;
    }
  }
});

/**
 * Herramienta para obtener el listado de especialidades.
 */
export const getSpecialtiesTool = llm.tool({
  description: 'Obtiene la lista de especialidades médicas de la cartera de servicios (ej. Cardiología, Medicina General, Pediatría, Dermatología) con sus identificadores (specialtyId) y descripciones.',
  parameters: z.object({}),
  execute: async (): Promise<string> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/specialties`);
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const resData = await response.json();
      if (resData.status === 'success') {
        return JSON.stringify(resData.data, null, 2);
      }
      return `Error: ${resData.message || 'No se pudieron recuperar las especialidades.'}`;
    } catch (e: any) {
      return `Error al obtener especialidades: ${e.message || e}`;
    }
  }
});

/**
 * Herramienta para obtener el listado de médicos especialistas y sus horarios.
 */
export const getDoctorsTool = llm.tool({
  description: 'Obtiene el listado de todos los médicos especialistas de la clínica, detallando sus nombres, identificador (doctorId), especialidad (specialtyId), clínica asignada (clinicId) y horarios semanales disponibles.',
  parameters: z.object({}),
  execute: async (): Promise<string> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/doctors`);
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const resData = await response.json();
      if (resData.status === 'success') {
        return JSON.stringify(resData.data, null, 2);
      }
      return `Error: ${resData.message || 'No se pudieron recuperar los médicos.'}`;
    } catch (e: any) {
      return `Error al obtener médicos: ${e.message || e}`;
    }
  }
});

/**
 * Parámetros requeridos para reservar una cita médica.
 */
const BookAppointmentParams = z.object({
  patientName: z.string().describe('Nombre completo del paciente.'),
  patientEmail: z.string().describe('Correo electrónico del paciente para la confirmación de la cita.'),
  clinicId: z.string().describe('ID de la clínica seleccionada (ej. clinic-sevilla).'),
  specialtyId: z.string().describe('ID de la especialidad seleccionada (ej. spec-cardio).'),
  doctorId: z.string().describe('ID del médico especialista seleccionado (ej. doc-alberto).'),
  dateTime: z.string().describe('Fecha y hora solicitada en formato ISO 8601 (ej. "2026-06-01T10:30:00Z" o "2026-06-01T10:30:00"). Debe encajar en alguno de los días y horarios que trabaja el médico seleccionado.'),
});

type BookAppointmentParamsType = z.infer<typeof BookAppointmentParams>;

/**
 * Herramienta para registrar/agendar una cita.
 */
export const bookAppointmentTool = llm.tool({
  description: 'Reserva una cita médica en el sistema para un paciente específico con los datos requeridos (clínica, especialidad, médico, fecha/hora).',
  parameters: BookAppointmentParams,
  execute: async (params: BookAppointmentParamsType): Promise<string> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/patients/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const resData = await response.json();
      if (resData.status === 'success') {
        return `Cita reservada con éxito en el sistema. ID de la cita creada: ${resData.data.id}. Confirma al paciente todos los datos verbalmente y felicítalo.`;
      }
      return `No se pudo reservar la cita médica. Error devuelto: ${resData.message || 'Datos de reserva incorrectos.'}`;
    } catch (e: any) {
      return `Error de red al conectar con el portal de citas para reservar: ${e.message || e}`;
    }
  }
});

/**
 * Parámetros para obtener citas por correo electrónico.
 */
const GetPatientAppointmentsParams = z.object({
  patientEmail: z.string().describe('Correo electrónico del paciente.'),
});

type GetPatientAppointmentsParamsType = z.infer<typeof GetPatientAppointmentsParams>;

/**
 * Herramienta para consultar citas de un paciente.
 */
export const getPatientAppointmentsTool = llm.tool({
  description: 'Consulta las citas médicas agendadas para un paciente proporcionando su dirección de correo electrónico.',
  parameters: GetPatientAppointmentsParams,
  execute: async ({ patientEmail }: GetPatientAppointmentsParamsType): Promise<string> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/patients/appointments?email=${encodeURIComponent(patientEmail)}`);
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const resData = await response.json();
      if (resData.status === 'success') {
        const appointments = resData.data;
        if (appointments.length === 0) {
          return `No se encontraron citas médicas registradas en el sistema para el correo electrónico: ${patientEmail}.`;
        }
        return `Citas encontradas para ${patientEmail}:\n${JSON.stringify(appointments, null, 2)}`;
      }
      return `Error al buscar citas: ${resData.message || 'Error desconocido.'}`;
    } catch (e: any) {
      return `Error de red al conectar para consultar citas: ${e.message || e}`;
    }
  }
});

/**
 * Parámetros para cancelar una cita.
 */
const CancelAppointmentParams = z.object({
  appointmentId: z.string().describe('El identificador único (ID) de la cita que se desea cancelar (ej. "appt-123xyz").'),
});

type CancelAppointmentParamsType = z.infer<typeof CancelAppointmentParams>;

/**
 * Herramienta para cancelar una cita en base a su ID.
 */
export const cancelAppointmentTool = llm.tool({
  description: 'Cancela una cita médica registrada en el sistema a partir de su ID.',
  parameters: CancelAppointmentParams,
  execute: async ({ appointmentId }: CancelAppointmentParamsType): Promise<string> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/patients/appointments?id=${encodeURIComponent(appointmentId)}`, {
        method: 'DELETE',
      });
      const resData = await response.json();
      if (resData.status === 'success') {
        return `Cita con ID ${appointmentId} cancelada con éxito del sistema. Por favor, confírmalo verbalmente al paciente de forma cordial.`;
      }
      return `No se pudo cancelar la cita. Motivo: ${resData.message || 'ID no encontrado.'}`;
    } catch (e: any) {
      return `Error de red al conectar para cancelar la cita: ${e.message || e}`;
    }
  }
});


