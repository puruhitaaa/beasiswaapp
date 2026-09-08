import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { appStore } from "@/lib/store";
import { transaksiApi } from "@/lib/api";
import type { PendaftaranRecord } from "@/types";

interface WawancaraModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendaftaran: PendaftaranRecord | null;
  onSuccess?: () => void;
}

export const WawancaraModal: React.FC<WawancaraModalProps> = ({
  isOpen,
  onClose,
  pendaftaran,
  onSuccess,
}) => {
  const [skorKomunikasi, setSkorKomunikasi] = useState<number | "">("");
  const [skorTeknis, setSkorTeknis] = useState<number | "">("");
  const [skorKomitmen, setSkorKomitmen] = useState<number | "">("");
  const [statusWawancara, setStatusWawancara] = useState<"Lulus" | "Tidak Lulus">("Lulus");
  const [catatanEvaluasi, setCatatanEvaluasi] = useState("");

  useEffect(() => {
    if (pendaftaran) {
      if (pendaftaran.wawancara) {
        setSkorKomunikasi(pendaftaran.wawancara.skorKomunikasi);
        setSkorTeknis(pendaftaran.wawancara.skorTeknis);
        setSkorKomitmen(pendaftaran.wawancara.skorKomitmen);
        setStatusWawancara(pendaftaran.wawancara.statusHasil);
        setCatatanEvaluasi(pendaftaran.wawancara.catatanEvaluasi || "");
      } else {
        setSkorKomunikasi("");
        setSkorTeknis("");
        setSkorKomitmen("");
        setStatusWawancara("Lulus");
        setCatatanEvaluasi("");
      }
    }
  }, [pendaftaran]);

  if (!isOpen || !pendaftaran) return null;

  const numKomunikasi = typeof skorKomunikasi === "number" ? skorKomunikasi : 0;
  const numTeknis = typeof skorTeknis === "number" ? skorTeknis : 0;
  const numKomitmen = typeof skorKomitmen === "number" ? skorKomitmen : 0;

  // Formula exact: (K * 0.3) + (T * 0.4) + (M * 0.3)
  const nilaiAkhir = (
    numKomunikasi * 0.3 +
    numTeknis * 0.4 +
    numKomitmen * 0.3
  ).toFixed(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (skorKomunikasi === "" || skorTeknis === "" || skorKomitmen === "") {
      toast.error("Harap isi semua skor penilaian wawancara.");
      return;
    }
    if (!catatanEvaluasi.trim()) {
      toast.error("Catatan evaluasi wajib diisi.");
      return;
    }

    try {
      await transaksiApi.submitWawancaraScoring(pendaftaran.id, {
        skorKomunikasi: Number(skorKomunikasi),
        skorTeknis: Number(skorTeknis),
        skorKomitmen: Number(skorKomitmen),
        nilaiWawancara: Number(nilaiAkhir),
        statusHasil: statusWawancara,
        catatanEvaluasi,
      });

      appStore.submitWawancaraScoring(
        pendaftaran.id,
        Number(skorKomunikasi),
        Number(skorTeknis),
        Number(skorKomitmen),
        statusWawancara,
        catatanEvaluasi
      );

      toast.success(
        `Hasil wawancara berhasil disimpan! Nilai Akhir: ${nilaiAkhir} (${statusWawancara})`
      );
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan hasil penilaian wawancara.");
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
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header bg-primary text-white py-3">
              <div className="d-flex align-items-center">
                <div
                  className="bg-white text-primary rounded-circle p-2 me-3 d-flex align-items-center justify-content-center"
                  style={{ width: "45px", height: "45px" }}
                >
                  <i className="bi bi-chat-left-quote-fill fs-4"></i>
                </div>
                <div>
                  <h5 className="modal-title fw-bold mb-0">
                    Form Penilaian & Hasil Wawancara
                  </h5>
                  <small className="text-white-50">
                    Kode Pendaftaran: {pendaftaran.kodePermohonan}
                  </small>
                </div>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
              ></button>
            </div>

            <div className="modal-body p-4 bg-light">
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body bg-white rounded">
                  <div className="row g-2 small">
                    <div className="col-md-6">
                      <strong>Nama Peserta:</strong> {pendaftaran.userName}
                    </div>
                    <div className="col-md-6">
                      <strong>NIK:</strong> {pendaftaran.userNik}
                    </div>
                    <div className="col-md-6">
                      <strong>Program Pelatihan:</strong> {pendaftaran.beasiswaNama}
                    </div>
                    <div className="col-md-6">
                      <strong>Status Administrasi:</strong>{" "}
                      <span className="badge bg-success">Lolos Administrasi</span>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-header bg-white fw-bold text-primary border-bottom">
                    <i className="bi bi-clipboard-check me-2"></i>Seksi 1: Input Skor Penilaian
                    (Skala 0 - 100)
                  </div>
                  <div className="card-body bg-white">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">
                          Komunikasi & Sikap (30%)
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="0 - 100"
                          min={0}
                          max={100}
                          value={skorKomunikasi}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSkorKomunikasi(
                              val === "" ? "" : Math.max(0, Math.min(100, Number(val)))
                            );
                          }}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">
                          Pemahaman Teknis & Motivasi (40%)
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="0 - 100"
                          min={0}
                          max={100}
                          value={skorTeknis}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSkorTeknis(
                              val === "" ? "" : Math.max(0, Math.min(100, Number(val)))
                            );
                          }}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">
                          Komitmen & Kehadiran Pelatihan (30%)
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="0 - 100"
                          min={0}
                          max={100}
                          value={skorKomitmen}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSkorKomitmen(
                              val === "" ? "" : Math.max(0, Math.min(100, Number(val)))
                            );
                          }}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold text-primary">
                          Nilai Akhir (Kalkulasi Otomatis)
                        </label>
                        <input
                          type="text"
                          className="form-control fw-bold bg-light border-primary text-primary fs-5"
                          value={nilaiAkhir}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card border-primary shadow-sm mb-2">
                  <div className="card-header bg-primary text-white fw-bold">
                    <i className="bi bi-gavel me-2"></i>Seksi 2: Update Status Wawancara & Keputusan
                  </div>
                  <div className="card-body bg-white">
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label fw-bold">
                          Status Wawancara <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select form-select-lg border-primary"
                          value={statusWawancara}
                          onChange={(e) =>
                            setStatusWawancara(e.target.value as "Lulus" | "Tidak Lulus")
                          }
                          required
                        >
                          <option value="Lulus">Lulus Wawancara</option>
                          <option value="Tidak Lulus">Tidak Lulus Wawancara</option>
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-bold">
                          Catatan / Executive Summary Evaluasi{" "}
                          <span className="text-danger">*</span>
                        </label>
                        <textarea
                          className="form-control"
                          rows={3}
                          placeholder="Tuliskan catatan hasil wawancara, kelebihan, atau alasan keputusan..."
                          value={catatanEvaluasi}
                          onChange={(e) => setCatatanEvaluasi(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="modal-footer bg-white border-top justify-content-between">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                <i className="bi bi-x-circle me-1"></i>Batal
              </button>
              <button
                type="button"
                className="btn btn-success px-4 fw-bold"
                onClick={handleSubmit}
              >
                <i className="bi bi-send-check me-1"></i>Submit Hasil Wawancara
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WawancaraModal;
