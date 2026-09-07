import React from "react";
import type { BeasiswaProgram } from "@/types";

interface ProgramCardProps {
  program: BeasiswaProgram;
  mode?: "public" | "applicant";
  isSelected?: boolean;
  isLockedDueToOtherActive?: boolean;
  onSelect?: (program: BeasiswaProgram) => void;
  onOpenWizard?: () => void;
}

export const ProgramCard: React.FC<ProgramCardProps> = ({
  program,
  mode = "public",
  isSelected = false,
  isLockedDueToOtherActive = false,
  onSelect,
  onOpenWizard,
}) => {
  const isClosed = program.status === "ditutup" || !program.isActive;

  // 1. Program selected by user in applicant portal
  if (mode === "applicant" && isSelected) {
    return (
      <div className="card border-primary shadow-sm h-100">
        <div className="card-body">
          <span className="badge bg-primary mb-2">
            <i className="bi bi-check-circle-fill me-1"></i>Program Pilihan Anda
          </span>
          <h6 className="card-title fw-bold">{program.namaPelatihan}</h6>
          <p className="card-text text-muted small">{program.deskripsi}</p>
        </div>
        <div className="card-footer bg-transparent border-0 pb-3">
          <button
            type="button"
            className="btn btn-outline-primary w-100 btn-sm"
            onClick={onOpenWizard}
          >
            <i className="bi bi-eye me-1"></i>Lihat / Edit Form Pendaftaran
          </button>
        </div>
      </div>
    );
  }

  // 2. Program locked in applicant portal due to 1-active-app rule
  if (mode === "applicant" && isLockedDueToOtherActive) {
    return (
      <div className="card border-0 shadow-sm h-100 card-disabled">
        <div className="card-body">
          <span className="badge bg-secondary mb-2">Pendaftaran Aktif</span>
          <h6 className="card-title fw-bold text-muted">{program.namaPelatihan}</h6>
          <p className="card-text text-muted small">{program.deskripsi}</p>
        </div>
        <div className="card-footer bg-transparent border-0 pb-3">
          <button
            type="button"
            className="btn btn-secondary w-100 btn-sm"
            disabled
            title="Anda sudah mendaftar pada pelatihan lain"
          >
            <i className="bi bi-lock me-1"></i>Batas Pendaftaran Tercapai
          </button>
        </div>
      </div>
    );
  }

  // 3. Closed program
  if (isClosed) {
    return (
      <div className="card border-0 shadow-sm h-100 card-closed">
        <div className="card-body">
          <span className="badge bg-danger mb-2">
            <i className="bi bi-lock-fill me-1"></i>Pendaftaran Ditutup
          </span>
          <h6 className="card-title fw-bold text-muted">{program.namaPelatihan}</h6>
          <p className="card-text text-muted small">{program.deskripsi}</p>
          <hr />
          <ul className="list-unstyled small text-muted mb-0">
            <li>
              <i className="bi bi-calendar-event me-2"></i>
              <strong>Batas Akhir:</strong> {program.batasPendaftaran}
            </li>
            <li>
              <i className="bi bi-people me-2"></i>
              <strong>Kuota:</strong> Terpenuhi
            </li>
          </ul>
        </div>
        <div className="card-footer bg-transparent border-0 pb-3">
          <button type="button" className="btn btn-secondary w-100 btn-sm" disabled>
            <i className="bi bi-slash-circle me-1"></i>Pendaftaran Ditutup
          </button>
        </div>
      </div>
    );
  }

  // 4. Default Public active card
  return (
    <div className="card h-100 border-0 shadow-sm card-program">
      <div className="card-body">
        {program.status === "segera_tutup" ? (
          <span className="badge bg-danger mb-2">
            <i className="bi bi-x-circle me-1"></i>Segera Ditutup
          </span>
        ) : (
          <span className="badge bg-success mb-2">
            <i className="bi bi-clock me-1"></i>Pendaftaran Dibuka
          </span>
        )}
        <h5 className="card-title fw-bold">{program.namaPelatihan}</h5>
        <p className="card-text text-muted small">{program.deskripsi}</p>
        <hr />
        <ul className="list-unstyled small mb-4">
          <li className="mb-1">
            <i className="bi bi-calendar-event me-2 text-primary"></i>
            <strong>Batas Pendaftaran:</strong> {program.batasPendaftaran}
          </li>
          <li className="mb-1">
            <i className="bi bi-geo-alt me-2 text-primary"></i>
            <strong>Metode:</strong> {program.metode}
          </li>
          <li>
            <i className="bi bi-people me-2 text-primary"></i>
            <strong>Kuota:</strong> {program.kuota} Peserta
          </li>
        </ul>
      </div>
      <div className="card-footer bg-transparent border-0 pb-3">
        <button
          type="button"
          className="btn btn-primary w-100"
          onClick={() => onSelect?.(program)}
        >
          Lihat Detail & Daftar
        </button>
      </div>
    </div>
  );
};

export default ProgramCard;
