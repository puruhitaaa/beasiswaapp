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

    const res = await authApi.login(mockUser.email, mockUser.role, mockUser.name);
    expect(res.token).toBe(mockToken);
    expect(res.user.id).toBe(mockUser.id);
    expect(getStoredToken()).toBe(mockToken);
    expect(getStoredUser()?.email).toBe(mockUser.email);

    authApi.logout();
    expect(getStoredToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
  });

  it("ensureSession returns existing session if token is present, or logs in seamlessly", async () => {
    const mockUser = {
      id: "v-1",
      name: "Ahmad Rivaldi",
      email: "ahmad@beasiswa.go.id",
      role: "verifikator" as const,
    };
    const mockToken = "mock.verif.jwt";

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ token: mockToken, user: mockUser }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const user = await authApi.ensureSession("verifikator", mockUser.email, mockUser.name);
    expect(user.id).toBe("v-1");
    expect(getStoredToken()).toBe(mockToken);

    // Second call reuses stored session without making an HTTP request
    const cachedUser = await authApi.ensureSession("verifikator");
    expect(cachedUser.id).toBe("v-1");
  });

  it("dokumenApi sets up multipart FormData and generates view/download URLs", async () => {
    const mockFile = new File(["dummy pdf content"], "ktp.pdf", {
      type: "application/pdf",
    });

    let sentFormData: FormData | null = null;
    vi.spyOn(global, "fetch").mockImplementationOnce(async (_url, init) => {
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
});
