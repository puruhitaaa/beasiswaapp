import React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { appStore } from "@/lib/store";
import { authApi } from "@/lib/api";

export type InternalRole = "verifikator" | "interviewer" | "admin";

interface SidebarInternalProps {
  role: InternalRole;
  activeTab?: string;
  onTabSelect?: (tabId: string) => void;
}

export const SidebarInternal: React.FC<SidebarInternalProps> = ({
  role,
  activeTab = "dashboard",
  onTabSelect,
}) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    authApi.logout();
    appStore.setCurrentUser(null);
    navigate({ to: "/login" });
  };

  return (
    <div className="sidebar d-flex flex-column p-3">
      {role === "verifikator" && (
        <div className="d-flex align-items-center mb-4 px-2 pt-2">
          <i className="bi bi-shield-check fs-2 me-2"></i>
          <div>
            <h6 className="fw-bold mb-0">PORTAL VERIFIKATOR</h6>
            <small className="text-white-50">Beasiswa App</small>
          </div>
        </div>
      )}

      {role === "interviewer" && (
        <div className="d-flex align-items-center mb-4 px-2 pt-2">
          <i className="bi bi-award-fill fs-2 me-2"></i>
          <div>
            <h6 className="fw-bold mb-0">LEMBAGA SELEKSI</h6>
            <small className="text-white-50">Beasiswa App</small>
          </div>
        </div>
      )}

      {role === "admin" && (
        <div className="d-flex align-items-center mb-3 px-2 pt-2">
          <i className="bi bi-gear-wide-connected fs-2 me-2"></i>
          <div>
            <h6 className="fw-bold mb-0">ADMINISTRATOR</h6>
            <small className="text-white-50">Portal Beasiswa</small>
          </div>
        </div>
      )}

      <hr className="text-white-50 mt-0" />

      {/* Nav Items */}
      <ul className="nav nav-pills flex-column mb-auto">
        {role === "verifikator" && (
          <li className="nav-item">
            <Link to="/verifikator" className="nav-link active">
              <i className="bi bi-file-earmark-check me-2"></i>Verifikasi Seleksi Administrasi
            </Link>
          </li>
        )}

        {role === "interviewer" && (
          <li className="nav-item">
            <Link to="/wawancara" className="nav-link active">
              <i className="bi bi-chat-square-text me-2"></i>Proses Wawancara
            </Link>
          </li>
        )}

        {role === "admin" && (
          <>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link text-start w-100 ${activeTab === "dashboard" ? "active" : ""}`}
                onClick={() => onTabSelect?.("dashboard")}
              >
                <i className="bi bi-speedometer2 me-2"></i>Dashboard
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link text-start w-100 ${activeTab === "hasil" ? "active" : ""}`}
                onClick={() => onTabSelect?.("hasil")}
              >
                <i className="bi bi-file-earmark-spreadsheet me-2"></i>Hasil Seleksi
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link text-start w-100 ${activeTab === "master" ? "active" : ""}`}
                onClick={() => onTabSelect?.("master")}
              >
                <i className="bi bi-database me-2"></i>Data Master
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link text-start w-100 ${activeTab === "setting" ? "active" : ""}`}
                onClick={() => onTabSelect?.("setting")}
              >
                <i className="bi bi-sliders me-2"></i>Setting System
              </button>
            </li>
          </>
        )}

        {/* Quick switcher to explore other roles */}
        <li className="nav-item mt-4 pt-3 border-top border-white-50">
          <small className="text-white-50 px-2 text-uppercase" style={{ fontSize: "0.7rem" }}>
            Pindah Portal (Demo)
          </small>
        </li>
        <li>
          <Link
            to="/applicant"
            className="nav-link text-white-50 py-1"
            style={{ fontSize: "0.85rem" }}
          >
            <i className="bi bi-person me-2"></i>Portal Calon Peserta
          </Link>
        </li>
        <li>
          <Link
            to="/verifikator"
            className={`nav-link ${role === "verifikator" ? "text-white" : "text-white-50"} py-1`}
            style={{ fontSize: "0.85rem" }}
          >
            <i className="bi bi-shield-check me-2"></i>Portal Verifikator
          </Link>
        </li>
        <li>
          <Link
            to="/wawancara"
            className={`nav-link ${role === "interviewer" ? "text-white" : "text-white-50"} py-1`}
            style={{ fontSize: "0.85rem" }}
          >
            <i className="bi bi-award me-2"></i>Portal Lembaga Seleksi
          </Link>
        </li>
        <li>
          <Link
            to="/admin"
            className={`nav-link ${role === "admin" ? "text-white" : "text-white-50"} py-1`}
            style={{ fontSize: "0.85rem" }}
          >
            <i className="bi bi-gear-wide-connected me-2"></i>Portal Administrator
          </Link>
        </li>
      </ul>

      <hr className="text-white-50" />
      <div className="px-2">
        <button
          type="button"
          onClick={handleLogout}
          className="nav-link text-white bg-danger bg-opacity-75 w-100 text-start border-0"
        >
          <i className="bi bi-box-arrow-right me-2"></i>Logout
        </button>
      </div>
    </div>
  );
};

export default SidebarInternal;
