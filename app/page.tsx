'use client';

import { useState, useEffect } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  BarVisualizer,
  useVoiceAssistant,
} from '@livekit/components-react';
import '@livekit/components-styles';

interface Clinic {
  id: string;
  name: string;
  address: string;
}

interface Specialty {
  id: string;
  name: string;
  description: string;
}

interface Doctor {
  id: string;
  name: string;
  specialtyId: string;
  clinicId: string;
  schedules: string[];
}

interface Appointment {
  id: string;
  patientName: string;
  patientEmail: string;
  clinicId: string;
  specialtyId: string;
  doctorId: string;
  dateTime: string;
  status: 'scheduled' | 'confirmed' | 'cancelled';
}

// Genera un tono analógico de llamada telefónica programáticamente (Web Audio API)
function startPhoneRing() {
  if (typeof window === 'undefined') return () => {};
  
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return () => {};
  
  const ctx = new AudioContextClass();
  
  const playRing = () => {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Frecuencias estándar de tono de llamada
    osc1.frequency.value = 440;
    osc2.frequency.value = 480;
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.06, ctx.currentTime + 1.8);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.0);
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc1.start();
    osc2.start();
    
    osc1.stop(ctx.currentTime + 2);
    osc2.stop(ctx.currentTime + 2);
  };
  
  playRing();
  const interval = setInterval(playRing, 5000);
  
  return () => {
    clearInterval(interval);
    ctx.close().catch(() => {});
  };
}

// Interfaz premium del asistente de voz
function VoiceAssistantUi({ onDisconnect, onCallConnected }: { onDisconnect: () => void; onCallConnected: () => void }) {
  const { state, audioTrack, agentTranscriptions } = useVoiceAssistant();
  const latestTranscription = agentTranscriptions[agentTranscriptions.length - 1]?.text;

  useEffect(() => {
    if (state !== 'connecting' && state !== 'disconnected') {
      onCallConnected();
    }
  }, [state, onCallConnected]);

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6 text-center animate-fadeIn bg-zinc-900/40 border border-zinc-800/80 rounded-2xl">
      {/* Premium Visual Orb */}
      <div className="relative flex items-center justify-center w-32 h-32">
        {/* Glow Layer */}
        <div className={`absolute inset-0 rounded-full blur-2xl transition-all duration-700 ${
          state === 'speaking' ? 'bg-blue-500/35 scale-110 animate-pulse' :
          state === 'listening' ? 'bg-emerald-500/35 scale-105 animate-pulse' :
          state === 'thinking' ? 'bg-purple-500/35 animate-pulse' : 'bg-zinc-700/10'
        }`} />
        
        {/* Orb Core */}
        <div className={`w-24 h-24 rounded-full flex items-center justify-center border transition-all duration-500 ${
          state === 'speaking' ? 'bg-gradient-to-tr from-blue-600 to-purple-600 border-blue-400/55 shadow-lg shadow-blue-500/30 scale-105' :
          state === 'listening' ? 'bg-gradient-to-tr from-emerald-600 to-teal-600 border-emerald-400/55 shadow-lg shadow-emerald-500/30 scale-105 animate-pulse' :
          state === 'thinking' ? 'bg-gradient-to-tr from-purple-600 to-pink-600 border-purple-400/55 shadow-lg shadow-purple-500/30' :
          'bg-zinc-900 border-zinc-800 text-zinc-400 scale-95'
        }`}>
          <span className="text-3xl">
            {state === 'speaking' ? '🗣️' :
             state === 'listening' ? '🎙️' :
             state === 'thinking' ? '💭' : '💤'}
          </span>
        </div>
      </div>

      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-white">
          {state === 'speaking' ? 'Gonzalo está Hablando' :
           state === 'listening' ? 'Escuchándote...' :
           state === 'thinking' ? 'Gonzalo está Pensando...' :
           state === 'connecting' ? 'Estableciendo Conexión...' : 'Asistente de Voz Activo'}
        </p>
        <p className="text-xs text-zinc-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
          {state === 'listening' ? 'Indica tu nombre, correo, especialidad, centro de preferencia y la fecha deseada.' :
           state === 'speaking' ? 'Gonzalo te está respondiendo por audio.' :
           state === 'thinking' ? 'Procesando tu solicitud...' :
           'Conectado al servidor de citas médicas.'}
        </p>
      </div>

      {/* Visualizer using the agent's audio track */}
      {audioTrack && (
        <div className="w-full max-w-[240px] h-10 flex items-center justify-center">
          <BarVisualizer trackRef={audioTrack} className="w-full h-full text-blue-500" />
        </div>
      )}

      {/* Realtime Transcripts Bubble */}
      {latestTranscription && (
        <div className="w-full max-w-md max-h-[80px] overflow-y-auto px-4 py-3 bg-zinc-950/80 border border-zinc-800/80 rounded-xl text-xs text-zinc-300 italic leading-relaxed">
          "{latestTranscription}"
        </div>
      )}

      <button
        onClick={onDisconnect}
        className="px-6 py-2.5 bg-red-950/50 hover:bg-red-900/60 border border-red-800/80 text-xs font-bold rounded-xl transition text-red-400 cursor-pointer shadow-lg shadow-red-950/20"
      >
        ❌ Finalizar Consulta de Voz
      </button>
    </div>
  );
}

