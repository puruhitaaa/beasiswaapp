import React from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import { useCreateInternalUserMutation } from "@/hooks/use-auth-queries";

interface UserInternalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const userInternalSchema = z.object({
  name: z.string().min(1, "Nama lengkap petugas wajib diisi."),
  email: z.string().email("Format email tidak valid."),
  password: z.string().min(8, "Kata sandi minimal 8 karakter."),
  role: z.enum(["verifikator", "interviewer", "admin"]),
});

export const UserInternalModal: React.FC<UserInternalModalProps> = ({
  isOpen,
  onClose,
}) => {
  const createMutation = useCreateInternalUserMutation();

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "verifikator" as "verifikator" | "interviewer" | "admin",
    },
    validators: {
      onSubmit: userInternalSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await createMutation.mutateAsync({
          name: value.name,
          email: value.email,
          password: value.password,
          role: value.role,
        });

        toast.success("Akun petugas internal berhasil ditambahkan!");
        form.reset();
        onClose();
      } catch (err: any) {
        toast.error(err.message || "Gagal menambahkan akun petugas.");
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
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header bg-primary text-white">
              <h5 className="modal-title fw-bold">Tambah Petugas Internal</h5>
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
                <form.Field name="name">
                  {(field) => (
                    <div className="mb-3">
                      <label htmlFor={field.name} className="form-label">
                        Nama Lengkap Petugas
                      </label>
                      <input
                        id={field.name}
                        name={field.name}
                        type="text"
                        className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                        placeholder="Contoh: Budi Prasetyo"
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
                        Email / NIP Instansi
                      </label>
                      <input
                        id={field.name}
                        name={field.name}
                        type="email"
                        className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                        placeholder="budi@beasiswa.go.id"
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
                        Kata Sandi Akses
                      </label>
                      <input
                        id={field.name}
                        name={field.name}
                        type="password"
                        className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                        placeholder="Minimal 8 karakter"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        minLength={8}
                      />
                      <div className="form-text">
                        Kata sandi awal untuk masuk ke sistem.
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

                <form.Field name="role">
                  {(field) => (
                    <div className="mb-3">
                      <label htmlFor={field.name} className="form-label">
                        Role Akses Sistem
                      </label>
                      <select
                        id={field.name}
                        name={field.name}
                        className="form-select"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) =>
                          field.handleChange(
                            e.target.value as "verifikator" | "interviewer" | "admin"
                          )
                        }
                      >
                        <option value="verifikator">Verifikator Administrasi</option>
                        <option value="interviewer">Lembaga Seleksi (Wawancara)</option>
                        <option value="admin">Administrator System</option>
                      </select>
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
                      className="btn btn-primary w-100"
                      disabled={isSubmitting || createMutation.isPending}
                    >
                      {isSubmitting || createMutation.isPending
                        ? "Menyimpan..."
                        : "Simpan Akun Petugas"}
                    </button>
                  )}
                </form.Subscribe>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserInternalModal;
