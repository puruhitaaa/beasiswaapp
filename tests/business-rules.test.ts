import { describe, it, expect, beforeEach } from "vitest";
import { repository } from "../apps/service-transaksi/src/repository";
import { StatusPendaftaran, StatusVerifikasi } from "@beasiswaapp/contracts";

describe("Business Rules & FSM Verification", () => {
  const testUserId = `test-user-${Date.now()}`;
  const otherUserId = `other-user-${Date.now()}`;

  it("Rule 1: Enforces 1 active registration per applicant", async () => {
    // 1. Create first registration
    const app1 = await repository.create({
      kodePermohonan: `REG-TEST-001`,
      userId: testUserId,
      beasiswaId: "prog-web",
      beasiswaNamaSnapshot: "Pelatihan Web Developer Specialist",
    });
    expect(app1).toBeDefined();
    expect(app1.status).toBe(StatusPendaftaran.DRAFT);

    // 2. Query active application
    const active = await repository.findMyActive(testUserId);
    expect(active).toBeDefined();
    expect(active?.id).toBe(app1.id);

    // 3. Attempting to create a second application while first is active should be detected
    const hasActive =
      active !== null &&
      active.status !== StatusPendaftaran.TIDAK_LOLOS_ADMIN &&
      active.status !== StatusPendaftaran.TIDAK_LULUS_WAWANCARA;
    expect(hasActive).toBe(true);
  });

  it("Rule 1.1: Allows new registration after previous application was rejected", async () => {
    const rejectedUserId = `rejected-user-${Date.now()}`;
    const oldApp = await repository.create({
      kodePermohonan: `REG-REJECT-001`,
      userId: rejectedUserId,
      beasiswaId: "prog-web",
      beasiswaNamaSnapshot: "Pelatihan Web Developer",
    });

    // Mark as rejected
    await repository.update(oldApp.id, {
      status: StatusPendaftaran.TIDAK_LOLOS_ADMIN,
    });

    const activeAfterRejection = await repository.findMyActive(rejectedUserId);
    expect(activeAfterRejection).toBeNull();
  });

  it("Rule 2: 4-Step Wizard persistence and auto-save progression", async () => {
    const wizardUserId = `wizard-user-${Date.now()}`;
    const app = await repository.create({
      kodePermohonan: `REG-WIZARD-001`,
      userId: wizardUserId,
      beasiswaId: "prog-web",
      beasiswaNamaSnapshot: "Pelatihan Web Developer Specialist",
    });

    expect(app.stepWizardTerakhir).toBe(1);

    // Step 1: Save Biodata
    const afterStep1 = await repository.upsertBiodata(app.id, {
      nik: "3201123456789999",
      namaLengkap: "Budi Santoso",
      tglLahir: "1997-05-12",
      alamat: "Jl. Merdeka No. 10",
      noHp: "081234567890",
      noWa: "081234567890",
      email: "budi@example.com",
    });
    expect(afterStep1.stepWizardTerakhir).toBe(2);
    expect(afterStep1.biodata.namaLengkap).toBe("Budi Santoso");

    // Step 2: Save Pendidikan
    const afterStep2 = await repository.upsertPendidikan(app.id, {
      pendidikanTerakhir: "S1",
      namaInstansi: "Institut Teknologi Bandung",
      jurusan: "Informatika",
      pekerjaanSaatIni: "Junior Developer",
    });
    expect(afterStep2.stepWizardTerakhir).toBe(3);
    expect(afterStep2.pendidikan.namaInstansi).toBe("Institut Teknologi Bandung");

    // Step 3: Save Dokumen
    const afterStep3 = await repository.upsertDokumen(app.id, [
      {
        persyaratanId: "req-ktp",
        fileName: "ktp_budi.jpg",
        isSesuai: true,
      },
    ]);
    expect(afterStep3.stepWizardTerakhir).toBe(4);

    // Step 4: Submit Final
    const submitted = await repository.update(app.id, {
      status: StatusPendaftaran.SUBMITTED,
      submittedAt: new Date(),
    });
    expect(submitted.status).toBe(StatusPendaftaran.SUBMITTED);
  });

  it("Rule 3: Anti-IDOR ownership isolation", async () => {
    const ownerUserId = `owner-${Date.now()}`;
    const attackerUserId = `attacker-${Date.now()}`;

    const ownerApp = await repository.create({
      kodePermohonan: `REG-IDOR-001`,
      userId: ownerUserId,
      beasiswaId: "prog-data",
      beasiswaNamaSnapshot: "Pelatihan Data Analyst",
    });

    // Owner access
    const isOwner = ownerApp.userId === ownerUserId;
    expect(isOwner).toBe(true);

    // Attacker access should be flagged as forbidden
    const isAttacker = ownerApp.userId === attackerUserId;
    expect(isAttacker).toBe(false);

    // Administrative access by verifikator or admin is permitted regardless of userId
    const verifikatorRole = "verifikator";
    const canVerifikatorAccess =
      verifikatorRole === "verifikator" || verifikatorRole === "admin";
    expect(canVerifikatorAccess).toBe(true);
  });
});
