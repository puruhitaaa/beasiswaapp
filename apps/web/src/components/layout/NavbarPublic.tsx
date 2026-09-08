import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { appStore, useCurrentUser } from "@/lib/store";
import { authApi } from "@/lib/api";

interface NavbarPublicProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
}

export const NavbarPublic: React.FC<NavbarPublicProps> = ({
  onOpenLogin,
  onOpenRegister,
}) => {
  const [navCollapsed, setNavCollapsed] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const currentUser = useCurrentUser();

  const handleLogout = () => {
    authApi.logout();
    appStore.setCurrentUser(null);
    setUserMenuOpen(false);
    toast.success("Anda telah berhasil keluar.");
  };

  const getDashboardRoute = (role?: string) => {
    if (role === "admin") return "/admin";
    if (role === "verifikator") return "/verifikator";
    if (role === "interviewer") return "/wawancara";
    return "/applicant";
  };

  const getDashboardLabel = (role?: string) => {
    if (role === "admin") return "Portal Admin";
    if (role === "verifikator") return "Portal Verifikator";
    if (role === "interviewer") return "Portal Pewawancara";
    return "Dashboard Saya";
  };

  const getRoleBadge = (role?: string) => {
    if (role === "admin") return "Administrator";
    if (role === "verifikator") return "Petugas Verifikator";
    if (role === "interviewer") return "Lembaga Seleksi";
    return "Calon Peserta";
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary sticky-top shadow-sm">
      <div className="container">
        <Link to="/" className="navbar-brand fw-bold">
          <i className="bi bi-mortarboard-fill me-2"></i>BeasiswaApp
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          onClick={() => setNavCollapsed(!navCollapsed)}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className={`collapse navbar-collapse ${navCollapsed ? "" : "show"}`} id="navbarNav">
          <ul className="navbar-nav ms-auto me-3">
            <li className="nav-item">
              <a className="nav-link active" href="#home">
                Beranda
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="#program">
                Program Beasiswa
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="#persyaratan">
                Persyaratan Umum
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="#alur">
                Alur Pendaftaran
              </a>
            </li>
          </ul>

          {currentUser ? (
            <div className="d-flex gap-2 align-items-center">
              <Link
                to={getDashboardRoute(currentUser.role)}
                className="btn btn-warning text-dark fw-bold btn-sm px-3"
              >
                <i className="bi bi-speedometer2 me-1"></i>
                {getDashboardLabel(currentUser.role)}
              </Link>

              <div className="dropdown position-relative">
                <button
                  className="btn btn-outline-light btn-sm dropdown-toggle"
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <i className="bi bi-person-circle me-1"></i> {currentUser.name}
                </button>
                {userMenuOpen && (
                  <ul className="dropdown-menu dropdown-menu-end show shadow">
                    <li>
                      <span className="dropdown-item-text text-muted small">
                        Peran: {getRoleBadge(currentUser.role)}
                      </span>
                    </li>
                    <li>
                      <span
                        className="dropdown-item-text text-muted small text-truncate d-inline-block"
                        style={{ maxWidth: "200px" }}
                      >
                        {currentUser.email}
                      </span>
                    </li>
                    <li>
                      <hr className="dropdown-divider" />
                    </li>
                    <li>
                      <Link
                        to={getDashboardRoute(currentUser.role)}
                        className="dropdown-item"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <i className="bi bi-grid-fill me-2 text-primary"></i>
                        {getDashboardLabel(currentUser.role)}
                      </Link>
                    </li>
                    <li>
                      <button
                        type="button"
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
          ) : (
            <div className="d-flex gap-2 align-items-center">
              <button
                type="button"
                className="btn btn-outline-light"
                onClick={onOpenLogin}
              >
                Masuk
              </button>
              <button
                type="button"
                className="btn btn-light text-primary fw-semibold"
                onClick={onOpenRegister}
              >
                Daftar Akun
              </button>
              <Link
                to="/login"
                className="btn btn-sm btn-outline-light opacity-75 ms-1"
                title="Portal Petugas Internal"
              >
                <i className="bi bi-shield-lock-fill"></i>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavbarPublic;
