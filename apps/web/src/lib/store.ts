import { useSyncExternalStore } from "react";
import {
  initialInternalUsers,
  initialMenus,
  initialPendaftaranList,
  initialPersyaratan,
  initialPrograms,
  initialRoles,
} from "./mock-data";
import type {
  ApplicationStatus,
  BeasiswaProgram,
  BiodataData,
  DokumenUploadItem,
  MasterMenu,
  MasterPersyaratan,
  MasterRole,
  PendaftaranRecord,
  PendidikanData,
  UserInternal,
  VerifikasiData,
  WawancaraData,
} from "../types";

// Local storage key for persistent client mock state
const STORAGE_KEY = "beasiswaapp_client_state_v1";

interface AppState {
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: "applicant" | "verifikator" | "interviewer" | "admin";
    nik?: string;
  } | null;
  programs: BeasiswaProgram[];
  applications: PendaftaranRecord[];
  internalUsers: UserInternal[];
  persyaratan: MasterPersyaratan[];
  roles: MasterRole[];
  menus: MasterMenu[];
}

function loadState(): AppState {
  let currentUser = null;
  let programs = [...initialPrograms];
  let applications = [...initialPendaftaranList];
  let internalUsers = [...initialInternalUsers];
  let persyaratan = [...initialPersyaratan];
  let roles = [...initialRoles];
  let menus = [...initialMenus];

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("beasiswaapp_auth_user");
      if (stored) {
        currentUser = JSON.parse(stored);
      }
      const stateStored = localStorage.getItem(STORAGE_KEY);
      if (stateStored) {
        const parsed = JSON.parse(stateStored);
        if (parsed.programs?.length) programs = parsed.programs;
        if (parsed.applications?.length) applications = parsed.applications;
        if (parsed.internalUsers?.length) internalUsers = parsed.internalUsers;
        if (parsed.persyaratan?.length) persyaratan = parsed.persyaratan;
        if (parsed.roles?.length) roles = parsed.roles;
        if (parsed.menus?.length) menus = parsed.menus;
      }
    } catch {
      // ignore
    }
  }

  return {
    currentUser,
    programs,
    applications,
    internalUsers,
    persyaratan,
    roles,
    menus,
  };
}

function saveState(state: AppState) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }
}

