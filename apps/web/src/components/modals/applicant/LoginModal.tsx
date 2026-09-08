import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useLoginMutation } from "@/hooks/use-auth-queries";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSwitchToRegister,
}) => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const loginMutation = useLoginMutation();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error("Harap isi email/username dan kata sandi.");
      return;
    }

    try {
      await loginMutation.mutateAsync({
        email: identifier,
        password,
        role: "applicant",
      });

      toast.success("Berhasil masuk ke Dashboard Calon Peserta!");
      onClose();
      navigate({ to: "/applicant" });
    } catch (err: any) {
      toast.error(err.message || "Gagal masuk. Periksa kembali akun Anda.");
    }
  };

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
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Email / Username</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Masukkan Email atau Username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Masukkan Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary w-100">
                  Masuk Kebagian Dashboard
                </button>
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
