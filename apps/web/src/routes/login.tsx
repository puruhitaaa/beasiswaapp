import React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import { useLoginMutation } from "@/hooks/use-auth-queries";

export const Route = createFileRoute("/login")({
  component: InternalLoginComponent,
});

const loginSchema = z.object({
  username: z.string().min(1, "Harap isi ID pengguna."),
  password: z.string().min(1, "Harap isi kata sandi."),
  rememberMe: z.boolean(),
});

function InternalLoginComponent() {
  const navigate = useNavigate();
  const loginMutation = useLoginMutation();

  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
      rememberMe: true,
    },
    validators: {
      onSubmit: loginSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const res = await loginMutation.mutateAsync({
          email: value.username,
          password: value.password,
        });

        const role = res.user?.role;
        const roleLabels: Record<string, string> = {
          verifikator: "Verifikator",
          interviewer: "Pewawancara",
          admin: "Administrator",
          superadmin: "Superadmin",
          applicant: "Peserta",
        };
        const roleDisplay = role ? roleLabels[role] || role.toUpperCase() : "Petugas";

        toast.success(`Berhasil masuk sebagai ${roleDisplay}!`);

        if (role === "verifikator") {
          navigate({ to: "/verifikator" });
        } else if (role === "interviewer") {
          navigate({ to: "/wawancara" });
        } else if (role === "admin") {
          navigate({ to: "/admin" });
        } else if (role === "applicant") {
          toast.info("Mengarahkan ke Dashboard Calon Peserta...");
          navigate({ to: "/applicant" });
        } else {
          navigate({ to: "/" });
        }
      } catch (err: any) {
        toast.error(err.message || "Gagal masuk. Periksa kembali akun Anda.");
      }
    },
  });

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

            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              }}
            >
              <form.Field name="username">
                {(field) => (
                  <div className="mb-3">
                    <label htmlFor={field.name} className="form-label fw-semibold text-secondary small">
                      Username / NIP / Email Internal
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0 text-primary">
                        <i className="bi bi-person-badge-fill"></i>
                      </span>
                      <input
                        id={field.name}
                        name={field.name}
                        type="text"
                        className={`form-control border-start-0 bg-light ps-0 ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                        placeholder="Masukkan ID pengguna"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </div>
                    {field.state.meta.errors.map((error) => (
                      <div
                        key={error ? (typeof error === "string" ? error : error.message) : ""}
                        className="invalid-feedback d-block"
                      >
                        {error ? (typeof error === "string" ? error : error.message) : ""}
                      </div>
                    ))}
                  </div>
                )}
              </form.Field>

              <form.Field name="password">
                {(field) => (
                  <div className="mb-3">
                    <label htmlFor={field.name} className="form-label fw-semibold text-secondary small">
                      Kata Sandi
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0 text-primary">
                        <i className="bi bi-key-fill"></i>
                      </span>
                      <input
                        id={field.name}
                        name={field.name}
                        type="password"
                        className={`form-control border-start-0 bg-light ps-0 ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                        placeholder="Masukkan password"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </div>
                    {field.state.meta.errors.map((error) => (
                      <div
                        key={error ? (typeof error === "string" ? error : error.message) : ""}
                        className="invalid-feedback d-block"
                      >
                        {error ? (typeof error === "string" ? error : error.message) : ""}
                      </div>
                    ))}
                  </div>
                )}
              </form.Field>


              <form.Field name="rememberMe">
                {(field) => (
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={field.name}
                        name={field.name}
                        checked={field.state.value}
                        onChange={(e) => field.handleChange(e.target.checked)}
                      />
                      <label className="form-check-label small text-secondary" htmlFor={field.name}>
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
                )}
              </form.Field>

              <form.Subscribe
                selector={(state) => ({
                  isSubmitting: state.isSubmitting,
                })}
              >
                {({ isSubmitting }) => (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary btn-login w-100 mb-2 text-white"
                  >
                    <i className="bi bi-box-arrow-in-right me-2"></i>
                    {isSubmitting ? "Memproses..." : "Masuk Dashboard"}
                  </button>
                )}
              </form.Subscribe>
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
