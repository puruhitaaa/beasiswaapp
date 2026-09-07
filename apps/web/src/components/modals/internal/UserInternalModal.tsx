import React, { useState } from "react";
import { toast } from "sonner";
import { appStore } from "@/lib/store";

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
  const [role, setRole] = useState<"verifikator" | "interviewer" | "admin">("verifikator");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.includes("@")) {
      toast.error("Nama dan email valid wajib diisi.");
      return;
    }

    appStore.addInternalUser({
      name,
      username: email,
      email,
      role,
      status: "Active",
    });

    toast.success("Akun petugas internal berhasil ditambahkan!");
    onClose();
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
                <button type="submit" className="btn btn-primary w-100">
                  Simpan Akun Petugas
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
