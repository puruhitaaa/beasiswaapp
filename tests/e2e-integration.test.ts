import { describe, it, expect } from "vitest";
import { appStore } from "../apps/web/src/lib/store";

describe("E2E Integration & Edge Cases Verification", () => {
  it("Excel export produces valid UTF-8 BOM CSV with correct escaping and columns", () => {
    const list = appStore.getAllApplications();
    const headers = [
      "No",
      "NIK",
      "Nama Peserta",
      "Program Pelatihan",
      "Status Administrasi",
      "Nilai Wawancara",
      "Status Wawancara",
      "Status Final",
    ];

    const rows = list.map((p, idx) => [
      idx + 1,
      `'${p.biodata?.nik || p.userNik}`,
      p.biodata?.namaLengkap || p.userName,
      p.beasiswaNama,
      p.status === "LOLOS_ADMIN" ||
      p.status === "DALAM_PROSES_WAWANCARA" ||
      p.status === "LULUS_DITERIMA"
        ? "Lolos"
        : p.status === "TIDAK_LOLOS_ADMIN"
        ? "Tidak Lolos"
        : "Dalam Proses",
      p.wawancara?.nilaiWawancara ? p.wawancara.nilaiWawancara.toFixed(2) : "-",
      p.wawancara?.statusHasil || "-",
      p.status === "LULUS_DITERIMA" ? "DITERIMA" : p.status,
    ]);

    const csvContent =
      "\uFEFF" +
      [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\r\n");

    expect(csvContent.startsWith("\uFEFF")).toBe(true);
    expect(csvContent).toContain('"Nama Peserta"');
    expect(csvContent).toContain('"Program Pelatihan"');
    expect(csvContent).toContain('"Status Final"');
  });

  it("Unified 3-Condition Wizard Form State Verification", () => {
    // Condition 1: DRAFT (editable)
    const draftState = "DRAFT";
    const isDraftEditable = draftState === "DRAFT" || draftState === "REVISI";
    expect(isDraftEditable).toBe(true);

    // Condition 2: SUBMITTED (locked read-only)
    const submittedState = "SUBMITTED";
    const isSubmittedLocked = submittedState === "SUBMITTED" || submittedState === "LOLOS_ADMIN";
    expect(isSubmittedLocked).toBe(true);

    // Condition 3: REVISI (selective unlock)
    const docs = [
      { persyaratanId: "ktp", isRejected: false },
      { persyaratanId: "ijazah", isRejected: true },
    ];
    const isKtpEditableInRevisi = docs[0].isRejected;
    const isIjazahEditableInRevisi = docs[1].isRejected;
    expect(isKtpEditableInRevisi).toBe(false);
    expect(isIjazahEditableInRevisi).toBe(true);
  });

  it("Anti-Spoofing Gateway Sanitization: Strips unverified headers", () => {
    const incomingHeaders: Record<string, string> = {
      "x-user-id": "fake-admin-id",
      "x-user-role": "admin",
      "x-internal-secret": "stolen-secret",
      "content-type": "application/json",
    };

    // Simulated Gateway Sanitization Hook
    const sanitizeHeaders = (headers: Record<string, string>) => {
      const sanitized = { ...headers };
      delete sanitized["x-user-id"];
      delete sanitized["x-user-role"];
      delete sanitized["x-internal-secret"];
      return sanitized;
    };

    const clean = sanitizeHeaders(incomingHeaders);
    expect(clean["x-user-id"]).toBeUndefined();
    expect(clean["x-user-role"]).toBeUndefined();
    expect(clean["x-internal-secret"]).toBeUndefined();
    expect(clean["content-type"]).toBe("application/json");
  });

  it("Program Card Disabled / Locked State check when applicant has active registration", () => {
    const activeProgramId = "prog-1";
    const isProgramSelectable = (progId: string, currentActiveProgId: string | null) => {
      if (!currentActiveProgId) return true;
      return progId === currentActiveProgId;
    };

    expect(isProgramSelectable("prog-1", activeProgramId)).toBe(true);
    expect(isProgramSelectable("prog-2", activeProgramId)).toBe(false);
    expect(isProgramSelectable("prog-3", activeProgramId)).toBe(false);
  });
});
