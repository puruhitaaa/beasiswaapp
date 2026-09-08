import { Page, expect } from "@playwright/test";
import { updateLowerThird } from "./test-base";

export const TEST_CREDENTIALS = {
  admin: {
    email: "admin@beasiswa.go.id",
    password: "Admin123!",
  },
  verifikator: {
    email: "ahmad@beasiswa.go.id",
    password: "Verifikator123!",
  },
  interviewer: {
    email: "interviewer@beasiswa.go.id",
    password: "Interviewer123!",
  },
  applicant: {
    email: "peserta@beasiswa.go.id",
    password: "Peserta123!",
  },
  applicantYosep: {
    email: "yosep@example.com",
    password: "Peserta123!",
  },
  applicantSiti: {
    email: "siti@example.com",
    password: "Peserta123!",
  },
};

export async function clearAuthSession(page: Page) {
  await page.context().clearCookies();
  try {
    await page.goto("/");
    await page.waitForFunction(() => typeof (window as any).__appStore !== "undefined", { timeout: 5000 }).catch(() => null);
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
        if ((window as any).__appStore) {
          (window as any).__appStore.resetToDefaults();
        }
      } catch {
        // ignore
      }
    });
  } catch {
    // ignore
  }
}

export async function logoutUser(page: Page) {
  await page.context().clearCookies();
  try {
    await page.evaluate(() => {
      try {
        localStorage.removeItem("beasiswaapp_auth_user");
        sessionStorage.clear();
        if ((window as any).__appStore) {
          (window as any).__appStore.setCurrentUser(null);
        }
      } catch {
        // ignore
      }
    });
  } catch {
    // ignore
  }
}

export async function loginAsAdmin(page: Page) {
  await updateLowerThird(page, { role: "ADMINISTRATOR" });
  await page.goto("/login");
  await page.fill('input[name="username"]', TEST_CREDENTIALS.admin.email);
  await page.fill('input[name="password"]', TEST_CREDENTIALS.admin.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin", { timeout: 15000 });
  await expect(page.locator("text=Panel Administrator").first()).toBeVisible({ timeout: 10000 });
  await updateLowerThird(page, { role: "ADMINISTRATOR" });
}

export async function loginAsVerifikator(page: Page) {
  await updateLowerThird(page, { role: "VERIFIKATOR" });
  await page.goto("/login");
  await page.fill('input[name="username"]', TEST_CREDENTIALS.verifikator.email);
  await page.fill('input[name="password"]', TEST_CREDENTIALS.verifikator.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/verifikator", { timeout: 15000 });
  await expect(page.locator("text=Verifikasi Seleksi Administrasi").first()).toBeVisible({ timeout: 10000 });
  await updateLowerThird(page, { role: "VERIFIKATOR" });
}

export async function loginAsInterviewer(page: Page) {
  await updateLowerThird(page, { role: "INTERVIEWER" });
  await page.goto("/login");
  await page.fill('input[name="username"]', TEST_CREDENTIALS.interviewer.email);
  await page.fill('input[name="password"]', TEST_CREDENTIALS.interviewer.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/wawancara", { timeout: 15000 });
  await expect(page.locator("text=Menu Proses Wawancara").first()).toBeVisible({ timeout: 10000 });
  await updateLowerThird(page, { role: "INTERVIEWER" });
}

export async function loginAsApplicant(page: Page, email = TEST_CREDENTIALS.applicant.email, password = TEST_CREDENTIALS.applicant.password) {
  await updateLowerThird(page, { role: "APPLICANT" });
  await page.goto("/login");
  await page.fill('input[name="username"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/applicant", { timeout: 15000 });
  await expect(page.locator("a:has-text('Dashboard Saya')").first()).toBeVisible({ timeout: 10000 });
  await updateLowerThird(page, { role: "APPLICANT" });
}

