import { test, expect } from "@playwright/test";
import { loginAsVerifikator, clearAuthSession } from "./fixtures/auth.fixture";

test.describe("02. Verifikator Review & Administrative Decision Flow", () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthSession(page);
  });

  test("2.1 Verifikator Login: Access portal and review dashboard metrics", async ({ page }) => {
    await loginAsVerifikator(page);

    // Verify statistics cards are visible
    await expect(page.locator("text=Perlu Verifikasi")).toBeVisible();
    await expect(page.locator("text=Status Revisi")).toBeVisible();
    await expect(page.locator("text=Disetujui")).toBeVisible();
    await expect(page.locator("text=Ditolak")).toBeVisible();

    // Verify applicant queue table is displayed
    const table = page.locator("table");
    await expect(table).toBeVisible();
    await expect(page.locator("th:has-text('Nama Peserta')")).toBeVisible();
  });

  test("2.2 Multi-Tab Verification: Inspect data and submit 'Revisi' decision with document rejection", async ({ page }) => {
    await loginAsVerifikator(page);

    // Click 'Verifikasi Data' on the first applicant
    const verifBtn = page.locator("button:has-text('Verifikasi Data')").first();
    await expect(verifBtn).toBeVisible({ timeout: 5000 });
    await verifBtn.click();

    // VerifikasiModal should be visible
    const modal = page.locator(".modal.show");
    await expect(modal).toBeVisible();
    await expect(
      modal
        .locator("text=Verifikasi Berkas Seleksi Administrasi")
        .or(modal.locator("text=Verifikasi Seleksi Administrasi"))
    ).toBeVisible();

    // Tab 1: Data Diri (Check read-only details)
    await expect(modal.locator("text=NIK (Nomor Induk Kependudukan)")).toBeVisible();

    // Switch to Tab 2: Pendidikan & Pekerjaan
    await modal.locator(".nav-link:has-text('Pendidikan')").click();
    await expect(modal.locator("text=Riwayat Pendidikan").first()).toBeVisible();

    // Switch to Tab 3: Upload Dokumen
    await modal.locator(".nav-link:has-text('Upload Dokumen')").click();
    await expect(modal.locator("text=Persyaratan Dokumen")).toBeVisible();

    // In Tab 3: Mark the last document as 'Ditolak'
    const rejectButtons = modal.locator("button:has-text('Ditolak')");
    const rejectCount = await rejectButtons.count();
    if (rejectCount > 0) {
      await rejectButtons.last().click();
    }

    // Fill revision note in the text input next to rejected doc
    const noteInputs = modal.locator('input[placeholder*="catatan jika tidak sesuai"]');
    if ((await noteInputs.count()) > 0) {
      await noteInputs
        .last()
        .fill("Scan dokumen tidak jelas/buram. Harap unggah ulang dengan format jelas.");
    }

    // Switch to Tab 4: Keputusan Akhir
    await modal.locator(".nav-link:has-text('Keputusan')").click();
    await expect(modal.locator("text=Keputusan Akhir Verifikator")).toBeVisible();

    // Select status: 'Revisi (Harus Perbaikan Berkas)'
    await modal.locator('select[name="statusKeputusan"]').selectOption("revisi");
    await modal
      .locator('textarea[name="catatanVerifikator"]')
      .fill("Mohon perbaiki dokumen ijazah yang buram sesuai catatan.");

    // Submit decision
    await modal.locator("button[type='submit']").click();

    // Modal should close and success toast appears
    await expect(modal).not.toBeVisible({ timeout: 10000 });
    await expect(
      page
        .locator("text=Revisi Terkirim")
        .or(page.locator("text=Hasil Revisi"))
        .or(page.locator("text=REVISI"))
        .first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("2.3 Approval Decision: Verifikator approves all documents -> Status LOLOS_ADMIN", async ({ page }) => {
    await loginAsVerifikator(page);

    // Open verification modal
    const verifBtn = page.locator("button:has-text('Verifikasi Data')").first();
    await verifBtn.click();

    const modal = page.locator(".modal.show");
    await expect(modal).toBeVisible();

    // Switch to Tab 3: Mark all documents as 'Sesuai'
    await modal.locator(".nav-link:has-text('Upload Dokumen')").click();
    const sesuaiButtons = modal.locator("button:has-text('Sesuai')");
    const count = await sesuaiButtons.count();
    for (let i = 0; i < count; i++) {
      await sesuaiButtons.nth(i).click();
    }

    // Switch to Tab 4: Keputusan Akhir
    await modal.locator(".nav-link:has-text('Keputusan')").click();
    await modal.locator('select[name="statusKeputusan"]').selectOption("disetujui");
    await modal
      .locator('textarea[name="catatanVerifikator"]')
      .fill(
        "Seluruh dokumen persyaratan telah diverifikasi dan memenuhi syarat kelulusan administrasi."
      );

    // Submit decision
    await modal.locator("button[type='submit']").click();

    await expect(modal).not.toBeVisible({ timeout: 10000 });
    await expect(
      page
        .locator("text=Keputusan verifikasi berhasil disimpan")
        .or(page.locator("text=DISETUJUI"))
        .first()
    ).toBeVisible({ timeout: 5000 });
  });
});
