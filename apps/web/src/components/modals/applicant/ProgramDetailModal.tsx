import React from "react";
import type { BeasiswaProgram } from "@/types";

interface ProgramDetailModalProps {
  program: BeasiswaProgram | null;
  isOpen: boolean;
  onClose: () => void;
  onDaftar: (program: BeasiswaProgram) => void;
}

export const ProgramDetailModal: React.FC<ProgramDetailModalProps> = ({
  program,
  isOpen,
  onClose,
  onDaftar,
}) => {
  if (!isOpen || !program) return null;

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title fw-bold">{program.namaPelatihan}</h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
              ></button>
            </div>
            <div className="modal-body">
              <h6 className="fw-bold">Deskripsi Program</h6>
              <p className="text-muted small">{program.deskripsi}</p>

              <div className="row g-2 mb-3 bg-light p-3 rounded">
                <div className="col-md-4">
                  <small className="text-muted d-block">Metode Pelaksanaan</small>
                  <strong>{program.metode}</strong>
                </div>
                <div className="col-md-4">
                  <small className="text-muted d-block">Batas Pendaftaran</small>
                  <strong>{program.batasPendaftaran}</strong>
                </div>
                <div className="col-md-4">
                  <small className="text-muted d-block">Total Kuota</small>
                  <strong>{program.kuota} Peserta</strong>
                </div>
              </div>

              <h6 className="fw-bold mt-3">Persyaratan Khusus</h6>
              <ul className="text-muted small">
                {program.persyaratanKhusus?.map((syarat, i) => (
                  <li key={i}>{syarat}</li>
                )) || (
                  <>
                    <li>Warga Negara Indonesia (WNI), usia 18 - 35 tahun.</li>
                    <li>
                      Pendidikan minimal SMA/SMK sederajat (Diutamakan jurusan
                      terkait).
                    </li>
                    <li>Memiliki laptop/komputer pribadi yang memadai.</li>
                  </>
                )}
              </ul>

              <h6 className="fw-bold mt-3">Dokumen yang Wajib Diunggah</h6>
              <ul className="text-muted small">
                {program.dokumenWajib?.map((dok, i) => (
                  <li key={i}>{dok}</li>
                )) || (
                  <>
                    <li>Scan KTP & KK (Maks. 2MB, PDF/JPG/PNG)</li>
                    <li>Scan Ijazah Terakhir</li>
                    <li>Surat Rekomendasi / Keterangan Bebas Kerja / Kuliah</li>
                  </>
                )}
              </ul>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Tutup
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onDaftar(program);
                  onClose();
                }}
              >
                Daftar Beasiswa Ini
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProgramDetailModal;