class AppStore {
  private state: AppState = loadState();
  private listeners: Array<() => void> = [];

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    saveState(this.state);
    this.listeners.forEach((l) => l());
  }

  getCurrentUser() {
    return this.state.currentUser;
  }

  setCurrentUser(user: AppState["currentUser"]) {
    this.state.currentUser = user;
    if (typeof window !== "undefined") {
      try {
        if (user) {
          localStorage.setItem("beasiswaapp_auth_user", JSON.stringify(user));
        } else {
          localStorage.removeItem("beasiswaapp_auth_user");
          localStorage.removeItem("beasiswaapp_auth_token");
        }
      } catch {
        // ignore storage errors in private browsing
      }
    }
    this.notify();
  }

  getPrograms() {
    return this.state.programs;
  }

  getProgramById(id: string) {
    return this.state.programs.find((p) => p.id === id);
  }

  getAllApplications(): PendaftaranRecord[] {
    return this.state.applications;
  }

  getMyActiveApplication(): PendaftaranRecord | undefined {
    const user = this.state.currentUser;
    if (!user) return undefined;
    return this.state.applications.find(
      (a) =>
        a.userId === user.id ||
        a.userName === user.name ||
        (user.email && (a.biodata?.email?.toLowerCase() === user.email.toLowerCase() || a.userName?.toLowerCase() === user.email.toLowerCase())) ||
        (user.nik && (a.userNik === user.nik || a.biodata?.nik === user.nik))
    );
  }

  setApplicationStatus(
    applicationId: string,
    status: ApplicationStatus,
    extra?: Partial<PendaftaranRecord>
  ) {
    this.state.applications = this.state.applications.map((app) => {
      if (app.id === applicationId) {
        return { ...app, status, ...extra };
      }
      return app;
    });
    this.notify();
  }

  initApplication(beasiswaId: string, programName: string, metode?: string) {
    const user = this.state.currentUser;
    if (!user) throw new Error("Silakan masuk terlebih dahulu.");

    // Enforce 1 active application rule
    const existing = this.getMyActiveApplication();
    if (existing && existing.status !== "TIDAK_LOLOS_ADMIN" && existing.status !== "TIDAK_LULUS_WAWANCARA") {
      throw new Error(
        "Batas pendaftaran tercapai. Anda sudah memiliki pendaftaran aktif pada program lain."
      );
    }

    const count = this.state.applications.length + 1;
    const userNik =
      user.nik ||
      (user.id.startsWith("user-") ? user.id.replace("user-", "") : "") ||
      "3201123456780001";

    const newRecord: PendaftaranRecord = {
      id: `prm-${Date.now()}`,
      kodePermohonan: `REG-2026-0900${count}`,
      userId: user.id,
      userName: user.name,
      userNik,
      beasiswaId,
      beasiswaNama: programName,
      beasiswaMetode: metode || "Daring",
      status: "DRAFT",
      stepWizardTerakhir: 1,
      tipePengajuan: "Baru Submit",
      biodata: {
        nik: userNik,
        namaLengkap: user.name,
        email: user.email,
        tempatLahir: "",
        tglLahir: "",
        jenisKelamin: "",
        alamat: "",
        provinsi: "",
        kabupatenKota: "",
        kecamatan: "",
        kelurahan: "",
        noHp: "",
      },
      dokumen: [
        {
          persyaratanId: "req-ktp",
          namaPersyaratan: "KTP (Kartu Tanda Penduduk)",
          fileName: "",
          fileSize: "",
          mimeType: "image/jpeg",
          format: "JPG",
        },
        {
          persyaratanId: "req-kk",
          namaPersyaratan: "KK (Kartu Keluarga)",
          fileName: "",
          fileSize: "",
          mimeType: "application/pdf",
          format: "PDF",
        },
        {
          persyaratanId: "req-ijazah",
          namaPersyaratan: "Ijazah Terakhir",
          fileName: "",
          fileSize: "",
          mimeType: "application/pdf",
          format: "PDF",
        },
        {
          persyaratanId: "req-rekom",
          namaPersyaratan: "Surat Rekomendasi / Keterangan",
          fileName: "",
          fileSize: "",
          mimeType: "application/pdf",
          format: "PDF",
        },
      ],
    };

    this.state.applications.unshift(newRecord);
    this.notify();
    return newRecord;
  }

  saveStep1(applicationId: string, biodata: BiodataData) {
    this.state.applications = this.state.applications.map((app) => {
      if (app.id === applicationId) {
        const nextStep = Math.max(app.stepWizardTerakhir, 2);
        return {
          ...app,
          biodata,
          stepWizardTerakhir: nextStep,
        };
      }
      return app;
    });
    this.notify();
  }

  saveStep2(applicationId: string, pendidikan: PendidikanData) {
    this.state.applications = this.state.applications.map((app) => {
      if (app.id === applicationId) {
        const nextStep = Math.max(app.stepWizardTerakhir, 3);
        return {
          ...app,
          pendidikan,
          stepWizardTerakhir: nextStep,
        };
      }
      return app;
    });
    this.notify();
  }

  saveStep3(applicationId: string, dokumen: DokumenUploadItem[]) {
    this.state.applications = this.state.applications.map((app) => {
      if (app.id === applicationId) {
        const nextStep = Math.max(app.stepWizardTerakhir, 4);
        return {
          ...app,
          dokumen,
          stepWizardTerakhir: nextStep,
        };
      }
      return app;
    });
    this.notify();
  }

  submitApplication(applicationId: string) {
    this.state.applications = this.state.applications.map((app) => {
      if (app.id === applicationId) {
        return {
          ...app,
          status: "SUBMITTED",
          submittedAt: new Date().toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          stepWizardTerakhir: 4,
          tipePengajuan: app.status === "REVISI" ? "Hasil Revisi" : "Baru Submit",
        };
      }
      return app;
    });
    this.notify();
  }

  confirmDaftarUlang(
    applicationId: string,
    statusKesediaan: "bersedia" | "mengundurkan",
    catatan?: string
  ) {
    this.state.applications = this.state.applications.map((app) => {
      if (app.id === applicationId) {
        return {
          ...app,
          daftarUlang: {
            statusKesediaan,
            catatan,
            submittedAt: new Date().toISOString(),
          },
        };
      }
      return app;
    });
    this.notify();
  }

  // Verifikator Methods
  getVerifikatorQueue() {
    return this.state.applications.filter(
      (a) =>
        a.status === "SUBMITTED" ||
        a.status === "DALAM_PROSES_ADMIN" ||
        a.status === "REVISI"
    );
  }

  submitVerifikasiDecision(
    applicationId: string,
    statusKeputusan: "disetujui" | "revisi" | "ditolak",
    catatanVerifikator: string,
    dokumenChecklist?: Array<{
      persyaratanId: string;
      isSesuai: boolean;
      catatanPerbaikan?: string;
    }>
  ) {
    this.state.applications = this.state.applications.map((app) => {
      if (app.id === applicationId) {
        let newStatus: ApplicationStatus = "DALAM_PROSES_ADMIN";
        if (statusKeputusan === "disetujui") newStatus = "LOLOS_ADMIN";
        else if (statusKeputusan === "revisi") newStatus = "REVISI";
        else if (statusKeputusan === "ditolak") newStatus = "TIDAK_LOLOS_ADMIN";

        // Update individual documents' review status
        const updatedDocs = app.dokumen.map((doc) => {
          const check = dokumenChecklist?.find(
            (c) => c.persyaratanId === doc.persyaratanId
          );
          if (check) {
            return {
              ...doc,
              isSesuai: check.isSesuai,
              isRejected: !check.isSesuai,
              catatanRevisi: check.catatanPerbaikan || doc.catatanRevisi,
            };
          }
          return doc;
        });

        const verifikasi: VerifikasiData = {
          verifikatorId: "v-1",
          verifikatorName: "Ahmad Rivaldi",
          statusKeputusan,
          catatanVerifikator,
          verifiedAt: new Date().toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
        };

        return {
          ...app,
          status: newStatus,
          dokumen: updatedDocs,
          verifikasi,
        };
      }
      return app;
    });
    this.notify();
  }

  // Wawancara Methods
  getWawancaraQueue() {
    return this.state.applications.filter(
      (a) =>
        a.status === "LOLOS_ADMIN" ||
        a.status === "DALAM_PROSES_WAWANCARA" ||
        a.status === "LULUS_DITERIMA" ||
        a.status === "TIDAK_LULUS_WAWANCARA"
    );
  }

  submitWawancaraScoring(
    applicationId: string,
    skorKomunikasi: number,
    skorTeknis: number,
    skorKomitmen: number,
    statusHasil: "Lulus" | "Tidak Lulus",
    catatanEvaluasi: string
  ) {
    const nilaiWawancara = Number(
      (skorKomunikasi * 0.3 + skorTeknis * 0.4 + skorKomitmen * 0.3).toFixed(2)
    );

    const newStatus: ApplicationStatus =
      statusHasil === "Lulus" ? "LULUS_DITERIMA" : "TIDAK_LULUS_WAWANCARA";

    const wawancara: WawancaraData = {
      interviewerId: "i-1",
      interviewerName: "Lembaga Seleksi A",
      skorKomunikasi,
      skorTeknis,
      skorKomitmen,
      nilaiWawancara,
      statusHasil,
      catatanEvaluasi,
      evaluatedAt: new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };

    this.state.applications = this.state.applications.map((app) => {
      if (app.id === applicationId) {
        return {
          ...app,
          status: newStatus,
          wawancara,
        };
      }
      return app;
    });
    this.notify();
  }

  // Administrator Statistics & Master Data
  getAdminStatistics() {
    const apps = this.state.applications;
    return {
      totalPeserta: apps.length,
      prosesAdministrasi: apps.filter(
        (a) => a.status === "SUBMITTED" || a.status === "DALAM_PROSES_ADMIN"
      ).length,
      lolosAdministrasi: apps.filter(
        (a) =>
          a.status === "LOLOS_ADMIN" ||
          a.status === "DALAM_PROSES_WAWANCARA" ||
          a.status === "LULUS_DITERIMA"
      ).length,
      gugurAdministrasi: apps.filter((a) => a.status === "TIDAK_LOLOS_ADMIN").length,
      prosesWawancara: apps.filter((a) => a.status === "LOLOS_ADMIN").length,
      lulusWawancara: apps.filter((a) => a.status === "LULUS_DITERIMA").length,
      gagalWawancara: apps.filter(
        (a) => a.status === "TIDAK_LULUS_WAWANCARA"
      ).length,
    };
  }

  getAllApplications() {
    return this.state.applications;
  }

  // Master Beasiswa CRUD
  addBeasiswa(program: Omit<BeasiswaProgram, "id">) {
    const newProg: BeasiswaProgram = {
      ...program,
      id: `prog-${Date.now()}`,
    };
    this.state.programs.push(newProg);
    this.notify();
    return newProg;
  }

  deleteBeasiswa(id: string) {
    this.state.programs = this.state.programs.filter((p) => p.id !== id);
    this.notify();
  }

  // Master Persyaratan CRUD
  getPersyaratan() {
    return this.state.persyaratan;
  }

  addPersyaratan(persyaratan: Omit<MasterPersyaratan, "id">) {
    const newReq: MasterPersyaratan = {
      ...persyaratan,
      id: `req-${Date.now()}`,
    };
    this.state.persyaratan.push(newReq);
    this.notify();
    return newReq;
  }

  deletePersyaratan(id: string) {
    this.state.persyaratan = this.state.persyaratan.filter((p) => p.id !== id);
    this.notify();
  }

  // User Internal CRUD
  getInternalUsers() {
    return this.state.internalUsers;
  }

  addInternalUser(user: Omit<UserInternal, "id">) {
    const newUser: UserInternal = {
      ...user,
      id: `usr-${Date.now()}`,
    };
    this.state.internalUsers.push(newUser);
    this.notify();
    return newUser;
  }

  deleteInternalUser(id: string) {
    this.state.internalUsers = this.state.internalUsers.filter(
      (u) => u.id !== id
    );
    this.notify();
  }

  // Roles & Menus
  getRoles() {
    return this.state.roles;
  }

  addRole(role: Omit<MasterRole, "id">) {
    const newRole: MasterRole = {
      ...role,
      id: `role-${Date.now()}`,
    };
    this.state.roles.push(newRole);
    this.notify();
    return newRole;
  }

  updateRole(id: string, accessibleMenus: string[]) {
    this.state.roles = this.state.roles.map((r) => {
      if (r.id === id) {
        return { ...r, accessibleMenus };
      }
      return r;
    });
    this.notify();
  }

  deleteRole(id: string) {
    this.state.roles = this.state.roles.filter((r) => r.id !== id);
    this.notify();
  }

  getMenus() {
    return this.state.menus;
  }

  addMenu(menu: Omit<MasterMenu, "id">) {
    const newMenu: MasterMenu = {
      ...menu,
      id: `menu-${Date.now()}`,
    };
    this.state.menus.push(newMenu);
    this.notify();
    return newMenu;
  }

  deleteMenu(id: string) {
    this.state.menus = this.state.menus.filter((m) => m.id !== id);
    this.notify();
  }

  logout() {
    this.setCurrentUser(null);
  }

  getAllPendaftaran() {
    return this.state.applications;
  }

  getBeasiswaList() {
    return this.state.programs;
  }

  getPersyaratanList() {
    return this.state.persyaratan;
  }

  // Reset to initial clean state
  resetToDefaults(clearApplications = false) {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("beasiswaapp_auth_user");
        localStorage.removeItem("beasiswaapp_auth_token");
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    this.state = {
      currentUser: null,
      programs: JSON.parse(JSON.stringify(initialPrograms)),
      applications: clearApplications
        ? []
        : JSON.parse(JSON.stringify(initialPendaftaranList)),
      internalUsers: JSON.parse(JSON.stringify(initialInternalUsers)),
      persyaratan: JSON.parse(JSON.stringify(initialPersyaratan)),
      roles: JSON.parse(JSON.stringify(initialRoles)),
      menus: JSON.parse(JSON.stringify(initialMenus)),
    };
    this.notify();
  }
}

export const appStore = new AppStore();

if (typeof window !== "undefined") {
  (window as any).__appStore = appStore;
}

/**
 * React hook to reactively subscribe to the current authenticated user in appStore.
 * Synchronizes with localStorage and automatically triggers re-renders upon login/logout.
 */
export function useCurrentUser() {
  return useSyncExternalStore(
    (onStoreChange) => appStore.subscribe(onStoreChange),
    () => appStore.getCurrentUser(),
    () => null
  );
}
