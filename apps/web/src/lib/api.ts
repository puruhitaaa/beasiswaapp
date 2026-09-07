export const API_BASE_URL =
  (typeof window !== "undefined" && (window as any).__API_URL__) ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000";

const TOKEN_KEY = "beasiswaapp_auth_token";
const USER_KEY = "beasiswaapp_auth_user";

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: "applicant" | "verifikator" | "interviewer" | "admin";
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): ApiUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredSession(token: string, user: ApiUser) {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function clearStoredSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

async function request<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.error) errorMessage = errJson.error;
      else if (errJson.message) errorMessage = errJson.message;
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  // If download stream, return response as blob
  const contentType = response.headers.get("content-type");
  if (
    contentType &&
    (contentType.includes("text/csv") ||
      contentType.includes("application/octet-stream") ||
      contentType.includes("application/pdf"))
  ) {
    return (await response.blob()) as unknown as T;
  }

  return response.json();
}

// 1. Auth API
export const authApi = {
  async login(
    email: string,
    role: "applicant" | "verifikator" | "interviewer" | "admin",
    name?: string,
    userId?: string
  ) {
    const res = await request<{ token: string; user: ApiUser }>("/api/auth/token", {
      method: "POST",
      body: JSON.stringify({ email, role, name, userId }),
    });
    setStoredSession(res.token, res.user);
    return res;
  },

  async ensureSession(
    defaultRole: "applicant" | "verifikator" | "interviewer" | "admin" = "applicant",
    defaultEmail = "yosep@example.com",
    defaultName = "Yosep Rohayadi"
  ): Promise<ApiUser> {
    const user = getStoredUser();
    const token = getStoredToken();
    if (user && token) {
      return user;
    }
    const res = await this.login(defaultEmail, defaultRole, defaultName);
    return res.user;
  },

  async getProfile() {
    return request<ApiUser>("/api/rbac/me");
  },

  async getMenus() {
    return request<Array<{ id: string; name: string; route: string; icon: string }>>("/api/rbac/me/menus");
  },

  async getUsers() {
    return request<any[]>("/api/rbac/users");
  },

  async getRoles() {
    return request<any[]>("/api/rbac/roles");
  },

  logout() {
    clearStoredSession();
  },
};

// 2. Master Catalogue API
export const masterApi = {
  async getBeasiswaList() {
    return request<any[]>("/api/master/beasiswa");
  },

  async getBeasiswaById(id: string) {
    return request<any>(`/api/master/beasiswa/${id}`);
  },

  async createBeasiswa(data: any) {
    return request<any>("/api/master/beasiswa", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async deleteBeasiswa(id: string) {
    return request<any>(`/api/master/beasiswa/${id}`, {
      method: "DELETE",
    });
  },
};

// 3. Transaksi API (Wizard, Verifikasi, Wawancara, Stats)
export const transaksiApi = {
  async getMyActive() {
    try {
      return await request<any>("/api/transaksi/pendaftaran/my-active");
    } catch (err: any) {
      if (err.message?.includes("404") || err.message?.includes("Belum ada")) {
        return null;
      }
      throw err;
    }
  },

  async getById(id: string) {
    return request<any>(`/api/transaksi/pendaftaran/${id}`);
  },

  async initApplication(beasiswaId: string, programName?: string) {
    return request<any>("/api/transaksi/pendaftaran", {
      method: "POST",
      body: JSON.stringify({ beasiswaId, programName }),
    });
  },

  async saveStep1(id: string, biodata: any) {
    return request<any>(`/api/transaksi/pendaftaran/${id}/step/1`, {
      method: "PUT",
      body: JSON.stringify(biodata),
    });
  },

  async saveStep2(id: string, pendidikan: any) {
    return request<any>(`/api/transaksi/pendaftaran/${id}/step/2`, {
      method: "PUT",
      body: JSON.stringify(pendidikan),
    });
  },

  async saveStep3(id: string, dokumen: any[]) {
    return request<any>(`/api/transaksi/pendaftaran/${id}/step/3`, {
      method: "PUT",
      body: JSON.stringify({ dokumen }),
    });
  },

  async submit(id: string) {
    return request<any>(`/api/transaksi/pendaftaran/${id}/submit`, {
      method: "POST",
    });
  },

  async confirmDaftarUlang(id: string, statusKesediaan: "bersedia" | "mengundurkan", catatan?: string) {
    return request<any>(`/api/transaksi/pendaftaran/${id}/daftar-ulang`, {
      method: "POST",
      body: JSON.stringify({ statusKesediaan, catatan }),
    });
  },

  async getVerifikatorQueue() {
    return request<any[]>("/api/transaksi/verifikasi/queue");
  },

  async submitVerifikasiDecision(id: string, decision: {
    statusKeputusan: "disetujui" | "revisi" | "ditolak";
    catatanRevisi?: string;
    catatanVerifikator?: string;
    checklistKtp?: boolean;
    checklistKk?: boolean;
    checklistIjazah?: boolean;
    checklistRekomendasi?: boolean;
  }) {
    return request<any>(`/api/transaksi/verifikasi/${id}/decision`, {
      method: "POST",
      body: JSON.stringify(decision),
    });
  },

  async getWawancaraQueue() {
    return request<any[]>("/api/transaksi/wawancara/queue");
  },

  async submitWawancaraScoring(id: string, scoring: {
    skorKomunikasi?: number;
    skorTeknis?: number;
    skorKomitmen?: number;
    nilaiWawancara?: number;
    catatanEvaluasi: string;
    statusHasil: "Lulus" | "Tidak Lulus";
  }) {
    return request<any>(`/api/transaksi/wawancara/${id}/scoring`, {
      method: "POST",
      body: JSON.stringify(scoring),
    });
  },

  async getStatistics() {
    return request<any>("/api/transaksi/admin/statistics");
  },

  async getAllApplications() {
    return request<any[]>("/api/transaksi/admin/pendaftaran");
  },

  async exportExcel() {
    const blob = await request<Blob>("/api/transaksi/admin/export-excel");
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Rekap_Hasil_Seleksi_Beasiswa_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};

// 4. Dokumen API (File Upload & Inline Stream)
export const dokumenApi = {
  async upload(pendaftaranId: string, kodePermohonan: string, persyaratanId: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("pendaftaranId", pendaftaranId);
    formData.append("kodePermohonan", kodePermohonan);
    formData.append("persyaratanId", persyaratanId);

    return request<{ success: boolean; dokumen: any }>("/api/dokumen/upload", {
      method: "POST",
      body: formData,
    });
  },

  getViewUrl(docId: string) {
    return `${API_BASE_URL}/api/dokumen/${docId}/view`;
  },

  getDownloadUrl(docId: string) {
    return `${API_BASE_URL}/api/dokumen/${docId}/download`;
  },
};
