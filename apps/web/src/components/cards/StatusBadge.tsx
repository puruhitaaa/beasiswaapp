import React from "react";
import type { ApplicationStatus } from "@/types";

interface StatusBadgeProps {
  status: ApplicationStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = "",
}) => {
  switch (status) {
    case "DRAFT":
      return (
        <span className={`badge bg-secondary ${className}`}>
          <i className="bi bi-pencil me-1"></i>Draft Belum Dikirim
        </span>
      );
    case "SUBMITTED":
    case "DALAM_PROSES_ADMIN":
      return (
        <span className={`badge bg-info text-dark ${className}`}>
          <i className="bi bi-hourglass-split me-1"></i>Proses Verifikasi
        </span>
      );
    case "REVISI":
      return (
        <span className={`badge bg-warning text-dark ${className}`}>
          <i className="bi bi-pencil-square me-1"></i>Revisi Berkas
        </span>
      );
    case "TIDAK_LOLOS_ADMIN":
      return (
        <span className={`badge bg-danger ${className}`}>
          <i className="bi bi-x-circle me-1"></i>Gugur Administrasi
        </span>
      );
    case "LOLOS_ADMIN":
      return (
        <span className={`badge bg-success ${className}`}>
          <i className="bi bi-check-circle me-1"></i>Lolos Administrasi
        </span>
      );
    case "DALAM_PROSES_WAWANCARA":
      return (
        <span className={`badge bg-warning text-dark ${className}`}>
          <i className="bi bi-chat-dots me-1"></i>Proses Wawancara
        </span>
      );
    case "TIDAK_LULUS_WAWANCARA":
      return (
        <span className={`badge bg-danger ${className}`}>
          <i className="bi bi-x-lg me-1"></i>Tidak Lulus Wawancara
        </span>
      );
    case "LULUS_DITERIMA":
      return (
        <span className={`badge bg-success badge-status ${className}`}>
          <i className="bi bi-trophy-fill me-1"></i>DITERIMA (LULUS)
        </span>
      );
    default:
      return <span className={`badge bg-secondary ${className}`}>{status}</span>;
  }
};

export default StatusBadge;
