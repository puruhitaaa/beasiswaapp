import React, { useState } from "react";
import { toast } from "sonner";
import { useCreateInternalUserMutation } from "@/hooks/use-auth-queries";

interface UserInternalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserInternalModal: React.FC<UserInternalModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"verifikator" | "interviewer" | "admin">("verifikator");
  const createMutation = useCreateInternalUserMutation();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.includes("@")) {
      toast.error("Nama dan email valid wajib diisi.");
      return;
    }
    if (!password || password.length < 8) {
      toast.error("Kata sandi minimal 8 karakter.");
      return;
    }

    try {
      await createMutation.mutateAsync({
        name,
        email,
        password,
        role,
      });

      toast.success("Akun petugas internal berhasil ditambahkan!");
      setName("");
      setEmail("");
      setPassword("");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Gagal menambahkan akun petugas.");
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
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Nama Lengkap Petugas</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: Budi Prasetyo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Email / NIP Instansi</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="budi@beasiswa.go.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Kata Sandi Akses</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Minimal 8 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <div className="form-text">
                    Kata sandi awal untuk masuk ke sistem.
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Role Akses Sistem</label>
                  <select
                    className="form-select"
                    value={role}
                    onChange={(e) =>
                      setRole(
                        e.target.value as "verifikator" | "interviewer" | "admin"
                      )
                    }
                  >
                    <option value="verifikator">Verifikator Administrasi</option>
                    <option value="interviewer">Lembaga Seleksi (Wawancara)</option>
                    <option value="admin">Administrator System</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Menyimpan..." : "Simpan Akun Petugas"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserInternalModal;
