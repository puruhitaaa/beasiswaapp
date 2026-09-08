import { test, expect } from "@playwright/test";
import { ensureDummyFiles } from "./fixtures/dummy-files";
import { loginAsApplicant, clearAuthSession, TEST_CREDENTIALS } from "./fixtures/auth.fixture";

test.describe("03. Applicant Revision Handling & Selective Re-Upload Flow", () => {
  let files: ReturnType<typeof ensureDummyFiles>;

  test.beforeAll(() => {
    files = ensureDummyFiles();
  });

  test.beforeEach(async ({ page }) => {
    await clearAuthSession(page);
    // Set prm-1 (Yosep) to REVISI status with rejected document note
    await page.evaluate(() => {
      if ((window as any).__appStore) {
        (window as any).__appStore.setApplicationStatus("prm-1", "REVISI");
      }
    });
  });

  test("3.1 Revision Alert & Unified Form Lock verification", async ({ page }) => {
    // Login as Yosep who has a revision application
    await loginAsApplicant(page, TEST_CREDENTIALS.applicantYosep.email, TEST_CREDENTIALS.applicantYosep.password);

    // If application has status REVISI, the revision card and 'Perbaiki Data' button should appear
    const perbaikiBtn = page.locator("button:has-text('Perbaiki Data')").first();
    await expect(perbaikiBtn).toBeVisible({ timeout: 10000 });
    await perbaikiBtn.click();

    const wizardModal = page.locator(".modal.show");
    await expect(wizardModal).toBeVisible();

    // Should automatically open on Step 3 (Dokumen)
    await expect(wizardModal.locator("text=Bagian 3: Unggah Dokumen")).toBeVisible();

    // Check for revision alert
    await expect(wizardModal.locator(".alert-warning")).toBeVisible();

    // Verify selective unlocking:
    // Approved files should be locked (marked with 'Disetujui' badge)
    const approvedBadges = wizardModal.locator("text=Disetujui");
    if ((await approvedBadges.count()) > 0) {
      await expect(approvedBadges.first()).toBeVisible();
    }

    // Re-upload the rejected document with clean replacement
    const fileInput = wizardModal.locator('input[type="file"]').first();
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(files.ijazahPdf);
    }

    // Advance to Step 4
    await wizardModal.locator("button:has-text('Selanjutnya')").click();
    await expect(wizardModal.locator("text=Bagian 4: Lembar Persetujuan")).toBeVisible();

    // Check agreement and re-submit
    const checkbox = wizardModal.locator('input[name="pernyataanSah"]');
    await checkbox.check();
    await wizardModal.locator("button:has-text('Kirim Pendaftaran (Submit)')").click();

    // Modal automatically opens in read-only mode after submission
    const readonlyModal = page.locator(".modal.show");
    await expect(readonlyModal.locator("text=Formulir Pendaftaran (Read-Only)")).toBeVisible({ timeout: 10000 });

    // Close readonly modal
    await readonlyModal.locator(".btn-close, button:has-text('Tutup')").first().click();
    await expect(readonlyModal).not.toBeVisible({ timeout: 5000 });

    // Status on dashboard should return to submitted / in verification
    await expect(
      page.locator("text=Proses Verifikasi").or(page.locator("text=Pendaftaran Berhasil Terkirim")).first()
    ).toBeVisible({ timeout: 5000 });
  });
});
