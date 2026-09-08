import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  authApi,
  dokumenApi,
  getStoredToken,
  getStoredUser,
  masterApi,
  transaksiApi,
} from "../apps/web/src/lib/api";

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, value: string) => storageMap.set(key, String(value)),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};
(global as any).localStorage = localStorageMock;

if (typeof (global as any).window === "undefined") {
  (global as any).window = global;
}

describe("Web Client API Integration & Contract Verification", () => {
  beforeEach(() => {
    storageMap.clear();
    vi.restoreAllMocks();
  });

  it("authApi stores JWT token and user profile into localStorage on login", async () => {
    const mockUser = {
      id: "user-yosep",
      name: "Yosep Rohayadi",
      email: "yosep@example.com",
      role: "applicant" as const,
    };
    const mockToken = "mock.jwt.token";

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ token: mockToken, user: mockUser }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const res = await authApi.login(mockUser.email, "Peserta123!", mockUser.role);
    expect(res.token).toBe(mockToken);
    expect(res.user.id).toBe(mockUser.id);
    expect(getStoredToken()).toBe(mockToken);
    expect(getStoredUser()?.email).toBe(mockUser.email);

    authApi.logout();
    expect(getStoredToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
  });

  it("authApi supports role-agnostic login and auto-resolves internal roles from backend response", async () => {
    const mockStaff = {
      id: "user-verif-1",
      name: "Budi Verifikator",
      email: "verifikator@kemenag.go.id",
      role: "verifikator" as const,
    };
    const mockToken = "jwt.staff.token";

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ token: mockToken, user: mockStaff }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    // Call login without specifying role
    const res = await authApi.login(mockStaff.email, "Verifikator123!");
    expect(res.token).toBe(mockToken);
    expect(res.user.role).toBe("verifikator");
    expect(getStoredUser()?.role).toBe("verifikator");

    // Verify request payload did not mandate a role
    const requestBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(requestBody.email).toBe(mockStaff.email);
    expect(requestBody.role).toBeUndefined();

    authApi.logout();
  });

  it("authApi.register sends registration payload and receives authenticated session", async () => {
    const mockUser = {
      id: "u-reg-1",
      name: "Rina",
      email: "rina@example.com",
      role: "applicant" as const,
    };
    const mockToken = "mock.reg.jwt";

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, token: mockToken, user: mockUser }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );

    const res = await authApi.register({
      name: "Rina",
      email: "rina@example.com",
      password: "Password123!",
      nik: "3201112233440001",
    });
    expect(res.success).toBe(true);
    expect(res.token).toBe(mockToken);
    expect(getStoredToken()).toBe(mockToken);
  });

  it("dokumenApi sets up multipart FormData and generates view/download URLs", async () => {
    const mockFile = new File(["dummy pdf content"], "ktp.pdf", {
      type: "application/pdf",
    });

    let sentUrl = "";
    let sentFormData: FormData | null = null;
    vi.spyOn(global, "fetch").mockImplementationOnce(async (url, init) => {
      sentUrl = String(url);
      sentFormData = init?.body as FormData;
      return new Response(
        JSON.stringify({
          success: true,
          dokumen: { id: "doc-123", namaFileAsli: "ktp.pdf" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const res = await dokumenApi.upload("prm-1", "REG-001", "req-ktp", mockFile);
    expect(res.success).toBe(true);
    expect(res.dokumen.id).toBe("doc-123");
    expect(sentUrl).toContain("/api/dokumen/upload?persyaratanId=req-ktp&pendaftaranId=prm-1&kodePermohonan=REG-001");
    expect(sentFormData).not.toBeNull();
    expect(sentFormData?.get("pendaftaranId")).toBe("prm-1");
    expect(sentFormData?.get("kodePermohonan")).toBe("REG-001");
    expect(sentFormData?.get("persyaratanId")).toBe("req-ktp");

    expect(dokumenApi.getViewUrl("doc-123")).toContain("/api/dokumen/doc-123/view");
    expect(dokumenApi.getDownloadUrl("doc-123")).toContain("/api/dokumen/doc-123/download");
  });

  it("transaksiApi formats verifikasi and wawancara payloads accurately", async () => {
    let verifBody: any = null;
    vi.spyOn(global, "fetch").mockImplementationOnce(async (_url, init) => {
      verifBody = JSON.parse(init?.body as string);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    await transaksiApi.submitVerifikasiDecision("prm-1", {
      statusKeputusan: "disetujui",
      catatanVerifikator: "Berkas lengkap dan valid.",
      checklistKtp: true,
      checklistKk: true,
      checklistIjazah: true,
      checklistRekomendasi: true,
    });

    expect(verifBody.statusKeputusan).toBe("disetujui");
    expect(verifBody.catatanVerifikator).toBe("Berkas lengkap dan valid.");
    expect(verifBody.checklistKtp).toBe(true);

    let scoringBody: any = null;
    vi.spyOn(global, "fetch").mockImplementationOnce(async (_url, init) => {
      scoringBody = JSON.parse(init?.body as string);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    await transaksiApi.submitWawancaraScoring("prm-1", {
      skorKomunikasi: 85,
      skorTeknis: 90,
      skorKomitmen: 95,
      nilaiWawancara: 90.0,
      statusHasil: "Lulus",
      catatanEvaluasi: "Kandidat sangat kompeten.",
    });

    expect(scoringBody.nilaiWawancara).toBe(90.0);
    expect(scoringBody.statusHasil).toBe("Lulus");
  });

  it("transaksiApi exportExcel initiates CSV file download from backend stream", async () => {
    const csvContent = "\uFEFFNo,NIK,Nama Peserta\r\n1,'3201123456780001,Yosep Rohayadi";
    const blob = new Blob([csvContent], { type: "text/csv; charset=utf-8" });

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(blob, {
        status: 200,
        headers: { "Content-Type": "text/csv; charset=utf-8" },
      })
    );

    // Mock URL and document DOM download trigger
    const createObjectURLMock = vi.fn(() => "blob:http://localhost/mock-csv");
    global.URL.createObjectURL = createObjectURLMock;

    let clicked = false;
    (global as any).document = {
      createElement: () => ({
        href: "",
        setAttribute: () => {},
        click: () => {
          clicked = true;
        },
      }),
      body: {
        appendChild: () => {},
        removeChild: () => {},
      },
    };

    await transaksiApi.exportExcel();
    expect(createObjectURLMock).toHaveBeenCalled();
    expect(clicked).toBe(true);
  });

  it("transaksiApi.submit sends valid non-empty JSON body and requests without body omit Content-Type", async () => {
    let submitHeaders: Record<string, string> = {};
    let submitBody: any = null;
    vi.spyOn(global, "fetch").mockImplementationOnce(async (_url, init) => {
      submitHeaders = init?.headers as Record<string, string>;
      submitBody = init?.body;
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    await transaksiApi.submit("prm-123");
    expect(submitHeaders["Content-Type"]).toBe("application/json");
    expect(submitBody).toBe(JSON.stringify({}));

    // For a GET request without a body, Content-Type must NOT be set
    let getHeaders: Record<string, string> = {};
    vi.spyOn(global, "fetch").mockImplementationOnce(async (_url, init) => {
      getHeaders = init?.headers as Record<string, string>;
      return new Response(JSON.stringify({ id: "prm-123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    await transaksiApi.getById("prm-123");
    expect(getHeaders["Content-Type"]).toBeUndefined();
  });
});
