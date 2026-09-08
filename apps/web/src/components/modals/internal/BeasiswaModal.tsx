import React, { useState } from "react";
import { toast } from "sonner";
import { appStore } from "@/lib/store";
import { useCreateBeasiswaMutation } from "@/hooks/use-master-queries";

interface BeasiswaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BeasiswaModal: React.FC<BeasiswaModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [namaPelatihan, setNamaPelatihan] = useState("");
  const [kuota, setKuota] = useState<number | "">("");
  const [metode, setMetode] = useState("Daring (Online)");
  const [deskripsi, setDeskripsi] = useState("");
  const [batasPendaftaran, setBatasPendaftaran] = useState("");
  const createMutation = useCreateBeasiswaMutation();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaPelatihan.trim()) {
      toast.error("Nama program beasiswa wajib diisi.");
      return;
    }
    if (!kuota || Number(kuota) <= 0) {
      toast.error("Kuota peserta minimal 1.");
      return;
    }

    try {
      await createMutation.mutateAsync({
        kodeBeasiswa: `PRG-${Date.now().toString().slice(-4)}`,
        namaPelatihan,
        deskripsi: deskripsi || "Program pelatihan kejuruan bersertifikat resmi.",
        kuota: Number(kuota),
        metode,
        batasPendaftaran: batasPendaftaran || "-",
        tglMulaiDaftar: new Date().toISOString(),
        tglSelesaiDaftar: "2026-12-31T23:59:59Z",
      });

      appStore.addBeasiswa({
        kodeBeasiswa: `PRG-${Date.now().toString().slice(-4)}`,
        namaPelatihan,
        deskripsi: deskripsi || "Program pelatihan kejuruan bersertifikat resmi.",
        kuota: Number(kuota),
        metode,
        batasPendaftaran: batasPendaftaran || "-",
        status: "buka",
        isActive: true,
        persyaratanKhusus: [
          "Warga Negara Indonesia (WNI), usia 18 - 35 tahun.",
          "Pendidikan minimal SMA/SMK sederajat.",
        ],
        dokumenWajib: ["Scan KTP & KK", "Scan Ijazah Terakhir", "Surat Rekomendasi"],
      });

      toast.success("Program beasiswa berhasil ditambahkan!");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Gagal menambahkan program beasiswa.");
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
              <h5 className="modal-title fw-bold">Tambah Program Beasiswa</h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
              ></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Nama Beasiswa Pelatihan</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: Pelatihan Cloud Architect"
                    value={namaPelatihan}
                    onChange={(e) => setNamaPelatihan(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Deskripsi Singkat</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Deskripsi materi program..."
                    value={deskripsi}
                    onChange={(e) => setDeskripsi(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Kuota Peserta</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Contoh: 50"
                    min={1}
                    value={kuota}
                    onChange={(e) => {
                      const val = e.target.value;
                      setKuota(val === "" ? "" : Math.max(1, Number(val)));
                    }}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Metode Pelaksanaan</label>
                  <select
                    className="form-select"
                    value={metode}
                    onChange={(e) => setMetode(e.target.value)}
                  >
                    <option value="Daring (Online)">Daring (Online)</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Luring (Offline)">Luring (Offline)</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Batas Akhir Pendaftaran</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: 31 Des 2026"
                    value={batasPendaftaran}
                    onChange={(e) => setBatasPendaftaran(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary w-100">
                  Simpan Program Beasiswa
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BeasiswaModal;
