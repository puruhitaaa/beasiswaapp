import { describe, it, expect, beforeEach } from "vitest";
import { appStore } from "../apps/web/src/lib/store";

describe("Applicant Registration & Program Selection Flow", () => {
  beforeEach(() => {
    appStore.resetToDefaults();
  });

  it("registers and enrolls to Cloud Computing & DevOps when selected from card", () => {
    appStore.setCurrentUser({
      id: "user-cloud-applicant",
      name: "Budi Cloud",
      email: "budi.cloud@example.com",
      role: "applicant",
    });

    // Verify initially no active application
    expect(appStore.getMyActiveApplication()).toBeUndefined();

    // User chooses Cloud Computing & DevOps
    const app = appStore.initApplication(
      "prog-cloud",
      "Cloud Computing & DevOps",
      "Daring (Online)"
    );

    expect(app.beasiswaId).toBe("prog-cloud");
    expect(app.beasiswaNama).toBe("Cloud Computing & DevOps");
    expect(app.status).toBe("DRAFT");

    // Active application should reflect Cloud Computing, NOT Web Developer
    const active = appStore.getMyActiveApplication();
    expect(active?.beasiswaId).toBe("prog-cloud");
    expect(active?.beasiswaNama).toBe("Cloud Computing & DevOps");
    expect(active?.beasiswaId).not.toBe("prog-web");
  });

  it("registers and enrolls to Mobile App Development when selected from card", () => {
    appStore.setCurrentUser({
      id: "user-mobile-applicant",
      name: "Siti Mobile",
      email: "siti.mobile@example.com",
      role: "applicant",
    });

    const app = appStore.initApplication(
      "prog-mobile",
      "Mobile App Development (Flutter / React Native)",
      "Daring (Online)"
    );

    expect(app.beasiswaId).toBe("prog-mobile");
    expect(app.beasiswaNama).toBe("Mobile App Development (Flutter / React Native)");
    expect(app.beasiswaId).not.toBe("prog-web");
  });

  it("supports generic registration where user selects program in applicant portal", () => {
    // 1. Generic registration (Navbar or Hero) - user created but no application draft
    appStore.setCurrentUser({
      id: "user-generic-applicant",
      name: "Dewi Lestari",
      email: "dewi@example.com",
      role: "applicant",
    });

    // No program pre-assigned
    expect(appStore.getMyActiveApplication()).toBeUndefined();

    // 2. User sees available catalog in portal and selects Cybersecurity
    const app = appStore.initApplication(
      "prog-cyber",
      "Cybersecurity Analyst & Defense",
      "Daring (Online)"
    );

    expect(app.beasiswaId).toBe("prog-cyber");
    expect(app.beasiswaNama).toBe("Cybersecurity Analyst & Defense");
    expect(appStore.getMyActiveApplication()?.beasiswaId).toBe("prog-cyber");
  });

  it("enforces 1-active-application rule preventing multi-program enrollment", () => {
    appStore.setCurrentUser({
      id: "user-single-active",
      name: "Rian Pratama",
      email: "rian@example.com",
      role: "applicant",
    });

    appStore.initApplication("prog-data", "Pelatihan Data Analyst & SQL");

    // Attempting to enroll to another program must throw
    expect(() => {
      appStore.initApplication("prog-web", "Pelatihan Web Developer Specialist");
    }).toThrow(/Batas pendaftaran tercapai/);
  });

  it("pre-fills NIK and namaLengkap with values from registration instead of '-'", () => {
    const registeredNik = "3201998877665544";
    const registeredName = "Ahmad Dahlan";
    const registeredEmail = "ahmad.dahlan@example.com";

    appStore.setCurrentUser({
      id: `user-${registeredNik}`,
      name: registeredName,
      email: registeredEmail,
      role: "applicant",
      nik: registeredNik,
    });

    const app = appStore.initApplication("prog-data", "Pelatihan Data Analyst & SQL");

    // Verify NIK and Nama Lengkap are populated from registration values
    expect(app.userNik).toBe(registeredNik);
    expect(app.userName).toBe(registeredName);
    expect(app.biodata?.nik).toBe(registeredNik);
    expect(app.biodata?.namaLengkap).toBe(registeredName);
    expect(app.biodata?.email).toBe(registeredEmail);

    // Verify neither NIK nor Nama Lengkap defaults to "-"
    expect(app.userNik).not.toBe("-");
    expect(app.userName).not.toBe("-");
    expect(app.biodata?.nik).not.toBe("-");
    expect(app.biodata?.namaLengkap).not.toBe("-");
  });
});
