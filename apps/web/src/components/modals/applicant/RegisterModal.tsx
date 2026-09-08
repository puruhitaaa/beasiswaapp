import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useRegisterMutation } from "@/hooks/use-auth-queries";
import { useInitApplicationMutation } from "@/hooks/use-transaksi-queries";

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
  targetProgramId?: string;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  onSwitchToLogin,
  targetProgramId,
}) => {
  const [nik, setNik] = useState("");
  const [namaLengkap, setNamaLengkap] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();
  const registerMutation = useRegisterMutation();
  const initApplicationMutation = useInitApplicationMutation();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!/^\d{16}$/.test(nik)) {
      toast.error("NIK harus tepat 16 digit angka sesuai KTP.");
      return;
    }
    if (namaLengkap.trim().length < 3) {
      toast.error("Nama lengkap minimal 3 karakter.");
      return;
    }
    if (!email.includes("@")) {
      toast.error("Format email tidak valid.");
      return;
    }
    if (password.length < 6) {
      toast.error("Kata sandi minimal 6 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    try {
      await registerMutation.mutateAsync({
        nik,
        name: namaLengkap,
        email,
        password,
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
                <i className="bi bi-person-plus-fill me-2"></i>Daftar Akun Peserta
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
                  <label className="form-label">
                    Nomor Induk Kependudukan (NIK) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="16 digit NIK sesuai KTP"
                    maxLength={16}
                    value={nik}
                    onChange={(e) => setNik(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    Nama Lengkap <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Sesuai KTP"
                    value={namaLengkap}
                    onChange={(e) => setNamaLengkap(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    Alamat Email Aktif <span className="text-danger">*</span>
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="row mb-3">
                  <div className="col-md-6 mb-2 mb-md-0">
                    <label className="form-label">
                      Kata Sandi <span className="text-danger">*</span>
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Min. 6 karakter"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">
                      Konfirmasi Sandi <span className="text-danger">*</span>
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Ulangi sandi"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? "Mendaftarkan..." : "Daftar Akun Baru"}
                </button>
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