interface DoctorSlot {
  dateTime: Date;
  isBusy: boolean;
  appointment?: Appointment;
}

function generateSlotsForDoctor(doctor: Doctor, appointments: Appointment[]): DoctorSlot[] {
  const slots: DoctorSlot[] = [];
  const daysOfWeekSpanish = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  
  // Generar slots para los próximos 7 días a partir de hoy
  for (let i = 0; i < 7; i++) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + i);
    
    const dayName = daysOfWeekSpanish[targetDate.getDay()];
    
    // Buscar horarios que correspondan a este día de la semana
    const matchingSchedules = doctor.schedules.filter(sch => 
      sch.toLowerCase().startsWith(dayName.toLowerCase())
    );
    
    for (const schedule of matchingSchedules) {
      // Parsear rango horario, ej: "Lunes 09:00 - 14:00"
      const match = schedule.match(/(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/);
      if (!match) continue;
      
      const startHour = parseInt(match[1]);
      const startMin = parseInt(match[2]);
      const endHour = parseInt(match[3]);
      const endMin = parseInt(match[4]);
      
      // Generar huecos de 1 hora
      let currentHour = startHour;
      while (currentHour < endHour) {
        const slotDate = new Date(targetDate);
        slotDate.setHours(currentHour, startMin, 0, 0);
        
        // Comprobar si hay alguna cita coincidente
        const matchingAppt = appointments.find(appt => {
          const apptDate = new Date(appt.dateTime);
          return (
            apptDate.getDate() === slotDate.getDate() &&
            apptDate.getMonth() === slotDate.getMonth() &&
            apptDate.getFullYear() === slotDate.getFullYear() &&
            apptDate.getHours() === slotDate.getHours() &&
            apptDate.getMinutes() === slotDate.getMinutes()
          );
        });
        
        slots.push({
          dateTime: slotDate,
          isBusy: !!matchingAppt,
          appointment: matchingAppt
        });
        
        currentHour += 1;
      }
    }
  }
  
  return slots.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
}

