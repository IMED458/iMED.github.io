// ============================================================
// iMED — ტიპების სრული განმარტება
// ============================================================

export type UserRole =
  | 'super_admin'
  | 'registrar'
  | 'doctor'
  | 'consultant'
  | 'nurse'
  | 'lab_technician'
  | 'radiologist'
  | 'department_head'
  | 'anesthesiologist'
  | 'statistician'
  | 'finance';

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'სუპერ-ადმინი',
  registrar: 'რეგისტრატორი / მიმღები',
  doctor: 'ექიმი',
  consultant: 'კონსულტანტი',
  nurse: 'ექთანი',
  lab_technician: 'ლაბორანტი',
  radiologist: 'რადიოლოგი',
  department_head: 'განყოფილების ხელმძღვანელი',
  anesthesiologist: 'ანესთეზიოლოგი',
  statistician: 'სტატისტიკოსი',
  finance: 'ფინანსი / სალარო',
};

export const SPECIALTIES = [
  'ზოგადი მედიცინა',
  'შინაგანი მედიცინა',
  'ქირურგია',
  'კარდიოლოგია',
  'ნევროლოგია',
  'ნეიროქირურგია',
  'ონკოლოგია',
  'პედიატრია',
  'გინეკოლოგია',
  'ორთოპედია',
  'ოფთალმოლოგია',
  'ოტორინოლარინგოლოგია',
  'ენდოკრინოლოგია',
  'გასტროენტეროლოგია',
  'ნეფროლოგია',
  'პულმოლოგია',
  'უროლოგია',
  'ანესთეზიოლოგია',
  'რეანიმატოლოგია',
  'ნეონატოლოგია',
  'ფსიქიატრია',
  'დერმატოლოგია',
  'ჰემატოლოგია',
  'ინფექციური დაავადებები',
  'ლაბორატორიული სამსახური',
  'რადიოლოგია',
  'ფიზიოთერაპია',
  'პათოლოგანატომია',
];

export const DEPARTMENTS = [
  'გადაუდებელი მედიცინა (ER)',
  'შინაგანი მედიცინა',
  'ქირურგია',
  'ინტენსიური თერაპია (ICU)',
  'კარდიოლოგია',
  'ნევროლოგია',
  'ნეიროქირურგია',
  'პედიატრია',
  'გინეკოლოგია / მეანობა',
  'ონკოლოგია',
  'ოფთალმოლოგია',
  'ოტორინოლარინგოლოგია',
  'ლაბორატორია',
  'რადიოლოგია',
  'ფიზიოთერაპია',
  'ამბულატორია',
];

export interface ImedUser {
  uid: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  specialty?: string;
  department?: string;
  position?: string;
  personalId?: string;
  licenseNumber?: string;
  signatureUrl?: string;
  stampUrl?: string;
  isActive: boolean;
  /** ერთჯერადი პაროლი — პირველ შესვლაზე იძულებითი შეცვლა */
  mustChangePassword?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type Sex = 'male' | 'female';

export interface Patient {
  id: string;
  cardNumber: string;
  historyNumber: string;
  lastName: string;
  firstName: string;
  birthDate: string;
  age?: number;
  sex: Sex;
  personalId: string;
  isForigner?: boolean;
  passportNumber?: string;
  registrationAddress: string;
  actualAddress: string;
  phone: string;
  phone2?: string;
  insuranceStatus: InsuranceStatus;
  insuranceNumber?: string;
  bloodType?: BloodType;
  rhFactor?: 'positive' | 'negative';
  allergies?: string;
  chronicDiseases?: string;
  legalRepresentative?: LegalRepresentative;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isActive: boolean;
}

export type InsuranceStatus =
  | 'universal'
  | 'private'
  | 'state'
  | 'employee'
  | 'none';

export const INSURANCE_LABELS: Record<InsuranceStatus, string> = {
  universal: 'საყოველთაო ჯანდაცვა',
  private: 'კერძო დაზღვევა',
  state: 'სახელმწიფო პროგრამა',
  employee: 'სამსახურებრივი დაზღვევა',
  none: 'დაზღვევის გარეშე',
};

export type BloodType = 'I' | 'II' | 'III' | 'IV';

export interface LegalRepresentative {
  fullName: string;
  relationship: string;
  phone: string;
  personalId?: string;
}

// ============================================================
// ჩაწერა (Appointment)
// ============================================================

export type AppointmentStatus =
  | 'scheduled'
  | 'arrived'
  | 'completed'
  | 'cancelled';

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'დანიშნული',
  arrived: 'მოვიდა',
  completed: 'დასრულდა',
  cancelled: 'გაუქმდა',
};

export type VisitType =
  | 'primary'
  | 'followup'
  | 'consultation'
  | 'emergency'
  | 'procedure';

