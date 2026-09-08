import React, { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useLoginMutation } from "@/hooks/use-auth-queries";

export const Route = createFileRoute("/login")({
  component: InternalLoginComponent,
});

function InternalLoginComponent() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"verifikator" | "interviewer" | "admin">("verifikator");
  const [rememberMe, setRememberMe] = useState(true);
  const navigate = useNavigate();
  const loginMutation = useLoginMutation();

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value as "verifikator" | "interviewer" | "admin";
    setRole(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Harap isi ID pengguna dan kata sandi.");
      return;
    }

    const derivedName = username.includes("@")
      ? username.split("@")[0].replace(/[._]/g, " ")
      : username;
    const formattedName = derivedName
      ? derivedName.charAt(0).toUpperCase() + derivedName.slice(1)
      : role.toUpperCase();

    try {
      await loginMutation.mutateAsync({
        email: username,
        password,
        role,
      });

      toast.success(`Berhasil masuk sebagai ${role.toUpperCase()}!`);

      if (role === "verifikator") {
        navigate({ to: "/verifikator" });
      } else if (role === "interviewer") {
        navigate({ to: "/wawancara" });
      } else {
        navigate({ to: "/admin" });
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal masuk. Periksa kembali akun Anda.");
    }
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100 py-4"
      style={{
        background: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)",
      }}
    >
      <div className="container p-3">
        <div className="card login-card mx-auto bg-white shadow-lg">
          <div className="login-header text-center">
            <div className="icon-box mb-3 shadow-sm">
              <i className="bi bi-shield-lock-fill fs-2 text-white"></i>
            </div>
            <h4 className="fw-bold mb-1">Portal Internal</h4>
            <p className="text-white-50 small mb-0">Sistem Pengelola & Seleksi Beasiswa</p>
          </div>

          <div className="card-body p-4">
            <div
              className="alert alert-primary bg-primary-subtle text-primary border-0 d-flex align-items-center small py-2 mb-4"
              role="alert"
            >
              <i className="bi bi-info-circle-fill fs-5 me-2 flex-shrink-0"></i>
              <div>Area khusus pemroses data (Verifikator, Lembaga Seleksi, & Admin).</div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-semibold text-secondary small">
                  Username / NIP / Email Internal
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0 text-primary">
                    <i className="bi bi-person-badge-fill"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0 bg-light ps-0"
                    placeholder="Masukkan ID pengguna"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold text-secondary small">Kata Sandi</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0 text-primary">
                    <i className="bi bi-key-fill"></i>
                  </span>
                  <input
                    type="password"
                    className="form-control border-start-0 bg-light ps-0"
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label fw-semibold text-secondary small">
                  Masuk Sebagai (Role Akses)
                </label>
                <select
                  className="form-select bg-light"
                  value={role}
                  onChange={handleRoleChange}
                >
                  <option value="verifikator">Verifikator (Seleksi Administrasi)</option>
                  <option value="interviewer">Lembaga Seleksi (Wawancara)</option>
                  <option value="admin">Administrator System</option>
                </select>
              </div>

              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label className="form-check-label small text-secondary" htmlFor="rememberMe">
                    Ingat Saya
                  </label>
                </div>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    toast.info("Fitur reset password via admin internal.");
                  }}
                  className="small text-decoration-none text-primary fw-semibold"
                >
                  Lupa Password?
                </a>
              </div>

              <button type="submit" className="btn btn-primary btn-login w-100 mb-2 text-white">
                <i className="bi bi-box-arrow-in-right me-2"></i>Masuk Dashboard
              </button>
            </form>
          </div>

          <div className="card-footer bg-light border-top-0 p-3 text-center">
            <p className="mb-1 small text-muted">
              <i className="bi bi-check-circle-fill text-primary me-1"></i>Akses Terenkripsi & Ter-autentikasi
            </p>
            <Link to="/" className="small text-decoration-none text-secondary">
              <i className="bi bi-arrow-left me-1"></i>Kembali ke Halaman Utama
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
