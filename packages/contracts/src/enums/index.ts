export const StatusPendaftaran = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  DALAM_PROSES_ADMIN: "DALAM_PROSES_ADMIN",
  REVISI: "REVISI",
  TIDAK_LOLOS_ADMIN: "TIDAK_LOLOS_ADMIN",
  LOLOS_ADMIN: "LOLOS_ADMIN",
  DALAM_PROSES_WAWANCARA: "DALAM_PROSES_WAWANCARA",
  TIDAK_LULUS_WAWANCARA: "TIDAK_LULUS_WAWANCARA",
  LULUS_DITERIMA: "LULUS_DITERIMA",
} as const;

export type StatusPendaftaranType = (typeof StatusPendaftaran)[keyof typeof StatusPendaftaran];

export const Role = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  VERIFIKATOR: "verifikator",
  INTERVIEWER: "interviewer",
  APPLICANT: "applicant",
} as const;

export type RoleType = (typeof Role)[keyof typeof Role];

export const StatusVerifikasi = {
  DITERIMA: "DITERIMA",
  DITOLAK: "DITOLAK",
  PERLU_REVISI: "PERLU_REVISI",
} as const;

export type StatusVerifikasiType = (typeof StatusVerifikasi)[keyof typeof StatusVerifikasi];

export const StatusWawancara = {
  LULUS: "LULUS",
  TIDAK_LULUS: "TIDAK_LULUS",
} as const;

export type StatusWawancaraType = (typeof StatusWawancara)[keyof typeof StatusWawancara];

export const ScanStatus = {
  CLEAN: "CLEAN",
  INFECTED: "INFECTED",
  SCAN_FAILED: "SCAN_FAILED",
  SKIPPED_MOCK: "SKIPPED_MOCK",
} as const;

export type ScanStatusType = (typeof ScanStatus)[keyof typeof ScanStatus];

export const TipeDokumen = {
  KTP: "KTP",
  KK: "KK",
  IJAZAH: "IJAZAH",
  REKOMENDASI: "REKOMENDASI",
  LAINNYA: "LAINNYA",
} as const;

export type TipeDokumenType = (typeof TipeDokumen)[keyof typeof TipeDokumen];