export const VISIT_TYPE_LABELS: Record<VisitType, string> = {
  primary: 'პირველადი ვიზიტი',
  followup: 'განმეორებითი ვიზიტი',
  consultation: 'კონსულტაცია',
  emergency: 'გადაუდებელი',
  procedure: 'მანიპულაცია / პროცედურა',
};

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  dateTime: string;
  visitType: VisitType;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

// ============================================================
// შეკვეთები (Orders)
// ============================================================

export type OrderType =
  | 'laboratory'
  | 'radiology'
  | 'consultation'
  | 'procedure';

export type OrderStatus =
  | 'requested'
  | 'received'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  requested: 'მოთხოვნილი',
  received: 'მიღებული',
  in_progress: 'მიმდინარე',
  completed: 'შესრულებული',
  cancelled: 'გაუქმებული',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  requested: 'bg-yellow-100 text-yellow-800',
  received: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export interface Order {
  id: string;
  /** ადამიანურად წაკითხვადი მიმართვის № (ბარკოდისთვის), მაგ. IG524262 */
  referralNumber?: string;
  patientId: string;
  episodeId?: string;
  type: OrderType;
  subType?: string;
  /** კატალოგის ქვეკატეგორიის key */
  categoryKey?: string;
  subCategoryKey?: string;
  serviceCode?: string;
  description: string;
  /** ერთ მიმართვაში მონიშნული რამდენიმე სერვისი */
  items?: OrderItem[];
  priority: 'routine' | 'urgent' | 'stat';
  assignedTo?: string;
  assignedDoctorId?: string;
  status: OrderStatus;
  result?: string;
  resultDocumentId?: string;
  requestedBy: string;
  requestedByName?: string;
  requestedAt: string;
  completedAt?: string;
  notes?: string;
  diagnosisCode?: string;
  diagnosisName?: string;
}

export interface OrderItem {
  code?: string;
  name: string;
  categoryKey: string;
  subKey: string;
  type: OrderType;
  status: OrderStatus;
  result?: string;
}

// ============================================================
// სტაციონარი
// ============================================================

export type EpisodeType = 'inpatient' | 'outpatient' | 'emergency';

export type EpisodeStatus =
  | 'active'
  | 'transferred'
  | 'discharged'
  | 'deceased';

export const EPISODE_STATUS_LABELS: Record<EpisodeStatus, string> = {
  active: 'მკურნალობის პროცესშია',
  transferred: 'გადაყვანილია',
  discharged: 'გაწერილია',
  deceased: 'გარდაცვლილია',
};

