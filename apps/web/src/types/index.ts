export type ApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "DALAM_PROSES_ADMIN"
  | "REVISI"
  | "TIDAK_LOLOS_ADMIN"
  | "LOLOS_ADMIN"
  | "DALAM_PROSES_WAWANCARA"
  | "TIDAK_LULUS_WAWANCARA"
  | "LULUS_DITERIMA";

export interface BeasiswaProgram {
  id: string;
  kodeBeasiswa: string;
  namaPelatihan: string;
  deskripsi: string;
  kuota: number;
  metode: string;
  batasPendaftaran: string;
  status: "buka" | "segera_tutup" | "ditutup";
  persyaratanKhusus?: string[];
  dokumenWajib?: string[];
  isActive: boolean;
}

export interface BiodataData {
  nik: string;
  namaLengkap: string;
  tempatLahir: string;
  tglLahir: string;
  jenisKelamin: "L" | "P";
  alamat: string;
  provinsi: string;
  kabupatenKota: string;
  kecamatan: string;
  kelurahan: string;
  noHp: string;
  email: string;
}

export interface PendidikanData {
  pendidikanTerakhir: string;
  namaInstansi: string;
  jurusan: string;
  pekerjaanSaatIni: string;
}

export interface DokumenUploadItem {
  persyaratanId: string;
  namaPersyaratan: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  format: string;
  isSesuai?: boolean;
  catatanRevisi?: string;
  fileUrl?: string;
  isRejected?: boolean;
}

export interface VerifikasiData {
  verifikatorId: string;
  verifikatorName: string;
  statusKeputusan: string;
  catatanVerifikator: string;
  verifiedAt?: string;
}

export interface WawancaraData {
  interviewerId: string;
  interviewerName: string;
  skorKomunikasi: number;
  skorTeknis: number;
  skorKomitmen: number;
  nilaiWawancara: number;
  statusHasil: "Lulus" | "Tidak Lulus";
  catatanEvaluasi: string;
  evaluatedAt?: string;
}

export interface PendaftaranRecord {
  id: string;
  kodePermohonan: string;
  userId: string;
  userName: string;
  userNik: string;
  beasiswaId: string;
  beasiswaNama: string;
  beasiswaMetode?: string;
  status: ApplicationStatus;
  stepWizardTerakhir: number;
  submittedAt?: string;
  tipePengajuan: "Baru Submit" | "Hasil Revisi";
  biodata?: BiodataData;
  pendidikan?: PendidikanData;
  dokumen: DokumenUploadItem[];
  verifikasi?: VerifikasiData;
  wawancara?: WawancaraData;
  daftarUlang?: {
    statusKesediaan: "bersedia" | "mengundurkan";
    catatan?: string;
    submittedAt?: string;
  };
}

export interface UserInternal {
  id: string;
  name: string;
  username: string;
  email: string;
  role: "verifikator" | "interviewer" | "admin" | "superadmin" | "applicant";
  status: "Active" | "Inactive";
}

export interface MasterPersyaratan {
  id: string;
  namaPersyaratan: string;
  formatAllowed: string;
  maxSize: string;
  isMandatory: boolean;
}

export interface MasterRole {
  id: string;
  name: string;
  description: string;
  accessibleMenus: string[];
}

export interface MasterMenu {
  id: string;
  name: string;
  route: string;
  icon: string;
}
