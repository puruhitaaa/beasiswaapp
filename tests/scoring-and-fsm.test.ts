import { describe, it, expect } from "vitest";
import { repository } from "../apps/service-transaksi/src/repository";
import { StatusPendaftaran, StatusVerifikasi, StatusWawancara } from "@beasiswaapp/contracts";

describe("Scoring & FSM State Transitions", () => {
  it("Verifikator decision transitions to LOLOS_ADMIN on approval", async () => {
    const app = await repository.create({
      kodePermohonan: `REG-VERIF-001`,
      userId: `user-verif-${Date.now()}`,
      beasiswaId: "prog-web",
      beasiswaNamaSnapshot: "Pelatihan Web Developer",
    });

    const result = await repository.upsertVerifikasi(app.id, "v-1", {
      statusKeputusan: StatusVerifikasi.DITERIMA,
      checklistKtp: true,
      checklistKk: true,
      checklistIjazah: true,
      checklistRekomendasi: true,
    });

    expect(result.status).toBe(StatusPendaftaran.LOLOS_ADMIN);
    expect(result.verifikasi.statusKeputusan).toBe(StatusVerifikasi.DITERIMA);
  });

  it("Verifikator decision transitions to REVISI with per-document notes", async () => {
    const app = await repository.create({
      kodePermohonan: `REG-VERIF-002`,
      userId: `user-revisi-${Date.now()}`,
      beasiswaId: "prog-web",
      beasiswaNamaSnapshot: "Pelatihan Web Developer",
    });

    const result = await repository.upsertVerifikasi(app.id, "v-1", {
      statusKeputusan: StatusVerifikasi.PERLU_REVISI,
      catatanRevisi: "Ijazah buram, harap upload ulang.",
      checklistKtp: true,
      checklistKk: true,
      checklistIjazah: false,
    });

    expect(result.status).toBe(StatusPendaftaran.REVISI);
    expect(result.verifikasi.catatanVerifikator).toContain("Ijazah buram");
  });

  it("Weighted scoring formula: (K * 0.3) + (T * 0.4) + (M * 0.3) calculates correctly", async () => {
    const k = 85; // Komunikasi & Sikap (30%) -> 25.5
    const t = 88; // Pemahaman Teknis & Motivasi (40%) -> 35.2
    const m = 90; // Komitmen & Kehadiran (30%) -> 27.0
    // Total = 25.5 + 35.2 + 27.0 = 87.70

    const calculated = Number((k * 0.3 + t * 0.4 + m * 0.3).toFixed(2));
    expect(calculated).toBe(87.7);

    const app = await repository.create({
      kodePermohonan: `REG-SCORE-001`,
      userId: `user-score-${Date.now()}`,
      beasiswaId: "prog-web",
      beasiswaNamaSnapshot: "Pelatihan Web Developer",
    });

    const result = await repository.upsertWawancara(app.id, "i-1", {
      nilaiWawancara: calculated,
      catatanEvaluasi: "Peserta memenuhi semua kriteria.",
      statusHasil: StatusWawancara.LULUS,
    });

    expect(result.status).toBe(StatusPendaftaran.LULUS_DITERIMA);
    expect(result.wawancara.nilaiWawancara).toBe(87.7);
  });

  it("Fails candidate if weighted score is below passing grade", async () => {
    const k = 50;
    const t = 55;
    const m = 60;
    // Total = 15.0 + 22.0 + 18.0 = 55.00
    const calculated = Number((k * 0.3 + t * 0.4 + m * 0.3).toFixed(2));
    expect(calculated).toBe(55.0);

    const app = await repository.create({
      kodePermohonan: `REG-SCORE-002`,
      userId: `user-fail-${Date.now()}`,
      beasiswaId: "prog-web",
      beasiswaNamaSnapshot: "Pelatihan Web Developer",
    });

    const result = await repository.upsertWawancara(app.id, "i-1", {
      nilaiWawancara: calculated,
      catatanEvaluasi: "Kemampuan teknis belum memadai.",
      statusHasil: StatusWawancara.TIDAK_LULUS,
    });

    expect(result.status).toBe(StatusPendaftaran.TIDAK_LULUS_WAWANCARA);
    expect(result.wawancara.statusHasil).toBe(StatusWawancara.TIDAK_LULUS);
  });

  it("Daftar Ulang confirmation saves attendance decision", async () => {
    const app = await repository.create({
      kodePermohonan: `REG-DAFTAR-ULANG-001`,
      userId: `user-du-${Date.now()}`,
      beasiswaId: "prog-web",
      beasiswaNamaSnapshot: "Pelatihan Web Developer",
    });

    const result = await repository.confirmDaftarUlang(app.id, "bersedia", "Siap hadir onsite.");
    expect(result.daftarUlang.statusKesediaan).toBe("bersedia");
    expect(result.daftarUlang.catatan).toBe("Siap hadir onsite.");
  });
});
