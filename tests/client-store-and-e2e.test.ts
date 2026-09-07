import { describe, it, expect, beforeEach } from "vitest";
import { appStore } from "../apps/web/src/lib/store";

describe("Frontend Client Store & E2E Role Flow Simulation", () => {
  beforeEach(() => {
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

  it("Verifikator Flow: Review documents and issue revision", () => {
    const queue = appStore.getVerifikatorQueue();
    expect(queue.length).toBeGreaterThan(0);

    const target = queue[0];
    appStore.submitVerifikasiDecision(
      target.id,
      "revisi",
      "Ijazah tidak terbaca jelas.",
      [
        {
          persyaratanId: "req-ijazah",
          isSesuai: false,
          catatanPerbaikan: "Scan buram",
        },
      ]
    );

    const updated = appStore.getAllApplications().find((a) => a.id === target.id);
    expect(updated?.status).toBe("REVISI");
    expect(updated?.verifikasi?.catatanVerifikator).toContain("Ijazah tidak terbaca");
  });

  it("Interviewer Flow: Score candidate with weighted formula and grant graduation", () => {
    // Pick an application in queue
    const all = appStore.getAllApplications();
    const candidate = all[0];

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

  it("Admin Statistics calculation matches mockup figures", () => {
    const stats = appStore.getAdminStatistics();
    expect(stats.totalPeserta).toBeGreaterThanOrEqual(100);
    expect(stats.prosesAdministrasi).toBeGreaterThan(0);
    expect(stats.lolosAdministrasi).toBeGreaterThan(0);
    expect(stats.lulusWawancara).toBeGreaterThan(0);
  });
});
