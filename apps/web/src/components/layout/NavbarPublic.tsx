import React, { useState } from "react";
import { Link } from "@tanstack/react-router";

interface NavbarPublicProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
}

export const NavbarPublic: React.FC<NavbarPublicProps> = ({
  onOpenLogin,
  onOpenRegister,
}) => {
  const [navCollapsed, setNavCollapsed] = useState(true);

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
        </div>
      </div>
    </nav>
  );
};

export default NavbarPublic;
