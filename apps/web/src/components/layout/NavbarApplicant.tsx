import React, { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { appStore } from "@/lib/store";
import type { ApplicationStatus } from "@/types";

interface NavbarApplicantProps {
  userName?: string;
  onStatusChange?: (status: ApplicationStatus) => void;
  currentStatus?: ApplicationStatus;
}

export const NavbarApplicant: React.FC<NavbarApplicantProps> = ({
  userName = "Yosep Rohayadi",
  onStatusChange,
  currentStatus,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [testMenuOpen, setTestMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    appStore.setCurrentUser(null);
    navigate({ to: "/" });
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary sticky-top shadow-sm">
      <div className="container">
        <Link to="/applicant" className="navbar-brand fw-bold">
          <i className="bi bi-mortarboard-fill me-2"></i>BeasiswaApp
        </Link>
        <ul className="navbar-nav me-auto d-none d-md-flex">
          <li className="nav-item">
            <Link to="/applicant" className="nav-link active">
              <i className="bi bi-speedometer2 me-1"></i>Dashboard Saya
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/" className="nav-link">
              <i className="bi bi-grid me-1"></i>Katalog Program
            </Link>
          </li>
        </ul>

        <div className="d-flex align-items-center gap-2 ms-auto">
          {/* FSM Status Simulator Switcher for instant role/state inspection */}
          {onStatusChange && (
            <div className="dropdown position-relative">
              <button
                type="button"
                className="btn btn-sm btn-warning fw-semibold dropdown-toggle"
                onClick={() => setTestMenuOpen(!testMenuOpen)}
                title="Ganti Status Simulasi FSM"
              >
                <i className="bi bi-sliders2 me-1"></i>Status: {currentStatus || "DRAFT"}
              </button>
              {testMenuOpen && (
                <ul className="dropdown-menu dropdown-menu-end show shadow" style={{ minWidth: "220px" }}>
                  <li>
                    <h6 className="dropdown-header">Uji Kondisi Mockup Pelamar</h6>
                  </li>
                  <li>
                    <button
                      className={`dropdown-item ${currentStatus === "DRAFT" ? "active" : ""}`}
                      onClick={() => {
                        onStatusChange("DRAFT");
                        setTestMenuOpen(false);
                      }}
                    >
                      <i className="bi bi-journal-plus me-2"></i>1. DRAFT (2_index_awal)
                    </button>
                  </li>
                  <li>
                    <button
                      className={`dropdown-item ${currentStatus === "SUBMITTED" ? "active" : ""}`}
                      onClick={() => {
                        onStatusChange("SUBMITTED");
                        setTestMenuOpen(false);
                      }}
                    >
                      <i className="bi bi-lock-fill me-2"></i>2. SUBMITTED (3_index_terkirim)
                    </button>
                  </li>
                  <li>
                    <button
                      className={`dropdown-item ${currentStatus === "REVISI" ? "active" : ""}`}
                      onClick={() => {
                        onStatusChange("REVISI");
                        setTestMenuOpen(false);
                      }}
                    >
                      <i className="bi bi-pencil-square me-2 text-warning"></i>3. REVISI (4_index_revisi)
                    </button>
                  </li>
                  <li>
                    <button
                      className={`dropdown-item ${currentStatus === "TIDAK_LOLOS_ADMIN" ? "active" : ""}`}
                      onClick={() => {
                        onStatusChange("TIDAK_LOLOS_ADMIN");
                        setTestMenuOpen(false);
                      }}
                    >
                      <i className="bi bi-calendar-x me-2 text-danger"></i>4. DITUTUP / GUGUR (5_index)
                    </button>
                  </li>
                  <li>
                    <button
                      className={`dropdown-item ${currentStatus === "LULUS_DITERIMA" ? "active" : ""}`}
                      onClick={() => {
                        onStatusChange("LULUS_DITERIMA");
                        setTestMenuOpen(false);
                      }}
                    >
                      <i className="bi bi-trophy-fill me-2 text-success"></i>5. LULUS (6_index_lulus)
                    </button>
                  </li>
                </ul>
              )}
            </div>
          )}

          <div className="dropdown position-relative">
            <button
              className="btn btn-outline-light dropdown-toggle"
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <i className="bi bi-person-circle me-1"></i> {userName}
            </button>
            {dropdownOpen && (
              <ul className="dropdown-menu dropdown-menu-end show shadow">
                <li>
                  <span className="dropdown-item-text text-muted small">
                    Peran: Calon Peserta
                  </span>
                </li>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                <li>
                  <Link to="/" className="dropdown-item">
                    <i className="bi bi-house me-2"></i>Beranda Publik
                  </Link>
                </li>
                <li>
                  <button
                    className="dropdown-item text-danger"
                    onClick={handleLogout}
                  >
                    <i className="bi bi-box-arrow-right me-2"></i>Keluar (Logout)
                  </button>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavbarApplicant;
