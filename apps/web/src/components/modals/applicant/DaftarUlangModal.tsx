import React, { useState } from "react";
import { toast } from "sonner";
import { appStore } from "@/lib/store";

interface DaftarUlangModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendaftaranId: string;
  programName: string;
}

export const DaftarUlangModal: React.FC<DaftarUlangModalProps> = ({
  isOpen,
  onClose,
  pendaftaranId,
  programName,
}) => {
  const [kesediaan, setKesediaan] = useState<"bersedia" | "mengundurkan">("bersedia");
  const [catatan, setCatatan] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    appStore.confirmDaftarUlang(pendaftaranId, kesediaan, catatan);
    if (kesediaan === "bersedia") {
      toast.success("Konfirmasi kehadiran Anda telah berhasil tercatat. Silakan pantau grup koordinasi!");
    } else {
      toast.info("Konfirmasi pengunduran diri telah tercatat oleh panitia.");
    }
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
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header bg-success text-white">
              <h5 className="modal-title fw-bold">
                <i className="bi bi-check2-square me-2"></i>Konfirmasi Kehadiran / Daftar Ulang
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
              ></button>
            </div>
            <div className="modal-body">
              <p className="small text-muted">
                Silakan konfirmasi kesediaan Anda untuk mengikuti program{" "}
                <strong>{programName}</strong> hingga selesai.
              </p>
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Status Kesediaan</label>
                  <select
                    className="form-select"
                    value={kesediaan}
                    onChange={(e) => setKesediaan(e.target.value as "bersedia" | "mengundurkan")}
                  >
                    <option value="bersedia">Ya, Saya Bersedia Mengikuti Pelatihan</option>
                    <option value="mengundurkan">Saya Mengundurkan Diri</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold small">
                    Catatan Tambahan (Opsional)
                  </label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Catatan untuk panitia..."
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-success w-100">
                  Kirim Konfirmasi
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DaftarUlangModal;
