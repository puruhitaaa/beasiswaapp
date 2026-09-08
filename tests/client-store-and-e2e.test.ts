import { describe, it, expect, beforeAll } from "vitest";
import { appStore } from "../apps/web/src/lib/store";

describe("Frontend Client Store & E2E Role Flow Simulation", () => {
  beforeAll(() => {
    appStore.resetToDefaults();
  });

  it("Applicant Flow: Init, 4-step wizard auto-save, and submission", () => {
    appStore.setCurrentUser({
      id: "user-test-e2e",
      name: "Andi Pratama",
      email: "andi@example.com",
      role: "applicant",
    });

    // 1. Initial application creation
    const app = appStore.initApplication("prog-web", "Pelatihan Web Developer Specialist");
    expect(app.status).toBe("DRAFT");
    expect(app.stepWizardTerakhir).toBe(1);

    // Enforce 1 active application rule on client
    expect(() => {
      appStore.initApplication("prog-data", "Pelatihan Data Analyst");
    }).toThrow("Batas pendaftaran tercapai");

    // 2. Save Step 1
    appStore.saveStep1(app.id, {
      nik: "3201998877665544",
      namaLengkap: "Andi Pratama",
      tempatLahir: "Jakarta",
      tglLahir: "1999-01-01",
      jenisKelamin: "L",
      alamat: "Jl. Sudirman No. 1",
      provinsi: "DKI Jakarta",
      kabupatenKota: "Jakarta Pusat",
      kecamatan: "Gambir",
      kelurahan: "Gambir",
      noHp: "081299998888",
      email: "andi@example.com",
    });
    const afterStep1 = appStore.getMyActiveApplication();
    expect(afterStep1?.stepWizardTerakhir).toBe(2);

    // 3. Save Step 2
    appStore.saveStep2(app.id, {
      pendidikanTerakhir: "S1",
      namaInstansi: "Universitas Indonesia",
      jurusan: "Sistem Informasi",
      pekerjaanSaatIni: "Fresh Graduate",
    });
    const afterStep2 = appStore.getMyActiveApplication();
    expect(afterStep2?.stepWizardTerakhir).toBe(3);

    // 4. Save Step 3
    appStore.saveStep3(app.id, [
      {
        persyaratanId: "req-ktp",
        namaPersyaratan: "KTP",
        fileName: "ktp_andi.jpg",
        fileSize: "1.2 MB",
        mimeType: "image/jpeg",
        format: "JPG",
      },
    ]);
    const afterStep3 = appStore.getMyActiveApplication();
    expect(afterStep3?.stepWizardTerakhir).toBe(4);

    // 5. Submit
    appStore.submitApplication(app.id);
    const submitted = appStore.getMyActiveApplication();
    expect(submitted?.status).toBe("SUBMITTED");
  });

  it("Verifikator Flow: Review documents and approve for interview", () => {
    const queue = appStore.getVerifikatorQueue();
    expect(queue.length).toBeGreaterThan(0);

    const target = queue[0];
    appStore.submitVerifikasiDecision(
      target.id,
      "disetujui",
      "Seluruh berkas persyaratan lengkap dan sesuai kriteria.",
      [
        {
          persyaratanId: "req-ktp",
          isSesuai: true,
        },
      ]
    );

    const updated = appStore.getAllApplications().find((a) => a.id === target.id);
    expect(updated?.status).toBe("LOLOS_ADMIN");
    expect(updated?.verifikasi?.statusKeputusan).toBe("disetujui");
  });

  it("Interviewer Flow: Score candidate with weighted formula and grant graduation", () => {
    // Pick candidate from interview queue
    const queue = appStore.getWawancaraQueue();
    expect(queue.length).toBeGreaterThan(0);
    const candidate = queue[0];

    appStore.submitWawancaraScoring(
      candidate.id,
      90, // K: 90 * 0.3 = 27
      90, // T: 90 * 0.4 = 36
      90, // M: 90 * 0.3 = 27 -> Total = 90.00
      "Lulus",
      "Kandidat sangat berkompeten."
    );

    const graded = appStore.getAllApplications().find((a) => a.id === candidate.id);
    expect(graded?.status).toBe("LULUS_DITERIMA");
    expect(graded?.wawancara?.nilaiWawancara).toBe(90.0);
    expect(graded?.wawancara?.statusHasil).toBe("Lulus");
  });

  it("Applicant Flow: Confirm daftar ulang attendance", () => {
    const candidate = appStore.getAllApplications()[0];
    appStore.confirmDaftarUlang(candidate.id, "bersedia", "Akan mengikuti tepat waktu.");

    const updated = appStore.getAllApplications().find((a) => a.id === candidate.id);
    expect(updated?.daftarUlang?.statusKesediaan).toBe("bersedia");
    expect(updated?.daftarUlang?.catatan).toBe("Akan mengikuti tepat waktu.");
  });

  it("Admin Statistics calculation reflects actual database counts without artificial offsets", () => {
    const stats = appStore.getAdminStatistics();
    expect(stats.totalPeserta).toBe(1);
    expect(stats.lulusWawancara).toBe(1);
    expect(stats.lolosAdministrasi).toBe(1);
  });

  it("Authentication Persistence & Store Reactivity", () => {
    let notifiedCount = 0;
    const unsubscribe = appStore.subscribe(() => {
      notifiedCount++;
    });

    // 1. Setting user updates memory, notifies listeners, and syncs localStorage
    appStore.setCurrentUser({
      id: "usr-persist-1",
      name: "Budi Santoso",
      email: "budi@example.com",
      role: "applicant",
    });

    expect(appStore.getCurrentUser()?.name).toBe("Budi Santoso");
    expect(notifiedCount).toBe(1);

    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem("beasiswaapp_auth_user");
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!).name).toBe("Budi Santoso");
    }

    // 2. Logging out clears memory, notifies listeners, and removes localStorage
    appStore.logout();
    expect(appStore.getCurrentUser()).toBeNull();
    expect(notifiedCount).toBe(2);

    if (typeof localStorage !== "undefined") {
      expect(localStorage.getItem("beasiswaapp_auth_user")).toBeNull();
    }

    unsubscribe();
  });
});
