import { test, expect } from "./fixtures/test-base";
import { loginAsAdmin, clearAuthSession } from "./fixtures/auth.fixture";

test.describe("06. Administrator Management, Master Data & System Settings", () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthSession(page);
  });

  test("6.1 Dashboard Statistics & Metrics Verification", async ({ page }) => {
    await loginAsAdmin(page);

    await expect(page.locator("text=Panel Administrator").first()).toBeVisible();
    await expect(page.locator("text=Ringkasan Statistik Pendaftaran").first()).toBeVisible();

    // Verify key metric stat cards
    await expect(page.locator("text=Total Calon Peserta").first()).toBeVisible();
    await expect(page.locator("text=Proses Administrasi").first()).toBeVisible();
    await expect(page.locator("text=Lulus Administrasi").first()).toBeVisible();
  });

  test("6.2 Hasil Seleksi & Excel/CSV Export Verification", async ({ page }) => {
    await loginAsAdmin(page);

    // Switch to Tab: Hasil Seleksi via sidebar
    await page.locator("button:has-text('Hasil Seleksi')").first().click();
    await expect(page.locator("text=Hasil Kelulusan Peserta").first()).toBeVisible();

    // Verify table of results
    const table = page.locator("table");
    await expect(table).toBeVisible();

    // Trigger Excel Export
    const exportBtn = page.locator("button:has-text('Export Excel')").first();
    await expect(exportBtn).toBeVisible();

    const downloadPromise = page.waitForEvent("download", { timeout: 5000 }).catch(() => null);
    await exportBtn.click();
    const download = await downloadPromise;
    if (download) {
      expect(download.suggestedFilename()).toContain("Rekap_Hasil_Seleksi");
    } else {
      // In mock mode without browser download stream, verify success toast
      await expect(page.locator("text=File Rekap Hasil Seleksi berhasil diexport!").first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("6.3 CRUD Master Data: Beasiswa & Persyaratan", async ({ page }) => {
    await loginAsAdmin(page);

    // Switch to Tab: Data Master
    await page.locator("button:has-text('Data Master')").first().click();
    await expect(page.locator("text=CRUD Beasiswa Pelatihan").first()).toBeVisible();

    // Add new beasiswa program
    await page.locator("button:has-text('Tambah Beasiswa')").first().click();
    const beasiswaModal = page.locator(".modal.show");
    await expect(beasiswaModal).toBeVisible();

    await beasiswaModal.locator('input[name="namaPelatihan"]').fill("Cloud DevOps Engineering 2026");
    await beasiswaModal.locator('textarea[name="deskripsi"]').fill("Program pelatihan kejuruan Cloud Architect dan CI/CD automation.");
    await beasiswaModal.locator('input[name="kuota"]').fill("45");
    await beasiswaModal.locator('select[name="metode"]').selectOption("Daring (Online)");
    await beasiswaModal.locator('input[name="batasPendaftaran"]').fill("30 Nov 2026");

    await beasiswaModal.locator("button:has-text('Simpan Program Beasiswa')").click();
    await expect(beasiswaModal).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Cloud DevOps Engineering 2026").first()).toBeVisible({ timeout: 5000 });

    // Switch to Subtab: Persyaratan
    await page.locator("button:has-text('CRUD Persyaratan')").first().click();
    await expect(page.locator("text=Master Data Persyaratan Dokumen").first()).toBeVisible();

    // Add new persyaratan
    await page.locator("button:has-text('Tambah Persyaratan')").first().click();
    const syaratModal = page.locator(".modal.show");
    await expect(syaratModal).toBeVisible();

    await syaratModal.locator('input[name="namaPersyaratan"]').fill("Sertifikat Vaksin / Sehat");
    await syaratModal.locator('input[name="formatAllowed"]').fill("PDF");
    await syaratModal.locator('input[name="maxSize"]').fill("2 MB");

    await syaratModal.locator("button:has-text('Simpan Persyaratan')").click();
    await expect(syaratModal).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Sertifikat Vaksin / Sehat").first()).toBeVisible({ timeout: 5000 });
  });

  test("6.4 Setting System: Internal Users & Role Permissions", async ({ page }) => {
    await loginAsAdmin(page);

    // Switch to Tab: Setting System
    await page.locator("button:has-text('Setting System')").first().click();
    await expect(page.locator("text=CRUD Users Internal").first()).toBeVisible();

    // Add new internal user
    await page.locator("button:has-text('Tambah User Internal')").first().click();
    const userModal = page.locator(".modal.show");
    await expect(userModal).toBeVisible();

    await userModal.locator('input[name="name"]').fill("Petugas Verifikasi Baru");
    await userModal.locator('input[name="email"]').fill(`verif_${Date.now()}@beasiswa.go.id`);
    await userModal.locator('select[name="role"]').selectOption("verifikator");
    await userModal.locator('input[name="password"]').fill("Petugas123!");

    await userModal.locator("button:has-text('Simpan Akun Petugas')").click();
    await expect(userModal).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Petugas Verifikasi Baru").first()).toBeVisible({ timeout: 5000 });

    // Switch to Subtab: Role & Hak Akses
    await page.locator("button:has-text('CRUD Role & Akses Menu')").first().click();
    await expect(page.locator("text=Manajemen Role & Hak Akses Menu").first()).toBeVisible();

    // Click 'Setting Akses'
    const aturBtn = page.locator("button:has-text('Setting Akses')").first();
    await aturBtn.click();

    const roleModal = page.locator(".modal.show");
    await expect(roleModal).toBeVisible();
    await expect(roleModal.locator("text=Pengaturan Hak Akses Role")).toBeVisible();

    // Save permissions
    await roleModal.locator("button:has-text('Simpan Hak Akses')").click();
    await expect(roleModal).not.toBeVisible({ timeout: 10000 });
  });
});
