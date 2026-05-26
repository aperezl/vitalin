import fs from 'fs';
import path from 'path';

export interface Clinic {
  id: string;
  name: string;
  address: string;
}

export interface Specialty {
  id: string;
  name: string;
  description: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialtyId: string;
  clinicId: string;
  schedules: string[]; // e.g. ["Lunes 09:00 - 14:00", "Miércoles 16:00 - 20:00"]
}

export interface Appointment {
  id: string;
  patientName: string;
  patientEmail: string;
  clinicId: string;
  specialtyId: string;
  doctorId: string;
  dateTime: string; // ISO 8601
  status: 'scheduled' | 'confirmed' | 'cancelled';
}

class MemoryDatabase {
  private clinics: Clinic[] = [];
  private specialties: Specialty[] = [];
  private doctors: Doctor[] = [];
  private appointments: Appointment[] = [];
  private initialized = false;

  constructor() {
    this.initialize();
  }

  public initialize(force = false) {
    if (this.initialized && !force) return;

    try {
      const seedPath = path.join(process.cwd(), 'data', 'clinics-seed.json');
      if (fs.existsSync(seedPath)) {
        const fileContent = fs.readFileSync(seedPath, 'utf8');
        const data = JSON.parse(fileContent);
        
        this.clinics = data.clinics || [];
        this.specialties = data.specialties || [];
        this.doctors = data.doctors || [];
        this.appointments = data.appointments || [];
        
        console.log(`[MemoryDB] Loaded ${this.clinics.length} clinics, ${this.specialties.length} specialties, ${this.doctors.length} doctors, ${this.appointments.length} appointments.`);
        this.initialized = true;
      } else {
        console.log('[MemoryDB] No seed file found at data/clinics-seed.json. Starting empty.');
      }
    } catch (error) {
      console.error('[MemoryDB] Error reading seed data:', error);
    }
  }

  // Clinic operations
  getClinics(): Clinic[] {
    return this.clinics;
  }

  addClinic(clinic: Omit<Clinic, 'id'>): Clinic {
    const newClinic = {
      ...clinic,
      id: 'clinic-' + Math.random().toString(36).substring(2, 9)
    };
    this.clinics.push(newClinic);
    return newClinic;
  }

  // Specialty operations
  getSpecialties(): Specialty[] {
    return this.specialties;
  }

  addSpecialty(specialty: Omit<Specialty, 'id'>): Specialty {
    const newSpecialty = {
      ...specialty,
      id: 'spec-' + Math.random().toString(36).substring(2, 9)
    };
    this.specialties.push(newSpecialty);
    return newSpecialty;
  }

  // Doctor operations
  getDoctors(): Doctor[] {
    return this.doctors;
  }

  addDoctor(doctor: Omit<Doctor, 'id'>): Doctor {
    const newDoctor = {
      ...doctor,
      id: 'doc-' + Math.random().toString(36).substring(2, 9)
    };
    this.doctors.push(newDoctor);
    return newDoctor;
  }

  // Appointment operations
  getAppointments(): Appointment[] {
    return this.appointments;
  }

  addAppointment(appt: Omit<Appointment, 'id' | 'status'>): Appointment {
    const newAppt = {
      ...appt,
      id: 'appt-' + Math.random().toString(36).substring(2, 9),
      status: 'scheduled' as const,
    };
    this.appointments.push(newAppt);
    return newAppt;
  }

  findAppointmentById(id: string): Appointment | null {
    return this.appointments.find(a => a.id === id) ?? null;
  }

  findAppointmentsByEmail(email: string): Appointment[] {
    const searchEmail = email.toLowerCase().trim();
    return this.appointments.filter(a => a.patientEmail.toLowerCase().trim() === searchEmail);
  }

  /**
   * Marca la cita como cancelada. Aplica la regla de negocio: sólo se puede
   * cancelar si faltan más de 60 minutos para la cita.
   * Lanza un error con `code: 'TOO_LATE'` si se intenta cancelar dentro de la
   * última hora, o `code: 'NOT_FOUND'` si la cita no existe.
   */
  cancelAppointment(id: string): Appointment {
    const appt = this.findAppointmentById(id);
    if (!appt) {
      const err = new Error(`No se encontró ninguna cita con id "${id}".`);
      (err as any).code = 'NOT_FOUND';
      throw err;
    }
    if (appt.status === 'cancelled') {
      const err = new Error(`La cita "${id}" ya está cancelada.`);
      (err as any).code = 'ALREADY_CANCELLED';
      throw err;
    }
    const appointmentTime = new Date(appt.dateTime).getTime();
    const oneHourFromNow = Date.now() + 60 * 60 * 1000;
    if (appointmentTime <= oneHourFromNow) {
      const err = new Error('No puedes cancelar una cita con menos de 1 hora de antelación.');
      (err as any).code = 'TOO_LATE';
      throw err;
    }
    appt.status = 'cancelled';
    return appt;
  }

  updateAppointmentStatus(id: string, status: Appointment['status']): Appointment | null {
    const appt = this.findAppointmentById(id);
    if (!appt) return null;
    appt.status = status;
    return appt;
  }

  deleteAppointment(id: string): boolean {
    const initialLength = this.appointments.length;
    this.appointments = this.appointments.filter(a => a.id !== id);
    return this.appointments.length < initialLength;
  }
}

// Global singleton instance for hot reloading in Next.js development
const globalForDb = global as unknown as { db: MemoryDatabase };

// Salvaguarda para recargar la instancia si se añaden métodos nuevos en caliente
if (globalForDb.db && typeof globalForDb.db.cancelAppointment !== 'function') {
  globalForDb.db = new MemoryDatabase();
}

export const db = globalForDb.db || new MemoryDatabase();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.db = db;
}
