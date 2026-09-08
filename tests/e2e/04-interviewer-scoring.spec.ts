import { test, expect } from "@playwright/test";
import { loginAsInterviewer, clearAuthSession } from "./fixtures/auth.fixture";

test.describe("04. Lembaga Seleksi (Interviewer) Scoring & Weighted Calculation Flow", () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthSession(page);
  });

  test("4.1 Interviewer Login: View candidates queue and filter", async ({ page }) => {
    await loginAsInterviewer(page);

    await expect(page.locator("h4:has-text('Menu Proses Wawancara'), .main-content:has-text('Menu Proses Wawancara')").first()).toBeVisible();
    await expect(page.locator("h6:has-text('Siap Wawancara')")).toBeVisible();

    // Table of candidates
    const table = page.locator("table");
    await expect(table).toBeVisible();
    await expect(page.locator("th:has-text('Nama Peserta')")).toBeVisible();
  });

  test("4.2 Weighted Scoring Calculation & Final Decision Submission", async ({ page }) => {
    // Set prm-1 to LOLOS_ADMIN so it is fresh in the interviewer queue
    await page.evaluate(() => {
      if ((window as any).__appStore) {
        (window as any).__appStore.setApplicationStatus("prm-1", "LOLOS_ADMIN");
      }
    });

    await loginAsInterviewer(page);

    // Click 'Input Penilaian' or 'Edit Nilai' on the candidate
    const actionBtn = page.locator("button:has-text('Input Penilaian'), button:has-text('Edit Nilai')").first();
    await expect(actionBtn).toBeVisible({ timeout: 5000 });
    await actionBtn.click();

    // WawancaraModal should open
    const modal = page.locator(".modal.show");
    await expect(modal).toBeVisible();
    await expect(modal.locator("text=Form Penilaian & Hasil Wawancara")).toBeVisible();

    // Input scores:
    // Komunikasi = 85 (30% -> 25.50)
    // Teknis = 90 (40% -> 36.00)
    // Komitmen = 80 (30% -> 24.00)
    // Nilai Akhir should be = 85.50
    await modal.locator('input[name="skorKomunikasi"]').fill("85");
    await modal.locator('input[name="skorTeknis"]').fill("90");
    await modal.locator('input[name="skorKomitmen"]').fill("80");

    // Check auto-calculated final score in readonly input
    await expect(modal.locator("input[readonly]")).toHaveValue("85.50", { timeout: 5000 });

    // Select status: 'Lulus Wawancara'
    await modal.locator('select[name="statusHasil"]').selectOption("Lulus");
    await modal.locator('textarea[name="catatanEvaluasi"]').fill(
      "Kandidat memiliki wawasan teknis yang sangat baik, motivasi tinggi, dan komitmen waktu penuh untuk mengikuti pelatihan."
    );

    // Submit evaluation
    await modal.locator("button:has-text('Submit Hasil Wawancara')").click();

    // Modal closes and success toast / badge appears
    await expect(modal).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Lulus Wawancara").first()).toBeVisible({ timeout: 5000 });
  });
});
