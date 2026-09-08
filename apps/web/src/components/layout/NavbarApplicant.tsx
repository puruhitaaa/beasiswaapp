import React, { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { appStore } from "@/lib/store";
import { authApi } from "@/lib/api";
import type { ApplicationStatus } from "@/types";

interface NavbarApplicantProps {
  userName?: string;
  onStatusChange?: (status: ApplicationStatus) => void;
  currentStatus?: ApplicationStatus;
}

export const NavbarApplicant: React.FC<NavbarApplicantProps> = ({
  userName = "Peserta",
  onStatusChange,
  currentStatus,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    authApi.logout();
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
          <span className="badge bg-light text-primary border py-2 px-3 fw-semibold">
            <i className="bi bi-info-circle me-1"></i>Status: {currentStatus || "DRAFT"}
          </span>

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
