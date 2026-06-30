export type Clinic = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
};

export type ClinicOption = {
  id: string;
  name: string;
};

export type Doctor = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  clinicId: string;
  isActive: boolean;
  profilePhotoUrl?: string | null;
};

export type Patient = {
  id: string;
  clinicId: string;
  tcKimlikNo: string;
  fullName: string;
  birthDate: string;
  gender: string;
  phone: string;
  notes: string;
  isArchived: boolean;
  patientCode?: string;
};

export type AppointmentStatus = "scheduled" | "completed" | "cancelled";

export type Appointment = {
  id: string;
  clinicId: string;
  patientId: string;
  doctorId: string;
  title: string;
  note: string;
  appointmentAt: unknown;
  status: AppointmentStatus;
  linkedTestId?: string;
};

export type TestRecord = {
  id: string;
  patientId: string;
  doctorId: string;
  clinicId: string;
  sourceType: string;
  note: string;
  graphs: unknown[];
  metrics: Record<string, number>;
  flags: Record<string, boolean>;
  createdAt: unknown;
};
