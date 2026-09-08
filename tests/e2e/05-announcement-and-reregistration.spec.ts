import { test, expect } from "./fixtures/test-base";
import { loginAsApplicant, clearAuthSession, TEST_CREDENTIALS } from "./fixtures/auth.fixture";

test.describe("05. Graduation Announcement & Re-Registration Flow", () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthSession(page);
  });

  test("5.1 Graduation Banner & SK PDF Download", async ({ page }) => {
    await loginAsApplicant(page, TEST_CREDENTIALS.applicantSiti.email, TEST_CREDENTIALS.applicantSiti.password);

    // If candidate is LULUS_DITERIMA, green celebration banner appears
    const lulusBanner = page.locator("text=Selamat").or(page.locator("text=LULUS SELEKSI")).first();
    await expect(lulusBanner).toBeVisible({ timeout: 10000 });

    // Check download SK button
    const skBtn = page.locator("button:has-text('Unduh Surat Kelulusan'), a:has-text('Unduh Surat Kelulusan')").first();
    await expect(skBtn).toBeVisible();

    // Click 'Konfirmasi / Daftar Ulang'
    const daftarUlangBtn = page.locator("button:has-text('Konfirmasi / Daftar Ulang')").first();
    await expect(daftarUlangBtn).toBeVisible();
    await daftarUlangBtn.click();

    // DaftarUlangModal should be visible
    const modal = page.locator(".modal.show");
    await expect(modal).toBeVisible();
    await expect(modal.locator("text=Konfirmasi Kehadiran / Daftar Ulang")).toBeVisible();

    // Select 'bersedia'
    await modal.locator('select[name="kesediaan"]').selectOption("bersedia");
    await modal.locator('textarea[name="catatan"]').fill("Saya bersedia mengikuti pelatihan secara penuh dan mematuhi tata tertib.");

    // Submit
    await modal.locator("button:has-text('Kirim Konfirmasi')").click();

    // Modal closes
    await expect(modal).not.toBeVisible({ timeout: 10000 });
    await expect(
      page.locator("text=Konfirmasi kehadiran Anda telah berhasil tercatat").or(page.locator("text=Daftar Ulang")).first()
    ).toBeVisible({ timeout: 5000 });
  });
});