export interface InpatientEpisode {
  id: string;
  patientId: string;
  episodeType: EpisodeType;
  admissionDate: string;
  admissionTime: string;
  department: string;
  ward: string;
  bedNumber: string;
  attendingDoctorId: string;
  status: EpisodeStatus;
  dischargeDate?: string;
  dischargeType?: 'recovered' | 'improved' | 'no_change' | 'transferred' | 'deceased' | 'other';
  diagnoses: Diagnosis[];
  icd10Primary?: string;
  icd10Secondary?: string[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface Diagnosis {
  code: string;
  name: string;
  type: 'primary' | 'secondary' | 'complication';
}

// ============================================================
// ლაბორატორია
// ============================================================

export interface LabTest {
  id: string;
  code: string;
  name: string;
  georgianName: string;
  unit: string;
  refRangeMaleMin?: number;
  refRangeMaleMax?: number;
  refRangeFemaleMin?: number;
  refRangeFemaleMax?: number;
  refRangeText?: string;
  category: string;
  turnaroundHours?: number;
}

export interface LabOrder {
  id: string;
  patientId: string;
  episodeId?: string;
  orderedBy: string;
  orderedAt: string;
  tests: LabOrderTest[];
  status: OrderStatus;
  sampleId?: string;
  sampleCollectedAt?: string;
  sampleCollectedBy?: string;
  validatedBy?: string;
  validatedAt?: string;
  notes?: string;
}

export interface LabOrderTest {
  testId: string;
  testName: string;
  status: OrderStatus;
  result?: string;
  numericResult?: number;
  unit?: string;
  flag?: 'normal' | 'high' | 'low' | 'critical_high' | 'critical_low';
  refRange?: string;
}

// ============================================================
// ლაბორატორიული პასუხი (LabResult) — სრული ნაკადი
// ============================================================

export type LabResultStatus =
  | 'assigned'      // დანიშნულია
  | 'in_progress'   // პროცესშია
  | 'draft'         // მონახაზი
  | 'confirmed'     // დადასტურებულია
  | 'corrected'     // შესწორებულია
  | 'cancelled';    // გაუქმებულია

export const LAB_RESULT_STATUS_LABELS: Record<LabResultStatus, string> = {
  assigned: 'დანიშნულია',
  in_progress: 'პროცესშია',
  draft: 'მონახაზი',
  confirmed: 'დადასტურებულია',
  corrected: 'შესწორებულია',
  cancelled: 'გაუქმებულია',
};

export const LAB_RESULT_STATUS_COLORS: Record<LabResultStatus, string> = {
  assigned: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-purple-100 text-purple-800',
  draft: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-green-100 text-green-800',
  corrected: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-600',
};

export type LabFlag = 'normal' | 'high' | 'low' | 'critical_high' | 'critical_low';

export interface LabParameter {
  code: string;
  name: string;
  value: string;
  unit: string;
  refRange: string;
  flag: LabFlag;
}

export interface LabResultVersion {
  parameters: LabParameter[];
  comment?: string;
  editedById: string;
  editedByName: string;
  editedAt: string;
  status: LabResultStatus;
}

export interface LabResult {
  id: string;
  patientId: string;
  patientName?: string;
  orderId: string;
  referralNumber?: string;
  episodeId?: string;
  testName: string;
  testCode?: string;
  groupName: string;        // კვლევის ჯგუფი (ქვეკატეგორია)
  groupCode?: string;       // ლაბ. ჯგუფის კოდი (მაგ. BL.6)
  material?: string;        // მასალა (სისხლი / შრატი / შარდი)
  sampleTime?: string;
  parameters: LabParameter[];
  comment?: string;
  status: LabResultStatus;
  performedById?: string;   // შემსრულებელი ლაბორანტი
  performedByName?: string;
  confirmedById?: string;   // დამადასტურებელი
  confirmedByName?: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  versions?: LabResultVersion[];
}

// ============================================================
// რადიოლოგია
// ============================================================

export type RadioModality =
  | 'xray'
  | 'ct'
  | 'mri'
  | 'usg'
  | 'angio'
  | 'coronary'
  | 'spinal_angio'
  | 'brain_angio'
  | 'rfp';

export const MODALITY_LABELS: Record<RadioModality, string> = {
  xray: 'რენტგენი',
  ct: 'კომპიუტერული ტომოგრაფია (CT)',
  mri: 'მაგნიტო-რეზონანსური (MRI)',
  usg: 'ულტრაბგერა (USG)',
  angio: 'ანგიოგრაფია',
  coronary: 'კორონაროგრაფია',
  spinal_angio: 'სპინალური ანგიოგრაფია',
  brain_angio: 'თავის ტვინის სისხლძარღვების ანგიოგრაფია',
  rfp: 'დიაგნოსტიკა რადიოფარმპრეპარატებით',
};

export interface RadioOrder {
  id: string;
  patientId: string;
  episodeId?: string;
  modality: RadioModality;
  bodyRegion: string;
  clinicalInfo: string;
  orderedBy: string;
  orderedAt: string;
  status: OrderStatus;
  performedBy?: string;
  performedAt?: string;
  findings?: string;
  conclusion?: string;
  reportedBy?: string;
  reportedAt?: string;
  imageUrls?: string[];
}

// ============================================================
// დოკუმენტები
// ============================================================

export type DocumentStatus = 'draft' | 'signed' | 'locked';

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: 'მონახაზი',
  signed: 'ხელმოწერილი',
  locked: 'დაბლოკილი',
};

export interface MedicalDocument {
  id: string;
  type: string;
  patientId: string;
  episodeId?: string;
  status: DocumentStatus;
  content: Record<string, unknown>;
  version: number;
  previousVersionId?: string;
  createdBy: string;
  createdAt: string;
  signedBy?: string;
  signedAt?: string;
  updatedAt: string;
}

// ============================================================
// აუდიტ-ლოგი
// ============================================================

export type AuditAction =
  | 'view'
  | 'create'
  | 'update'
  | 'sign'
  | 'print'
  | 'delete'
  | 'login'
  | 'logout';

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  view: 'ნახა',
  create: 'შექმნა',
  update: 'დაარედაქტირა',
  sign: 'დაადასტურა',
  print: 'დაბეჭდა',
  delete: 'წაშალა',
  login: 'შევიდა სისტემაში',
  logout: 'გამოვიდა სისტემიდან',
};

export interface AuditLog {
  id: string;
  userId: string;
  userDisplayName: string;
  userRole: UserRole;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  patientId?: string;
  patientName?: string;
  documentType?: string;
  description: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  timestamp: string;
}

// ============================================================
// კლინიკის კონფიგურაცია
// ============================================================

export interface ClinicConfig {
  id: string;
  name: string;
  nameEn?: string;
  address: string;
  phone: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  /** ზოგადი სატიტულე ფურცელი — ჯდება ყველა ბლანკის ზემოთ ბეჭდვისას */
  titlePageUrl?: string;
  /** ლაბორატორიის ცალკე სატიტულე ფურცელი */
  labTitlePageUrl?: string;
  licenseNumber?: string;
  taxId?: string;
  director?: string;
  headDoctor?: string;
  updatedAt: string;
}
