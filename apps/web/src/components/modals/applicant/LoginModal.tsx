import React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import { useLoginMutation } from "@/hooks/use-auth-queries";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

const loginModalSchema = z.object({
  identifier: z.string().min(1, "Harap isi email atau username."),
  password: z.string().min(1, "Harap isi kata sandi."),
});

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSwitchToRegister,
}) => {
  const navigate = useNavigate();
  const loginMutation = useLoginMutation();

  const form = useForm({
    defaultValues: {
      identifier: "",
      password: "",
    },
    validators: {
      onSubmit: loginModalSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await loginMutation.mutateAsync({
          email: value.identifier,
          password: value.password,
          role: "applicant",
        });

        toast.success("Berhasil masuk ke Dashboard Calon Peserta!");
        onClose();
        navigate({ to: "/applicant" });
      } catch (err: any) {
        toast.error(err.message || "Gagal masuk. Periksa kembali akun Anda.");
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
                <i className="bi bi-box-arrow-in-right me-2"></i>Login Masuk
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
                <form.Field name="identifier">
                  {(field) => (
                    <div className="mb-3">
                      <label htmlFor={field.name} className="form-label">
                        Email / Username
                      </label>
                      <input
                        id={field.name}
                        name={field.name}
                        type="text"
                        className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                        placeholder="Masukkan Email atau Username"
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

                <form.Field name="password">
                  {(field) => (
                    <div className="mb-3">
                      <label htmlFor={field.name} className="form-label">
                        Password
                      </label>
                      <input
                        id={field.name}
                        name={field.name}
                        type="password"
                        className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                        placeholder="Masukkan Password"
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

                <form.Subscribe
                  selector={(state) => ({
                    isSubmitting: state.isSubmitting,
                  })}
                >
                  {({ isSubmitting }) => (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn btn-primary w-100"
                    >
                      {isSubmitting ? "Memproses..." : "Masuk Kebagian Dashboard"}
                    </button>
                  )}
                </form.Subscribe>
              </form>
            </div>
            <div className="modal-footer justify-content-center">
              <span className="small text-muted">
                Belum punya akun?{" "}
                <button
                  type="button"
                  className="btn btn-link p-0 small text-decoration-none"
                  onClick={onSwitchToRegister}
                >
                  Daftar di sini
                </button>
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginModal;
