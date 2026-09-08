import React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import { useRegisterMutation } from "@/hooks/use-auth-queries";
import { useInitApplicationMutation } from "@/hooks/use-transaksi-queries";

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
  targetProgramId?: string;
}

const registerModalSchema = z
  .object({
    nik: z.string().regex(/^\d{16}$/, "NIK harus tepat 16 digit angka sesuai KTP."),
    namaLengkap: z.string().min(3, "Nama lengkap minimal 3 karakter."),
    email: z.string().email("Format email tidak valid."),
    password: z.string().min(6, "Kata sandi minimal 6 karakter."),
    confirmPassword: z.string().min(1, "Konfirmasi kata sandi harus diisi."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi kata sandi tidak cocok.",
    path: ["confirmPassword"],
  });

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  onSwitchToLogin,
  targetProgramId,
}) => {
  const navigate = useNavigate();
  const registerMutation = useRegisterMutation();
  const initApplicationMutation = useInitApplicationMutation();

  const form = useForm({
    defaultValues: {
      nik: "",
      namaLengkap: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    validators: {
      onSubmit: registerModalSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await registerMutation.mutateAsync({
          nik: value.nik,
          name: value.namaLengkap,
          email: value.email,
          password: value.password,
        });

        // If a target program was selected, auto-init a draft in the backend
        const progId = targetProgramId || "prog-web";
        try {
          await initApplicationMutation.mutateAsync({ beasiswaId: progId });
        } catch {
          // ignore if application already initialized
        }

        toast.success("Akun berhasil didaftarkan ke sistem! Selamat datang.");
        onClose();
        navigate({ to: "/applicant" });
      } catch (err: any) {
        toast.error(err.message || "Gagal mendaftarkan akun.");
      }
    },
  });

  if (!isOpen) return null;

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header bg-primary text-white">
              <h5 className="modal-title fw-bold">
                <i className="bi bi-person-plus-fill me-2"></i>Daftar Akun Peserta
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
              ></button>
            </div>
            <div className="modal-body">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  form.handleSubmit();
                }}
              >
                <form.Field name="nik">
                  {(field) => (
                    <div className="mb-3">
                      <label htmlFor={field.name} className="form-label">
                        Nomor Induk Kependudukan (NIK) <span className="text-danger">*</span>
                      </label>
                      <input
                        id={field.name}
                        name={field.name}
                        type="text"
                        className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                        placeholder="16 digit NIK sesuai KTP"
                        maxLength={16}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
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

                <form.Field name="namaLengkap">
                  {(field) => (
                    <div className="mb-3">
                      <label htmlFor={field.name} className="form-label">
                        Nama Lengkap <span className="text-danger">*</span>
                      </label>
                      <input
                        id={field.name}
                        name={field.name}
                        type="text"
                        className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                        placeholder="Sesuai KTP"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
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

                <form.Field name="email">
                  {(field) => (
                    <div className="mb-3">
                      <label htmlFor={field.name} className="form-label">
                        Alamat Email Aktif <span className="text-danger">*</span>
                      </label>
                      <input
                        id={field.name}
                        name={field.name}
                        type="email"
                        className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                        placeholder="nama@email.com"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
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

                <div className="row mb-3">
                  <div className="col-md-6 mb-2 mb-md-0">
                    <form.Field name="password">
                      {(field) => (
                        <div>
                          <label htmlFor={field.name} className="form-label">
                            Kata Sandi <span className="text-danger">*</span>
                          </label>
                          <input
                            id={field.name}
                            name={field.name}
                            type="password"
                            className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                            placeholder="Min. 6 karakter"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                          />
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
                  </div>
                  <div className="col-md-6">
                    <form.Field name="confirmPassword">
                      {(field) => (
                        <div>
                          <label htmlFor={field.name} className="form-label">
                            Konfirmasi Sandi <span className="text-danger">*</span>
                          </label>
                          <input
                            id={field.name}
                            name={field.name}
                            type="password"
                            className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                            placeholder="Ulangi sandi"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                          />
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
                  </div>
                </div>

                <form.Subscribe
                  selector={(state) => ({
                    isSubmitting: state.isSubmitting,
                  })}
                >
                  {({ isSubmitting }) => (
                    <button
                      type="submit"
                      className="btn btn-primary w-100"
                      disabled={isSubmitting || registerMutation.isPending}
                    >
                      {isSubmitting || registerMutation.isPending
                        ? "Mendaftarkan..."
                        : "Daftar Akun Baru"}
                    </button>
                  )}
                </form.Subscribe>
              </form>
            </div>
            <div className="modal-footer justify-content-center">
              <span className="small text-muted">
                Sudah punya akun?{" "}
                <button
                  type="button"
                  className="btn btn-link p-0 small text-decoration-none"
                  onClick={onSwitchToLogin}
                >
                  Login di sini
                </button>
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RegisterModal;
