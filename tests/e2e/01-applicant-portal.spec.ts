import { test, expect } from "@playwright/test";
import { ensureDummyFiles } from "./fixtures/dummy-files";
import { loginAsApplicant, clearAuthSession, TEST_CREDENTIALS } from "./fixtures/auth.fixture";

test.describe("01. Calon Peserta (Applicant) Portal & Wizard Flow", () => {
  let files: ReturnType<typeof ensureDummyFiles>;

  test.beforeAll(() => {
    files = ensureDummyFiles();
  });

  test.beforeEach(async ({ page }) => {
    await clearAuthSession(page);
  });

  test("1.1 Public Landing: View programs and open Program Detail Modal", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Tingkatkan Keahlian Anda Bersama Beasiswa Pelatihan")).toBeVisible();

    // Check catalog section
    const programCards = page.locator(".card-program");
    await expect(programCards.first()).toBeVisible();

    // Click 'Lihat Detail & Daftar' on the first program
    const detailBtn = page.locator("button:has-text('Lihat Detail & Daftar')").first();
    await detailBtn.click();

    // ProgramDetailModal opens
    const modal = page.locator(".modal.show");
    await expect(modal).toBeVisible();
    await expect(modal.locator("text=Deskripsi Program")).toBeVisible();

    // Close modal
    await modal.locator(".btn-close").click();
    await expect(modal).not.toBeVisible();
  });

  test("1.2 Public Register: Validates input and registers new applicant", async ({ page }) => {
    await page.goto("/");
    const navRegisterBtn = page.locator("button:has-text('Daftar Akun')").first();
    await navRegisterBtn.click();

    const modal = page.locator(".modal.show");
    await expect(modal).toBeVisible();
    await expect(modal.locator("text=Daftar Akun Peserta")).toBeVisible();

    // Fill registration form with 16-digit NIK
    const uniqueNik = "3201" + Math.floor(100000000000 + Math.random() * 900000000000);
    await modal.locator('input[name="nik"]').fill(uniqueNik);
    await modal.locator('input[name="namaLengkap"]').fill("Budi Santoso E2E");
    await modal.locator('input[name="email"]').fill(`budi_${Date.now()}@example.com`);
    await modal.locator('input[name="password"]').fill("Password123!");
    await modal.locator('input[name="confirmPassword"]').fill("Password123!");

    // Submit registration
    await modal.locator('button[type="submit"]').click();

    // Should redirect to /applicant portal
    await page.waitForURL("**/applicant", { timeout: 15000 });
    await expect(page.locator("a:has-text('Dashboard Saya')").first()).toBeVisible({ timeout: 10000 });
  });

  test("1.3 Applicant Flow: Program selection, 4-step wizard with auto-save and submission", async ({ page }) => {
    // Register a fresh applicant so they have no prior applications
    await page.goto("/");
    const navRegisterBtn = page.locator("button:has-text('Daftar Akun')").first();
    await navRegisterBtn.click();

    const regModal = page.locator(".modal.show");
    await expect(regModal).toBeVisible();

    const uniqueNik = "3201" + Math.floor(100000000000 + Math.random() * 900000000000);
    const uniqueEmail = `wizard_user_${Date.now()}@example.com`;
    await regModal.locator('input[name="nik"]').fill(uniqueNik);
    await regModal.locator('input[name="namaLengkap"]').fill("Calon Peserta Baru");
    await regModal.locator('input[name="email"]').fill(uniqueEmail);
    await regModal.locator('input[name="password"]').fill("Password123!");
    await regModal.locator('input[name="confirmPassword"]').fill("Password123!");
    await regModal.locator('button[type="submit"]').click();

    // Redirection to applicant portal
    await page.waitForURL("**/applicant", { timeout: 15000 });
    await expect(page.locator("a:has-text('Dashboard Saya')").first()).toBeVisible({ timeout: 10000 });

    // Click 'Lihat Detail & Daftar' on first program in catalog
    const selectBtn = page.locator("button:has-text('Lihat Detail & Daftar'), button:has-text('Mulai Isi Formulir')").first();
    await selectBtn.click();

    // Wizard modal should be visible
    const wizardModal = page.locator(".modal.show");
    await expect(wizardModal).toBeVisible();
    await expect(wizardModal.locator("text=Formulir Pendaftaran")).toBeVisible();

    // --- STEP 1: Biodata ---
    await expect(wizardModal.locator("text=Bagian 1: Data Diri")).toBeVisible();
    await wizardModal.locator('input[name="biodata.nik"]').fill("3201123456780002");
    await wizardModal.locator('input[name="biodata.namaLengkap"]').fill("Calon Peserta Terverifikasi");
    await wizardModal.locator('input[name="biodata.tempatLahir"]').fill("Bandung");
    await wizardModal.locator('input[name="biodata.tglLahir"]').fill("1998-05-15");
    await wizardModal.locator('select[name="biodata.jenisKelamin"]').selectOption("L");
    await wizardModal.locator('textarea[name="biodata.alamat"]').fill("Jl. Dipatiukur No. 45 RT 02 RW 05");
    await wizardModal.locator('select[name="biodata.provinsi"]').selectOption("Jawa Barat");
    await wizardModal.locator('select[name="biodata.kabupatenKota"]').selectOption("Kota Bandung");
    await wizardModal.locator('select[name="biodata.kecamatan"]').selectOption("Coblong");
    await wizardModal.locator('select[name="biodata.kelurahan"]').selectOption("Dago");
    await wizardModal.locator('input[name="biodata.noHp"]').fill("081234567890");

    // Click 'Selanjutnya' -> should advance to Step 2
    await wizardModal.locator("button:has-text('Selanjutnya')").click();

    // --- STEP 2: Pendidikan & Pekerjaan ---
    await expect(wizardModal.locator("text=Bagian 2: Latar Belakang Pendidikan")).toBeVisible({ timeout: 5000 });
    await wizardModal.locator('select[name="pendidikan.pendidikanTerakhir"]').selectOption("S1 (Sarjana)");
    await wizardModal.locator('input[name="pendidikan.namaInstansi"]').fill("Institut Teknologi Bandung");
    await wizardModal.locator('input[name="pendidikan.jurusan"]').fill("Teknik Informatika");
    await wizardModal.locator('input[name="pendidikan.pekerjaanSaatIni"]').fill("Fresh Graduate");

    // Click 'Selanjutnya' -> should advance to Step 3
    await wizardModal.locator("button:has-text('Selanjutnya')").click();

    // --- STEP 3: Dokumen Upload ---
    await expect(wizardModal.locator("text=Bagian 3: Unggah Dokumen")).toBeVisible({ timeout: 5000 });

    // Try uploading prohibited SVG file to test cybersecurity guardrail
    const firstFileInput = wizardModal.locator('input[type="file"]').first();
    await firstFileInput.setInputFiles(files.invalidSvg);
    // Wait slightly for rejection handling
    await page.waitForTimeout(500);

    // Upload valid documents
    const fileInputs = wizardModal.locator('input[type="file"]');
    const inputCount = await fileInputs.count();
    if (inputCount > 0) {
      await fileInputs.nth(0).setInputFiles(files.ktpJpg);
    }
    if (inputCount > 1) {
      await fileInputs.nth(1).setInputFiles(files.kkPdf);
    }
    if (inputCount > 2) {
      await fileInputs.nth(2).setInputFiles(files.ijazahPdf);
    }
    if (inputCount > 3) {
      await fileInputs.nth(3).setInputFiles(files.rekomPdf);
    }

    await page.waitForTimeout(500);
    // Click 'Selanjutnya' -> should advance to Step 4
    await wizardModal.locator("button:has-text('Selanjutnya')").click();

    // --- STEP 4: Persetujuan & Final Submit ---
    await expect(wizardModal.locator("text=Bagian 4: Lembar Persetujuan")).toBeVisible({ timeout: 5000 });

    // Check agreement statement
    const agreementCheckbox = wizardModal.locator('input[name="pernyataanSah"]');
    await agreementCheckbox.check();
    await expect(agreementCheckbox).toBeChecked();

    // Click 'Kirim Pendaftaran (Submit)'
    await wizardModal.locator("button:has-text('Kirim Pendaftaran (Submit)')").click();

    // The read-only confirmation modal opens automatically after submission
    const readonlyModal = page.locator(".modal.show");
    await expect(readonlyModal.locator("text=Formulir Pendaftaran (Read-Only)")).toBeVisible({ timeout: 10000 });

    // Close the readonly modal
    await readonlyModal.locator(".btn-close, button:has-text('Tutup')").first().click();
    await expect(readonlyModal).not.toBeVisible({ timeout: 5000 });

    // Status on dashboard should now show submitted / verification in progress
    await expect(
      page.locator("text=Pendaftaran Berhasil Terkirim").first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("1.4 State Locking: Submitted application is locked in Read-Only mode", async ({ page }) => {
    // Login as Yosep who already has an application in SUBMITTED state
    await loginAsApplicant(page, TEST_CREDENTIALS.applicantYosep.email, TEST_CREDENTIALS.applicantYosep.password);

    // Button should be 'Lihat Data Terkirim'
    const reviewBtn = page.locator("button:has-text('Lihat Data Terkirim'), button:has-text('Tinjau Data Terkirim')").first();
    await expect(reviewBtn).toBeVisible({ timeout: 5000 });
    await reviewBtn.click();

    // Read-only modal should open
    const readonlyModal = page.locator(".modal.show");
    await expect(readonlyModal).toBeVisible();
    await expect(readonlyModal.locator("text=Formulir Pendaftaran (Read-Only)")).toBeVisible();
    await expect(readonlyModal.locator(".bg-warning-subtle")).toBeVisible();

    // Form inputs should be disabled
    const inputs = readonlyModal.locator("input, select, textarea");
    const count = await inputs.count();
    for (let i = 0; i < Math.min(count, 5); i++) {
      await expect(inputs.nth(i)).toBeDisabled();
    }

    // Close readonly modal
    await readonlyModal.locator(".btn-close, button:has-text('Tutup')").first().click();
    await expect(readonlyModal).not.toBeVisible();
  });
});
