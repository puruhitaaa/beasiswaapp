import { test, expect } from "@playwright/test";
import { ensureDummyFiles } from "./fixtures/dummy-files";
import {
  loginAsApplicant,
  loginAsVerifikator,
  loginAsInterviewer,
  loginAsAdmin,
  clearAuthSession,
  logoutUser,
} from "./fixtures/auth.fixture";

test.describe("07. Complete End-to-End Multi-Role Handshake Lifecycle", () => {
  let files: ReturnType<typeof ensureDummyFiles>;

  test.beforeAll(() => {
    files = ensureDummyFiles();
  });

  test("Complete Relay: Applicant -> Verifikator -> Revision -> Approval -> Interview -> Admission -> Admin Export", async ({ page }) => {
    // ==========================================
    // STAGE 1: APPLICANT REGISTRATION & SUBMISSION
    // ==========================================
    await clearAuthSession(page);

    // Register a fresh applicant for this handshake lifecycle test
    await page.goto("/");
    const navRegisterBtn = page.locator("button:has-text('Daftar Akun')").first();
    await navRegisterBtn.click();

    const regModal = page.locator(".modal.show");
    await expect(regModal).toBeVisible();

    const uniqueNik = "3201" + Math.floor(100000000000 + Math.random() * 900000000000);
    const relayEmail = `relay_${Date.now()}@example.com`;
    const relayName = `Relay Candidate ${Date.now()}`;
    const relayPassword = "Password123!";

    await regModal.locator('input[name="nik"]').fill(uniqueNik);
    await regModal.locator('input[name="namaLengkap"]').fill(relayName);
    await regModal.locator('input[name="email"]').fill(relayEmail);
    await regModal.locator('input[name="password"]').fill(relayPassword);
    await regModal.locator('input[name="confirmPassword"]').fill(relayPassword);
    await regModal.locator('button[type="submit"]').click();

    await page.waitForURL("**/applicant", { timeout: 15000 });
    await expect(page.locator("a:has-text('Dashboard Saya')").first()).toBeVisible({ timeout: 10000 });

    // Select program from catalog
    const startBtn = page.locator("button:has-text('Lihat Detail & Daftar'), button:has-text('Mulai Isi Formulir')").first();
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    await startBtn.click();

    const wizardModal = page.locator(".modal.show");
    await expect(wizardModal).toBeVisible();

    // Step 1: Fill Biodata
    await expect(wizardModal.locator("text=Bagian 1: Data Diri")).toBeVisible({ timeout: 5000 });
    await wizardModal.locator('input[name="biodata.nik"]').fill(uniqueNik);
    await wizardModal.locator('input[name="biodata.namaLengkap"]').fill(relayName);
    await wizardModal.locator('input[name="biodata.tempatLahir"]').fill("Bandung");
    await wizardModal.locator('input[name="biodata.tglLahir"]').fill("1997-10-10");
    await wizardModal.locator('select[name="biodata.jenisKelamin"]').selectOption("L");
    await wizardModal.locator('textarea[name="biodata.alamat"]').fill("Jl. Merdeka No. 10 Kota Bandung");
    await wizardModal.locator('select[name="biodata.provinsi"]').selectOption("Jawa Barat");
    await wizardModal.locator('select[name="biodata.kabupatenKota"]').selectOption("Kota Bandung");
    await wizardModal.locator('select[name="biodata.kecamatan"]').selectOption("Coblong");
    await wizardModal.locator('select[name="biodata.kelurahan"]').selectOption("Dago");
    await wizardModal.locator('input[name="biodata.noHp"]').fill("081299887766");
    await wizardModal.locator("button:has-text('Selanjutnya')").click();

    // Step 2: Fill Education
    await expect(wizardModal.locator("text=Bagian 2: Latar Belakang Pendidikan")).toBeVisible({ timeout: 5000 });
    await wizardModal.locator('select[name="pendidikan.pendidikanTerakhir"]').selectOption("S1 (Sarjana)");
    await wizardModal.locator('input[name="pendidikan.namaInstansi"]').fill("Universitas Padjadjaran");
    await wizardModal.locator('input[name="pendidikan.jurusan"]').fill("Statistika");
    await wizardModal.locator('input[name="pendidikan.pekerjaanSaatIni"]').fill("Pencari Kerja");
    await wizardModal.locator("button:has-text('Selanjutnya')").click();

    // Step 3: Upload files
    await expect(wizardModal.locator("text=Bagian 3: Unggah Dokumen")).toBeVisible({ timeout: 5000 });
    const fileInputs = wizardModal.locator('input[type="file"]');
    const count = await fileInputs.count();
    if (count > 0) await fileInputs.nth(0).setInputFiles(files.ktpJpg);
    if (count > 1) await fileInputs.nth(1).setInputFiles(files.kkPdf);
    if (count > 2) await fileInputs.nth(2).setInputFiles(files.ijazahPdf);
    if (count > 3) await fileInputs.nth(3).setInputFiles(files.rekomPdf);
    await page.waitForTimeout(500);
    await wizardModal.locator("button:has-text('Selanjutnya')").click();

    // Step 4: Statement check & submit
    await expect(wizardModal.locator("text=Bagian 4: Lembar Persetujuan")).toBeVisible({ timeout: 5000 });
    const agreement = wizardModal.locator('input[name="pernyataanSah"]');
    await agreement.check();
    await wizardModal.locator("button:has-text('Kirim Pendaftaran (Submit)')").click();

    // Readonly modal opens automatically on submit
    const readonlyModal = page.locator(".modal.show");
    await expect(readonlyModal.locator("text=Formulir Pendaftaran (Read-Only)")).toBeVisible({ timeout: 10000 });
    await readonlyModal.locator(".btn-close, button:has-text('Tutup')").first().click();
    await expect(readonlyModal).not.toBeVisible({ timeout: 5000 });

    // Verify applicant is now in SUBMITTED state
    await expect(page.locator("text=Proses Verifikasi").or(page.locator("text=Pendaftaran Berhasil Terkirim")).first()).toBeVisible({ timeout: 5000 });

    // ==========================================
    // STAGE 2: VERIFIKATOR REVIEWS & ASKS REVISION
    // ==========================================
    await logoutUser(page);
    await loginAsVerifikator(page);

    // Open applicant in queue
    const relayRow1 = page.locator("tr", { hasText: uniqueNik });
    await expect(relayRow1).toBeVisible({ timeout: 10000 });
    await relayRow1.locator("button:has-text('Verifikasi Data')").click();

    const verifModal1 = page.locator(".modal.show");
    await expect(verifModal1).toBeVisible();

    // Mark last document rejected in Tab 3
    await verifModal1.locator(".nav-link:has-text('Upload Dokumen')").click();
    const rejectButtons = verifModal1.locator("button:has-text('Ditolak')");
    await expect(rejectButtons.last()).toBeVisible();
    await rejectButtons.last().click();

    const noteInputs = verifModal1.locator('input[placeholder*="catatan jika tidak sesuai"]');
    if ((await noteInputs.count()) > 0) {
      await noteInputs.last().fill("Scan dokumen tidak jelas/buram. Harap unggah ulang dengan format jelas.");
    }

    // Tab 4: Set status to Revisi and submit
    await verifModal1.locator(".nav-link:has-text('Keputusan')").click();
    await verifModal1.locator('select[name="statusKeputusan"]').selectOption("revisi");
    await verifModal1.locator('textarea[name="catatanVerifikator"]').fill("Mohon perbaiki dokumen pertama yang tidak jelas.");
    await verifModal1.locator("button[type='submit']").click();
    await expect(verifModal1).not.toBeVisible({ timeout: 10000 });

    // ==========================================
    // STAGE 3: APPLICANT FIXES REVISED DOCUMENT
    // ==========================================
    await logoutUser(page);
    await loginAsApplicant(page, relayEmail, relayPassword);

    const perbaikiBtn = page.locator("button:has-text('Perbaiki Data')").first();
    await expect(perbaikiBtn).toBeVisible({ timeout: 10000 });
    await perbaikiBtn.click();

    const fixWizardModal = page.locator(".modal.show");
    await expect(fixWizardModal).toBeVisible();

    // Upload replacement file
    await expect(fixWizardModal.locator("text=Bagian 3: Unggah Dokumen")).toBeVisible({ timeout: 5000 });
    const fileInput = fixWizardModal.locator('input[type="file"]').first();
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(files.ktpJpg);
    }

    await fixWizardModal.locator("button:has-text('Selanjutnya')").click();
    await expect(fixWizardModal.locator("text=Bagian 4: Lembar Persetujuan")).toBeVisible({ timeout: 5000 });
    await fixWizardModal.locator('input[name="pernyataanSah"]').check();
    await fixWizardModal.locator("button:has-text('Kirim Pendaftaran (Submit)')").click();

    // Close readonly modal
    const fixReadonlyModal = page.locator(".modal.show");
    await expect(fixReadonlyModal.locator("text=Formulir Pendaftaran (Read-Only)")).toBeVisible({ timeout: 10000 });
    await fixReadonlyModal.locator(".btn-close, button:has-text('Tutup')").first().click();
    await expect(fixReadonlyModal).not.toBeVisible({ timeout: 5000 });

    // ==========================================
    // STAGE 4: VERIFIKATOR APPROVES (LOLOS_ADMIN)
    // ==========================================
    await logoutUser(page);
    await loginAsVerifikator(page);

    const relayRow2 = page.locator("tr", { hasText: uniqueNik });
    await expect(relayRow2).toBeVisible({ timeout: 10000 });
    await relayRow2.locator("button:has-text('Verifikasi Data')").click();

    const verifModal2 = page.locator(".modal.show");
    await expect(verifModal2).toBeVisible();

    // Mark all documents Sesuai
    await verifModal2.locator(".nav-link:has-text('Upload Dokumen')").click();
    const sesuaiButtons = verifModal2.locator("button:has-text('Sesuai')");
    const countSesuai = await sesuaiButtons.count();
    for (let i = 0; i < countSesuai; i++) {
      await sesuaiButtons.nth(i).click();
    }

    // Approve
    await verifModal2.locator(".nav-link:has-text('Keputusan')").click();
    await verifModal2.locator('select[name="statusKeputusan"]').selectOption("disetujui");
    await verifModal2.locator('textarea[name="catatanVerifikator"]').fill("Dokumen hasil revisi telah sesuai dan valid.");
    await verifModal2.locator("button[type='submit']").click();
    await expect(verifModal2).not.toBeVisible({ timeout: 10000 });

    // ==========================================
    // STAGE 5: INTERVIEWER ASSESSES & PASSES CANDIDATE
    // ==========================================
    await logoutUser(page);
    await loginAsInterviewer(page);

    const relayRow3 = page.locator("tr", { hasText: uniqueNik });
    await expect(relayRow3).toBeVisible({ timeout: 10000 });
    await relayRow3.locator("button:has-text('Input Penilaian'), button:has-text('Edit Nilai')").click();

    const interviewModal = page.locator(".modal.show");
    await expect(interviewModal).toBeVisible();
    await expect(interviewModal.locator("text=Form Penilaian & Hasil Wawancara")).toBeVisible();

    // Fill scores
    await interviewModal.locator('input[name="skorKomunikasi"]').fill("90");
    await interviewModal.locator('input[name="skorTeknis"]').fill("90");
    await interviewModal.locator('input[name="skorKomitmen"]').fill("90");
    await expect(interviewModal.locator("input[readonly]")).toHaveValue("90.00");

    await interviewModal.locator('select[name="statusHasil"]').selectOption("Lulus");
    await interviewModal.locator('textarea[name="catatanEvaluasi"]').fill("Kandidat luar biasa dan sangat siap kerja.");
    await interviewModal.locator("button:has-text('Submit Hasil Wawancara')").click();
    await expect(interviewModal).not.toBeVisible({ timeout: 10000 });

    // ==========================================
    // STAGE 6: APPLICANT CONFIRMS ADMISSION
    // ==========================================
    await logoutUser(page);
    await loginAsApplicant(page, relayEmail, relayPassword);

    const lulusBanner = page.locator("text=Selamat").or(page.locator("text=LULUS SELEKSI")).first();
    await expect(lulusBanner).toBeVisible({ timeout: 10000 });

    const daftarUlangBtn = page.locator("button:has-text('Konfirmasi / Daftar Ulang')").first();
    await expect(daftarUlangBtn).toBeVisible({ timeout: 5000 });
    await daftarUlangBtn.click();

    const daftarUlangModal = page.locator(".modal.show");
    await expect(daftarUlangModal).toBeVisible();
    await daftarUlangModal.locator('select[name="kesediaan"]').selectOption("bersedia");
    await daftarUlangModal.locator("button:has-text('Kirim Konfirmasi')").click();
    await expect(daftarUlangModal).not.toBeVisible({ timeout: 10000 });

    // ==========================================
    // STAGE 7: ADMIN AUDITS & EXPORTS EXCEL
    // ==========================================
    await logoutUser(page);
    await loginAsAdmin(page);

    await page.locator("button:has-text('Hasil Seleksi')").first().click();
    await expect(page.locator("text=Hasil Kelulusan Peserta").first()).toBeVisible();
    await expect(page.locator("button:has-text('Export Excel')").first()).toBeVisible();
  });
});