export default function Home() {
  // Navigation & panels
  const [activePanel, setActivePanel] = useState<'patient' | 'doctor' | 'admin'>('patient');
  
  // Data State
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Patient Booking Form State
  const [selectedClinic, setSelectedClinic] = useState<string>('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [appointmentDateTime, setAppointmentDateTime] = useState('');
  
  // Patient Search State
  const [searchEmail, setSearchEmail] = useState('');
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Cancellation state
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);

  // Admin Forms State
  const [newClinicName, setNewClinicName] = useState('');
  const [newClinicAddress, setNewClinicAddress] = useState('');
  const [newSpecName, setNewSpecName] = useState('');
  const [newSpecDesc, setNewSpecDesc] = useState('');
  const [newDocName, setNewDocName] = useState('');
  const [newDocClinic, setNewDocClinic] = useState('');
  const [newDocSpec, setNewDocSpec] = useState('');
  const [newDocSchedule1, setNewDocSchedule1] = useState('');
  const [newDocSchedule2, setNewDocSchedule2] = useState('');

  // Voice Assistant States
  const [voiceConnected, setVoiceConnected] = useState(false);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitServerUrl, setLivekitServerUrl] = useState<string | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [isConnectingCall, setIsConnectingCall] = useState(false);

  // Reproducir sonido de teléfono mientras se conecta
  useEffect(() => {
    if (!isConnectingCall) return;
    const stopRing = startPhoneRing();
    return () => {
      stopRing();
    };
  }, [isConnectingCall]);

  // Doctor Panel State
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [doctorAppointments, setDoctorAppointments] = useState<Appointment[]>([]);
  const [loadingDocAppts, setLoadingDocAppts] = useState(false);

  // Fetch appointments for selected doctor
  useEffect(() => {
    if (!selectedDoctorId) {
      setDoctorAppointments([]);
      return;
    }
    const fetchDocAppointments = async () => {
      setLoadingDocAppts(true);
      try {
        const res = await fetch(`/api/patients/appointments?doctorId=${selectedDoctorId}`);
        const data = await res.json();
        if (data.status === 'success') {
          setDoctorAppointments(data.data);
        } else {
          showError(data.message || 'Error al recuperar citas del médico.');
        }
      } catch (e) {
        console.error(e);
        showError('Error al recuperar las citas del médico.');
      } finally {
        setLoadingDocAppts(false);
      }
    };
    fetchDocAppointments();
  }, [selectedDoctorId]);

  const handleStartVoiceChat = async () => {
    setVoiceLoading(true);
    setIsConnectingCall(true);
    try {
      const roomName = `room-${Math.random().toString(36).substring(2, 9)}`;
      const response = await fetch(`/api/livekit?room=${roomName}&username=paciente`);
      const data = await response.json();
      if (data.token && data.serverUrl) {
        setLivekitToken(data.token);
        setLivekitServerUrl(data.serverUrl);
        setVoiceConnected(true);
        showSuccess('Conectando con Gonzalo...');
      } else {
        setIsConnectingCall(false);
        showError('No se pudo obtener el token para el chat de voz.');
      }
    } catch (e) {
      console.error(e);
      setIsConnectingCall(false);
      showError('Error al conectar el chat de voz.');
    } finally {
      setVoiceLoading(false);
    }
  };

  const handleStopVoiceChat = () => {
    setVoiceConnected(false);
    setLivekitToken(null);
    setLivekitServerUrl(null);
    setIsConnectingCall(false);
    showSuccess('Asistente de voz desconectado.');
  };

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resClinics, resSpecs, resDocs] = await Promise.all([
        fetch('/api/admin/clinics'),
        fetch('/api/admin/specialties'),
        fetch('/api/admin/doctors')
      ]);

      const dataClinics = await resClinics.json();
      const dataSpecs = await resSpecs.json();
      const dataDocs = await resDocs.json();

      if (dataClinics.status === 'success') setClinics(dataClinics.data);
      if (dataSpecs.status === 'success') setSpecialties(dataSpecs.data);
      if (dataDocs.status === 'success') setDoctors(dataDocs.data);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setErrorMsg('No se pudieron recuperar los datos del portal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Flash messages helper
  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 5000);
  };
  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  // Reset database to seed data
  const handleResetData = async () => {
    try {
      const res = await fetch('/api/admin/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' })
      });
      const data = await res.json();
      if (data.status === 'success') {
        showSuccess(data.message);
        fetchData();
      } else {
        showError(data.message);
      }
    } catch (e) {
      showError('Error al restablecer la base de datos.');
    }
  };

  // Create clinic
  const handleCreateClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClinicName || !newClinicAddress) return;

    try {
      const res = await fetch('/api/admin/clinics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClinicName, address: newClinicAddress })
      });
      const data = await res.json();
      if (data.status === 'success') {
        showSuccess(`Clínica "${newClinicName}" creada correctamente.`);
        setNewClinicName('');
        setNewClinicAddress('');
        fetchData();
      } else {
        showError(data.message);
      }
    } catch (e) {
      showError('Error al crear la clínica.');
    }
  };

  // Create Specialty
  const handleCreateSpecialty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpecName || !newSpecDesc) return;

    try {
      const res = await fetch('/api/admin/specialties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSpecName, description: newSpecDesc })
      });
      const data = await res.json();
      if (data.status === 'success') {
        showSuccess(`Especialidad "${newSpecName}" registrada.`);
        setNewSpecName('');
        setNewSpecDesc('');
        fetchData();
      } else {
        showError(data.message);
      }
    } catch (e) {
      showError('Error al registrar la especialidad.');
    }
  };

  // Create Doctor
  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName || !newDocClinic || !newDocSpec) {
      showError('Por favor complete todos los datos del médico.');
      return;
    }

    const schedules = [];
    if (newDocSchedule1) schedules.push(newDocSchedule1);
    if (newDocSchedule2) schedules.push(newDocSchedule2);

    try {
      const res = await fetch('/api/admin/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDocName,
          clinicId: newDocClinic,
          specialtyId: newDocSpec,
          schedules
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        showSuccess(`Médico "${newDocName}" registrado correctamente.`);
        setNewDocName('');
        setNewDocClinic('');
        setNewDocSpec('');
        setNewDocSchedule1('');
        setNewDocSchedule2('');
        fetchData();
      } else {
        showError(data.message);
      }
    } catch (e) {
      showError('Error al registrar el médico.');
    }
  };

  // Submit appointment booking
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClinic || !selectedSpecialty || !selectedDoctor || !patientName || !patientEmail || !appointmentDateTime) {
      showError('Por favor, rellene todos los campos de reserva.');
      return;
    }

    try {
      const res = await fetch('/api/patients/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName,
          patientEmail,
          clinicId: selectedClinic,
          specialtyId: selectedSpecialty,
          doctorId: selectedDoctor,
          dateTime: new Date(appointmentDateTime).toISOString()
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        showSuccess(`Cita reservada correctamente con ID: ${data.data.id}`);
        setPatientName('');
        setPatientEmail('');
        setAppointmentDateTime('');
        setSelectedDoctor('');
      } else {
        showError(data.message);
      }
    } catch (e) {
      showError('Error de red al reservar cita.');
    }
  };

  // Search appointments by patient email
  const handleSearchAppointments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail) return;

    setSearchLoading(true);
    try {
      const res = await fetch(`/api/patients/appointments?email=${encodeURIComponent(searchEmail)}`);
      const data = await res.json();
      if (data.status === 'success') {
        setPatientAppointments(data.data);
        if (data.data.length === 0) {
          showError('No se encontraron citas para ese correo.');
        }
      } else {
        showError(data.message);
      }
    } catch (e) {
      showError('Error al buscar citas.');
    } finally {
      setSearchLoading(false);
    }
  };

  // Filters for dropdown cascading selection
  const filteredDoctors = doctors.filter(
    (doc) =>
      (!selectedClinic || doc.clinicId === selectedClinic) &&
      (!selectedSpecialty || doc.specialtyId === selectedSpecialty)
  );

  return (
    <div className="min-h-screen flex flex-col font-sans text-zinc-100 bg-zinc-950 pb-12">
      {/* Dynamic Header */}
      <header className="glass-panel sticky top-0 z-40 border-b border-zinc-800/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            🏥
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">Nazarena Clinic</h1>
            <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Portal Clínico Integrado</p>
          </div>
        </div>

        {/* Global Success / Error Toast Alerts */}
        <div className="flex items-center gap-4">
          {successMsg && (
            <div className="px-4 py-2 bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 text-xs font-semibold rounded-lg animate-pulse">
              ✓ {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="px-4 py-2 bg-red-950/60 border border-red-800/80 text-red-400 text-xs font-semibold rounded-lg animate-pulse">
              ⚠ {errorMsg}
            </div>
          )}
        </div>

        {/* Panel Switcher and Seed Restorer */}
        <div className="flex items-center gap-3">
          <button 
            onClick={handleResetData}
            className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold rounded-lg transition"
            title="Cargar o reestablecer datos semilla desde clinics-seed.json"
          >
            🔄 Recargar JSON
          </button>
          
          <div className="bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 flex">
            <button
              onClick={() => setActivePanel('patient')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                activePanel === 'patient'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Pacientes
            </button>
            <button
              onClick={() => setActivePanel('doctor')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                activePanel === 'doctor'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Médicos
            </button>
            <button
              onClick={() => setActivePanel('admin')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                activePanel === 'admin'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Administración
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl w-full mx-auto px-6 mt-8 flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <span className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></span>
            <p className="text-sm font-medium text-zinc-400">Cargando catálogo clínico...</p>
          </div>
        ) : activePanel === 'patient' ? (
          /* ==================== PATIENT VIEW ==================== */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Catalyst Booking Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Panel de Asistente de Voz Inteligente */}
              <div className="glass-panel p-6 rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-950 via-zinc-900/40 to-blue-950/15 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-md font-bold text-white flex items-center gap-2">
                      <span className="text-blue-500">🎙️</span> Asistente Virtual Nazareno
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-1 max-w-md leading-relaxed">
                      ¿Prefieres hablar? Haz clic en iniciar y dile a Gonzalo qué cita necesitas. Te guiará paso a paso para agendarla de forma conversacional.
                    </p>
                  </div>
                  
                  {!voiceConnected && (
                    <button
                      onClick={handleStartVoiceChat}
                      disabled={voiceLoading}
                      className="px-5 py-2.5 bg-gradient-to-tr from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-xs font-bold rounded-xl transition text-white cursor-pointer shadow-lg shadow-blue-500/10 flex items-center gap-2 self-start md:self-auto shrink-0"
                    >
                      {voiceLoading ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                          Estableciendo llamada...
                        </>
                      ) : (
                        <>
                          <span>📞</span>
                          Reservar por Voz
                        </>
                      )}
                    </button>
                  )}
                </div>

                {voiceConnected && livekitToken && livekitServerUrl && (
                  <div className="mt-6 border-t border-zinc-800/80 pt-6">
                    <LiveKitRoom
                      token={livekitToken}
                      serverUrl={livekitServerUrl}
                      connect={true}
                      audio={true}
                      video={false}
                      onDisconnected={handleStopVoiceChat}
                    >
                      <RoomAudioRenderer />
                      <VoiceAssistantUi
                        onDisconnect={handleStopVoiceChat}
                        onCallConnected={() => setIsConnectingCall(false)}
                      />
                    </LiveKitRoom>
                  </div>
                )}
              </div>

              <div className="glass-panel p-8 rounded-2xl border border-zinc-800/80">
                <h2 className="text-xl font-bold text-white mb-2">Solicitar Cita Médica</h2>
                <p className="text-xs text-zinc-400 mb-6">Seleccione su clínica de preferencia, especialidad y profesional disponible.</p>

                <form onSubmit={handleBookAppointment} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Clinic selector */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">1. Centro Clínico</label>
                      <select
                        value={selectedClinic}
                        onChange={(e) => {
                          setSelectedClinic(e.target.value);
                          setSelectedDoctor('');
                        }}
                        required
                        className="glass-input px-3.5 py-2.5 rounded-xl text-sm focus:outline-none text-white w-full"
                      >
                        <option value="">Seleccione Centro...</option>
                        {clinics.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Specialty selector */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">2. Especialidad</label>
                      <select
                        value={selectedSpecialty}
                        onChange={(e) => {
                          setSelectedSpecialty(e.target.value);
                          setSelectedDoctor('');
                        }}
                        required
                        className="glass-input px-3.5 py-2.5 rounded-xl text-sm focus:outline-none text-white w-full"
                      >
                        <option value="">Seleccione Especialidad...</option>
                        {specialties.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Doctor selector */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">3. Médico Especialista</label>
                      <select
                        value={selectedDoctor}
                        onChange={(e) => setSelectedDoctor(e.target.value)}
                        required
                        className="glass-input px-3.5 py-2.5 rounded-xl text-sm focus:outline-none text-white w-full animate-fadeIn"
                      >
                        <option value="">Seleccione Médico...</option>
                        {filteredDoctors.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Show doctor details and schedules if selected */}
                  {selectedDoctor && (
                    <div className="p-4 bg-blue-950/20 border border-blue-900/40 rounded-xl text-xs space-y-1">
                      <p className="font-semibold text-blue-300">Horarios disponibles para el especialista:</p>
                      <ul className="list-disc pl-4 text-zinc-300">
                        {doctors.find(d => d.id === selectedDoctor)?.schedules.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <hr className="border-zinc-800/80 my-2" />

                  {/* Patient Info Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Nombre Completo del Paciente</label>
                      <input
                        type="text"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        required
                        className="glass-input px-3.5 py-2.5 rounded-xl text-sm focus:outline-none text-white"
                        placeholder="Ej. Manuel Benítez"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Correo Electrónico</label>
                      <input
                        type="email"
                        value={patientEmail}
                        onChange={(e) => setPatientEmail(e.target.value)}
                        required
                        className="glass-input px-3.5 py-2.5 rounded-xl text-sm focus:outline-none text-white"
                        placeholder="Ej. manuel@correo.com"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Fecha y Hora Solicitada</label>
                    <input
                      type="datetime-local"
                      value={appointmentDateTime}
                      onChange={(e) => setAppointmentDateTime(e.target.value)}
                      required
                      className="glass-input px-3.5 py-2.5 rounded-xl text-sm focus:outline-none text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 font-semibold text-sm rounded-xl transition shadow-lg shadow-blue-500/20 text-white cursor-pointer"
                  >
                    Confirmar Reserva de Cita
                  </button>
                </form>
              </div>
            </div>

            {/* Sidebar with active appointments search */}
            <div className="space-y-6">
              <div className="glass-panel p-6 rounded-2xl border border-zinc-800/80">
                <h3 className="text-md font-bold text-white mb-1">Mis Citas Agendadas</h3>
                <p className="text-[11px] text-zinc-400 mb-4">Busque su historial de consultas registradas por email.</p>

                <form onSubmit={handleSearchAppointments} className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="glass-input flex-1 px-3 py-2 rounded-xl text-xs focus:outline-none text-white"
                  />
                  <button
                    type="submit"
                    disabled={searchLoading}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    {searchLoading ? '...' : 'Buscar'}
                  </button>
                </form>

                {cancelError && (
                  <div className="mt-3 p-3 bg-red-900/30 border border-red-700/50 rounded-xl text-xs text-red-300 flex items-center gap-2">
                    <span>⚠️</span><span>{cancelError}</span>
                  </div>
                )}
                {cancelSuccess && (
                  <div className="mt-3 p-3 bg-emerald-900/30 border border-emerald-700/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                    <span>✅</span><span>{cancelSuccess}</span>
                  </div>
                )}

                {patientAppointments.length > 0 && (
                  <div className="mt-6 space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                    {patientAppointments.map((appt) => {
                      const clinic = clinics.find(c => c.id === appt.clinicId)?.name || 'Centro Clínico';
                      const doctor = doctors.find(d => d.id === appt.doctorId)?.name || 'Especialista';
                      const specialty = specialties.find(s => s.id === appt.specialtyId)?.name || 'Consulta';
                      const readableDate = new Date(appt.dateTime).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                      const isCancelled = appt.status === 'cancelled';
                      const isCancelling = cancellingId === appt.id;
                      const appointmentTime = new Date(appt.dateTime).getTime();
                      const canCancel = !isCancelled && appointmentTime > Date.now() + 60 * 60 * 1000;

                      return (
                        <div
                          key={appt.id}
                          className={`p-3 border rounded-xl text-xs flex flex-col gap-2 transition-opacity ${
                            isCancelled
                              ? 'bg-zinc-900/30 border-zinc-800/30 opacity-60'
                              : 'bg-zinc-900/60 border-zinc-800/50'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="space-y-1 flex-1 min-w-0">
                              <p className={`font-semibold ${isCancelled ? 'text-zinc-400 line-through' : 'text-white'}`}>{doctor}</p>
                              <p className="text-[10px] text-zinc-400">{specialty} • {clinic}</p>
                              <span className="inline-block text-[10px] text-blue-400 font-medium">📅 {readableDate}</span>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                              {isCancelled ? (
                                <span className="text-[9px] bg-red-900/40 text-red-400 border border-red-800/50 px-2 py-0.5 rounded-full font-semibold">
                                  Cancelada
                                </span>
                              ) : (
                                <span className="text-[9px] bg-emerald-900/30 text-emerald-400 border border-emerald-800/50 px-2 py-0.5 rounded-full font-semibold">
                                  Activa
                                </span>
                              )}
                              <span className="text-[9px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded font-mono">
                                {appt.id}
                              </span>
                            </div>
                          </div>

                          {canCancel && (
                            <button
                              id={`cancel-appt-${appt.id}`}
                              onClick={async () => {
                                setCancellingId(appt.id);
                                setCancelError(null);
                                setCancelSuccess(null);
                                try {
                                  const res = await fetch(`/api/patients/appointments?id=${appt.id}`, { method: 'DELETE' });
                                  const json = await res.json();
                                  if (!res.ok) {
                                    setCancelError(json.message || 'Error al cancelar la cita.');
                                  } else {
                                    setCancelSuccess('Cita cancelada correctamente. Recibirás una confirmación por email.');
                                    setPatientAppointments(prev =>
                                      prev.map(a => a.id === appt.id ? { ...a, status: 'cancelled' } : a)
                                    );
                                  }
                                } catch {
                                  setCancelError('Error de red al intentar cancelar la cita.');
                                } finally {
                                  setCancellingId(null);
                                }
                              }}
                              disabled={isCancelling}
                              className="w-full py-1.5 bg-red-900/30 hover:bg-red-900/60 border border-red-800/50 hover:border-red-700 text-red-400 hover:text-red-300 text-[10px] font-semibold rounded-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                            >
                              {isCancelling ? (
                                <><span className="w-3 h-3 border border-red-400/30 border-t-red-400 rounded-full animate-spin inline-block"></span> Cancelando...</>
                              ) : (
                                <>✕ Cancelar cita</>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Service list sidebar */}
              <div className="glass-panel p-6 rounded-2xl border border-zinc-800/80">
                <h3 className="text-md font-bold text-white mb-3">Cartera de Especialidades</h3>
                <div className="space-y-3">
                  {specialties.map(spec => (
                    <div key={spec.id} className="border-b border-zinc-900 pb-2.5 last:border-0 last:pb-0">
                      <h4 className="text-xs font-semibold text-white">{spec.name}</h4>
                      <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">{spec.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : activePanel === 'doctor' ? (
          /* ==================== DOCTOR VIEW ==================== */
          <div className="space-y-6 animate-fadeIn">
            <div className="glass-panel p-8 rounded-2xl border border-zinc-800/80 max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-zinc-800/80">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">Panel del Profesional Médico</h2>
                  <p className="text-xs text-zinc-400">Consulte su agenda semanal de citas libres y consultas reservadas.</p>
                </div>
                
                {/* Doctor Selection */}
                <div className="flex flex-col gap-1.5 min-w-[250px]">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Seleccionar Médico</label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="glass-input px-3.5 py-2.5 rounded-xl text-sm focus:outline-none text-white w-full"
                  >
                    <option value="">Seleccione un Profesional...</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedDoctorId ? (
                (() => {
                  const currentDoc = doctors.find(d => d.id === selectedDoctorId);
                  if (!currentDoc) return null;
                  
                  const clinicName = clinics.find(c => c.id === currentDoc.clinicId)?.name || 'Centro Clínico';
                  const specialtyName = specialties.find(s => s.id === currentDoc.specialtyId)?.name || 'Especialidad';
                  
                  // Generar los slots
                  const slots = generateSlotsForDoctor(currentDoc, doctorAppointments);
                  
                  return (
                    <div className="mt-8 space-y-6">
                      {/* Doctor Profile Info */}
                      <div className="p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl flex items-center justify-between text-xs">
                        <div className="space-y-1">
                          <p className="font-bold text-white text-sm">{currentDoc.name}</p>
                          <p className="text-zinc-400">{specialtyName} • {clinicName}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-[10px] text-zinc-400 uppercase font-bold">Horarios Semanales</p>
                          <p className="text-emerald-400 font-medium">{currentDoc.schedules.join(' | ')}</p>
                        </div>
                      </div>

                      {loadingDocAppts ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                          <span className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></span>
                          <p className="text-xs text-zinc-400">Actualizando agenda...</p>
                        </div>
                      ) : slots.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl text-xs text-zinc-400">
                          No hay horarios de consulta programados para este médico.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <h3 className="text-sm font-bold text-white">Agenda para los próximos 7 días</h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {slots.map((slot, index) => {
                              const readableDate = slot.dateTime.toLocaleDateString('es-ES', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'short'
                              });
                              const readableTime = slot.dateTime.toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                              });
                              
                              return (
                                <div
                                  key={index}
                                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                                    slot.isBusy
                                      ? 'bg-red-950/10 border-red-900/30 shadow-sm shadow-red-950/5'
                                      : 'bg-emerald-950/10 border-emerald-900/30 shadow-sm shadow-emerald-950/5 hover:border-emerald-500/35 hover:bg-emerald-950/20'
                                  }`}
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="text-xs font-semibold text-zinc-200 capitalize">{readableDate}</p>
                                      <p className="text-[10px] text-zinc-400 mt-0.5">Hora: {readableTime}</p>
                                    </div>
                                    <span
                                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                        slot.isBusy
                                          ? 'bg-red-950/60 border border-red-800/80 text-red-400'
                                          : 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-400'
                                      }`}
                                    >
                                      {slot.isBusy ? 'Ocupado' : 'Libre'}
                                    </span>
                                  </div>
                                  
                                  {slot.isBusy && slot.appointment && (
                                    <div className="pt-2 border-t border-red-950/40 text-[10px] space-y-1">
                                      <p className="font-semibold text-zinc-200">Paciente: {slot.appointment.patientName}</p>
                                      <p className="text-zinc-400">Email: {slot.appointment.patientEmail}</p>
                                      <p className="text-[9px] font-mono text-zinc-500">Ref: {slot.appointment.id}</p>
                                    </div>
                                  )}
                                  
                                  {!slot.isBusy && (
                                    <div className="text-[10px] text-emerald-400/80 flex items-center gap-1">
                                      <span>🟢</span> Disponible para consulta
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-20 text-zinc-400 text-sm flex flex-col items-center gap-3">
                  <span className="text-3xl">📅</span>
                  <p>Por favor, seleccione un profesional médico en el selector superior para consultar su agenda.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ==================== ADMIN VIEW ==================== */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left panels: Create Clinic and Specialty */}
            <div className="space-y-6">
              {/* Create Clinic Form */}
              <div className="glass-panel p-6 rounded-2xl border border-zinc-800/80">
                <h3 className="text-md font-bold text-white mb-1">Nueva Sede / Clínica</h3>
                <p className="text-[11px] text-zinc-400 mb-4">Añada un nuevo centro al catálogo clínico.</p>

                <form onSubmit={handleCreateClinic} className="space-y-3.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Nombre</label>
                    <input
                      type="text"
                      required
                      value={newClinicName}
                      onChange={(e) => setNewClinicName(e.target.value)}
                      placeholder="Ej. Clínica Nazarena Centro"
                      className="glass-input px-3 py-2.5 rounded-xl text-xs focus:outline-none text-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Dirección</label>
                    <input
                      type="text"
                      required
                      value={newClinicAddress}
                      onChange={(e) => setNewClinicAddress(e.target.value)}
                      placeholder="Calle Real 24, Sevilla"
                      className="glass-input px-3 py-2.5 rounded-xl text-xs focus:outline-none text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 font-semibold text-xs rounded-xl transition text-white cursor-pointer"
                  >
                    Crear Clínica
                  </button>
                </form>
              </div>

              {/* Create Specialty Form */}
              <div className="glass-panel p-6 rounded-2xl border border-zinc-800/80">
                <h3 className="text-md font-bold text-white mb-1">Nueva Especialidad</h3>
                <p className="text-[11px] text-zinc-400 mb-4">Expanda la cartera de servicios ofrecidos.</p>

                <form onSubmit={handleCreateSpecialty} className="space-y-3.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Nombre Especialidad</label>
                    <input
                      type="text"
                      required
                      value={newSpecName}
                      onChange={(e) => setNewSpecName(e.target.value)}
                      placeholder="Ej. Oftalmología"
                      className="glass-input px-3 py-2.5 rounded-xl text-xs focus:outline-none text-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Descripción</label>
                    <textarea
                      required
                      value={newSpecDesc}
                      onChange={(e) => setNewSpecDesc(e.target.value)}
                      placeholder="Servicio de diagnóstico ocular..."
                      rows={2}
                      className="glass-input px-3 py-2 rounded-xl text-xs focus:outline-none text-white resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 font-semibold text-xs rounded-xl transition text-white cursor-pointer"
                  >
                    Registrar Especialidad
                  </button>
                </form>
              </div>
            </div>

            {/* Middle panel: Create Doctor & Schedule */}
            <div className="space-y-6">
              <div className="glass-panel p-6 rounded-2xl border border-zinc-800/80">
                <h3 className="text-md font-bold text-white mb-1">Añadir Médico Especialista</h3>
                <p className="text-[11px] text-zinc-400 mb-4">Asigne médicos a centros con sus correspondientes especialidades y horarios.</p>

                <form onSubmit={handleCreateDoctor} className="space-y-3.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Nombre del Médico</label>
                    <input
                      type="text"
                      required
                      value={newDocName}
                      onChange={(e) => setNewDocName(e.target.value)}
                      placeholder="Ej. Dra. Inés Guardiola"
                      className="glass-input px-3 py-2.5 rounded-xl text-xs focus:outline-none text-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Sede / Clínica Asignada</label>
                    <select
                      value={newDocClinic}
                      onChange={(e) => setNewDocClinic(e.target.value)}
                      required
                      className="glass-input px-3 py-2 rounded-xl text-xs focus:outline-none text-white w-full"
                    >
                      <option value="">Seleccione Centro...</option>
                      {clinics.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Especialidad Clínica</label>
                    <select
                      value={newDocSpec}
                      onChange={(e) => setNewDocSpec(e.target.value)}
                      required
                      className="glass-input px-3 py-2 rounded-xl text-xs focus:outline-none text-white w-full"
                    >
                      <option value="">Seleccione Especialidad...</option>
                      {specialties.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Horarios de Consulta</label>
                    <input
                      type="text"
                      required
                      value={newDocSchedule1}
                      onChange={(e) => setNewDocSchedule1(e.target.value)}
                      placeholder="Ej. Lunes 09:00 - 14:00"
                      className="glass-input px-3 py-2 rounded-xl text-xs focus:outline-none text-white"
                    />
                    <input
                      type="text"
                      value={newDocSchedule2}
                      onChange={(e) => setNewDocSchedule2(e.target.value)}
                      placeholder="Ej. Jueves 16:00 - 20:00 (Opcional)"
                      className="glass-input px-3 py-2 rounded-xl text-xs focus:outline-none text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 font-semibold text-xs rounded-xl transition text-white cursor-pointer"
                  >
                    Registrar Médico
                  </button>
                </form>
              </div>
            </div>

            {/* Right panel: Live clinics overview */}
            <div className="space-y-6">
              <div className="glass-panel p-6 rounded-2xl border border-zinc-800/80">
                <h3 className="text-md font-bold text-white mb-1">Catálogo Activo</h3>
                <p className="text-[11px] text-zinc-400 mb-4">Centros, médicos y especialidades registradas en el sistema.</p>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  <div>
                    <h4 className="text-xs font-bold text-purple-400 uppercase mb-2">Sedes ({clinics.length})</h4>
                    <div className="space-y-2">
                      {clinics.map(c => (
                        <div key={c.id} className="p-2.5 bg-zinc-900/40 border border-zinc-800/50 rounded-xl text-xs">
                          <p className="font-semibold text-zinc-200">{c.name}</p>
                          <p className="text-[10px] text-zinc-500">{c.address}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-purple-400 uppercase mb-2">Médicos ({doctors.length})</h4>
                    <div className="space-y-2">
                      {doctors.map(d => {
                        const clinicName = clinics.find(c => c.id === d.clinicId)?.name || 'Sin Sede';
                        const specName = specialties.find(s => s.id === d.specialtyId)?.name || 'General';
                        return (
                          <div key={d.id} className="p-2.5 bg-zinc-900/40 border border-zinc-800/50 rounded-xl text-xs">
                            <p className="font-semibold text-zinc-200">{d.name}</p>
                            <p className="text-[10px] text-purple-300">{specName} • {clinicName}</p>
                            <p className="text-[9px] text-zinc-500 mt-1">🕒 {d.schedules.join(' | ')}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}