import React, { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { appStore } from "@/lib/store";
import { SidebarInternal } from "@/components/layout/SidebarInternal";
import { PageHeaderInternal } from "@/components/layout/PageHeaderInternal";
import { BeasiswaModal } from "@/components/modals/internal/BeasiswaModal";
import { PersyaratanModal } from "@/components/modals/internal/PersyaratanModal";
import { UserInternalModal } from "@/components/modals/internal/UserInternalModal";
import { RolePermissionModal } from "@/components/modals/internal/RolePermissionModal";
import {
  useBeasiswaList,
  useDeleteBeasiswaMutation,
  usePersyaratanList,
  useDeletePersyaratanMutation,
} from "@/hooks/use-master-queries";
import {
  useAllApplications,
  useAdminStatistics,
  useExportExcelMutation,
} from "@/hooks/use-transaksi-queries";
import { useInternalUsers, useRoles, useMenus } from "@/hooks/use-auth-queries";
import type {
  MasterRole,
  PendaftaranRecord,
  BeasiswaProgram,
  MasterPersyaratan,
  UserInternal,
  MasterMenu,
} from "@/types";

export const Route = createFileRoute("/admin")({
  component: AdminPageComponent,
});

function AdminPageComponent() {
  const navigate = useNavigate();
  const currentUser = appStore.getCurrentUser();

  // Authentication & Role Route Guard
  useEffect(() => {
    if (!currentUser || currentUser.role !== "admin") {
      toast.error("Akses ditolak. Halaman ini hanya untuk Administrator.");
      navigate({ to: "/login" });
    }
  }, [currentUser, navigate]);

  const [activeTab, setActiveTab] = useState<"dashboard" | "hasil" | "master" | "setting">("dashboard");
  const [masterSubTab, setMasterSubTab] = useState<"beasiswa" | "syarat">("beasiswa");
  const [settingSubTab, setSettingSubTab] = useState<"user" | "role" | "menu">("user");

  // Modal open states
  const [isBeasiswaModalOpen, setIsBeasiswaModalOpen] = useState(false);
  const [isSyaratModalOpen, setIsSyaratModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<MasterRole | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  // TanStack Query Data Streams
  const { data: pendaftarList = [] } = useAllApplications();
  const { data: beasiswaList = [] } = useBeasiswaList();
  const { data: userList = [] } = useInternalUsers();
  const { data: roleList = [] } = useRoles();
  const { data: menuList = [] } = useMenus();
  const { data: backendStats } = useAdminStatistics();
  const { data: persyaratanList = [] } = usePersyaratanList();

  const deleteBeasiswaMutation = useDeleteBeasiswaMutation();
  const deletePersyaratanMutation = useDeletePersyaratanMutation();
  const exportExcelMutation = useExportExcelMutation();

  // Export to Excel / CSV format
  const handleExportExcel = async () => {
    try {
      await exportExcelMutation.mutateAsync();
      toast.success("File Rekap Hasil Seleksi berhasil diexport!");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunduh file rekap hasil seleksi.");
    }
  };

  const handleDeleteBeasiswa = async (id: string) => {
    try {
      await deleteBeasiswaMutation.mutateAsync(id);
      appStore.deleteBeasiswa(id);
      toast.success("Program beasiswa berhasil dinonaktifkan!");
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus program beasiswa.");
    }
  };

  const handleDeletePersyaratan = async (id: string) => {
    try {
      await deletePersyaratanMutation.mutateAsync(id);
      appStore.deletePersyaratan(id);
      toast.success("Persyaratan berhasil dihapus.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus persyaratan.");
    }
  };

  // Metrics calculation
  const totalPeserta = backendStats?.totalPeserta ?? pendaftarList.length;
  const prosesAdministrasi =
    backendStats?.prosesAdministrasi ??
    pendaftarList.filter(
      (p) =>
        p.status === "SUBMITTED" ||
        p.status === "REVISI" ||
        p.status === "DALAM_PROSES_ADMIN"
    ).length;
  const lulusAdministrasi =
    backendStats?.lolosAdministrasi ??
    pendaftarList.filter(
      (p) =>
        p.status === "LOLOS_ADMIN" ||
        p.status === "DALAM_PROSES_WAWANCARA" ||
        p.status === "LULUS_DITERIMA"
    ).length;
  const tidakLulusAdministrasi =
    backendStats?.gugurAdministrasi ??
    pendaftarList.filter((p) => p.status === "TIDAK_LOLOS_ADMIN").length;
  const prosesWawancara =
    backendStats?.prosesWawancara ??
    pendaftarList.filter(
      (p) => p.status === "LOLOS_ADMIN" && !p.wawancara?.nilaiWawancara
    ).length;
  const lulusWawancara =
    backendStats?.lulusWawancara ??
    pendaftarList.filter(
      (p) =>
        p.wawancara?.statusHasil === "Lulus" || p.status === "LULUS_DITERIMA"
    ).length;
  const tidakLulusWawancara =
    backendStats?.gagalWawancara ??
    pendaftarList.filter(
      (p) =>
        p.wawancara?.statusHasil === "Tidak Lulus" ||
        p.status === "TIDAK_LULUS_WAWANCARA"
    ).length;

  if (!currentUser || currentUser.role !== "admin") {
    return null;
  }

  return (
    <div className="d-flex min-vh-100 bg-light">
      {/* Sidebar Admin */}
      <SidebarInternal
        role="admin"
        activeTab={activeTab}
        onTabSelect={(tab) => setActiveTab(tab as "dashboard" | "hasil" | "master" | "setting")}
      />

      {/* Main Content Area */}
      <div className="main-content flex-grow-1">
        {/* Header */}
        <PageHeaderInternal
          title="Panel Administrator"
          subtitle="Manajemen Sistem Pendaftaran & Seleksi Beasiswa Pelatihan"
          badgeIcon="bi-person-fill-gear"
          badgeText={`Admin: ${currentUser?.name || "Yosep Rohayadi"}`}
        />

        {/* TAB 1: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="tab-pane fade show active">
            <h5 className="fw-bold mb-3">
              <i className="bi bi-bar-chart-line me-2 text-primary"></i>
              Ringkasan Statistik Pendaftaran
            </h5>

            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <div className="card card-stat bg-primary text-white p-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <small className="text-white-50">Total Calon Peserta</small>
                      <h2 className="fw-bold mb-0">{totalPeserta}</h2>
                    </div>
                    <i className="bi bi-people-fill fs-1 opacity-50"></i>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card card-stat bg-info text-white p-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <small className="text-white-50">Proses Administrasi</small>
                      <h2 className="fw-bold mb-0">{prosesAdministrasi}</h2>
                    </div>
                    <i className="bi bi-hourglass-split fs-1 opacity-50"></i>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card card-stat bg-success text-white p-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <small className="text-white-50">Lulus Administrasi</small>
                      <h2 className="fw-bold mb-0">{lulusAdministrasi}</h2>
                    </div>
                    <i className="bi bi-check-circle-fill fs-1 opacity-50"></i>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card card-stat bg-danger text-white p-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <small className="text-white-50">Tidak Lulus Administrasi</small>
                      <h2 className="fw-bold mb-0">{tidakLulusAdministrasi}</h2>
                    </div>
                    <i className="bi bi-x-circle-fill fs-1 opacity-50"></i>
                  </div>
                </div>
              </div>

              <div className="col-md-4">
                <div className="card card-stat bg-warning text-dark p-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <small className="text-dark-50">Proses Wawancara</small>
                      <h2 className="fw-bold mb-0">{prosesWawancara}</h2>
                    </div>
                    <i className="bi bi-chat-dots-fill fs-1 opacity-50"></i>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card card-stat bg-success text-white p-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <small className="text-white-50">Lulus Wawancara</small>
                      <h2 className="fw-bold mb-0">{lulusWawancara}</h2>
                    </div>
                    <i className="bi bi-trophy-fill fs-1 opacity-50"></i>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card card-stat bg-secondary text-white p-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <small className="text-white-50">Tidak Lulus Wawancara</small>
                      <h2 className="fw-bold mb-0">{tidakLulusWawancara}</h2>
                    </div>
                    <i className="bi bi-person-x-fill fs-1 opacity-50"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: HASIL SELEKSI & EXCEL EXPORT */}
        {activeTab === "hasil" && (
          <div className="tab-pane fade show active">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white py-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
                <h5 className="fw-bold mb-0">
                  <i className="bi bi-trophy me-2 text-primary"></i>
                  Hasil Kelulusan Peserta (Wawancara & Final)
                </h5>
                <button className="btn btn-success fw-bold" onClick={handleExportExcel}>
                  <i className="bi bi-file-earmark-excel me-1"></i> Export Excel
                </button>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: "5%" }}>No</th>
                        <th style={{ width: "25%" }}>NIK & Nama Peserta</th>
                        <th style={{ width: "25%" }}>Program Pelatihan</th>
                        <th style={{ width: "15%" }}>Status Administrasi</th>
                        <th style={{ width: "12%" }}>Nilai Wawancara</th>
                        <th style={{ width: "13%" }}>Status Wawancara</th>
                        <th style={{ width: "15%" }}>Status Final</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendaftarList.map((p, idx) => {
                        const isLolosAdm =
                          p.status === "LOLOS_ADMIN" ||
                          p.status === "DALAM_PROSES_WAWANCARA" ||
                          p.status === "LULUS_DITERIMA";
                        const isDiterima = p.status === "LULUS_DITERIMA";
                        return (
                          <tr key={p.id}>
                            <td>{idx + 1}</td>
                            <td>
                              <strong>{p.biodata?.namaLengkap || p.userName}</strong>
                              <br />
                              <small className="text-muted">
                                NIK: {p.biodata?.nik || p.userNik}
                              </small>
                            </td>
                            <td>{p.beasiswaNama}</td>
                            <td>
                              {isLolosAdm ? (
                                <span className="badge bg-success">Lolos</span>
                              ) : p.status === "TIDAK_LOLOS_ADMIN" ? (
                                <span className="badge bg-danger">Ditolak</span>
                              ) : (
                                <span className="badge bg-secondary">Diproses</span>
                              )}
                            </td>
                            <td>
                              <strong>
                                {p.wawancara?.nilaiWawancara
                                  ? p.wawancara.nilaiWawancara.toFixed(2)
                                  : "-"}
                              </strong>
                            </td>
                            <td>
                              {p.wawancara?.statusHasil === "Lulus" ? (
                                <span className="badge bg-success">Lulus Wawancara</span>
                              ) : p.wawancara?.statusHasil === "Tidak Lulus" ? (
                                <span className="badge bg-danger">Tidak Lulus</span>
                              ) : (
                                <span className="badge bg-secondary">Belum Wawancara</span>
                              )}
                            </td>
                            <td>
                              {isDiterima ? (
                                <span className="badge bg-success">
                                  <i className="bi bi-award me-1"></i>DITERIMA
                                </span>
                              ) : p.status === "TIDAK_LULUS_WAWANCARA" ||
                                p.status === "TIDAK_LOLOS_ADMIN" ? (
                                <span className="badge bg-danger">TIDAK DITERIMA</span>
                              ) : (
                                <span className="badge bg-info text-dark">PROSES SELEKSI</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DATA MASTER */}
        {activeTab === "master" && (
          <div className="tab-pane fade show active">
            <ul className="nav nav-tabs mb-3" role="tablist">
              <li className="nav-item">
                <button
                  className={`nav-link fw-bold ${masterSubTab === "beasiswa" ? "active" : ""}`}
                  onClick={() => setMasterSubTab("beasiswa")}
                >
                  CRUD Beasiswa Pelatihan
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link fw-bold ${masterSubTab === "syarat" ? "active" : ""}`}
                  onClick={() => setMasterSubTab("syarat")}
                >
                  CRUD Persyaratan
                </button>
              </li>
            </ul>

            {/* Subtab Beasiswa */}
            {masterSubTab === "beasiswa" && (
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                  <h6 className="fw-bold mb-0">Master Data Beasiswa Pelatihan</h6>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setIsBeasiswaModalOpen(true)}
                  >
                    <i className="bi bi-plus-lg me-1"></i>Tambah Beasiswa
                  </button>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Nama Beasiswa Pelatihan</th>
                          <th>Kuota</th>
                          <th>Metode</th>
                          <th>Status</th>
                          <th className="text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {beasiswaList.map((b) => (
                          <tr key={b.id}>
                            <td>
                              <strong>{b.namaPelatihan}</strong>
                              <br />
                              <small className="text-muted">{b.kodeBeasiswa}</small>
                            </td>
                            <td>{b.kuota} Peserta</td>
                            <td>{b.metode}</td>
                            <td>
                              {b.status === "buka" ? (
                                <span className="badge bg-success">Aktif</span>
                              ) : (
                                <span className="badge bg-secondary">Ditutup</span>
                              )}
                            </td>
                            <td className="text-center">
                              <button
                                className="btn btn-sm btn-warning me-1"
                                onClick={() => toast.info(`Edit beasiswa ${b.namaPelatihan}`)}
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDeleteBeasiswa(b.id)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Subtab Persyaratan */}
            {masterSubTab === "syarat" && (
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                  <h6 className="fw-bold mb-0">Master Data Persyaratan Dokumen</h6>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setIsSyaratModalOpen(true)}
                  >
                    <i className="bi bi-plus-lg me-1"></i>Tambah Persyaratan
                  </button>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Nama Dokumen</th>
                          <th>Format Allowed</th>
                          <th>Max Size</th>
                          <th>Mandatory</th>
                          <th className="text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {persyaratanList.map((s) => (
                          <tr key={s.id}>
                            <td>
                              <strong>{s.namaPersyaratan}</strong>
                            </td>
                            <td>{s.formatAllowed}</td>
                            <td>{s.maxSize}</td>
                            <td>
                              {s.isMandatory ? (
                                <span className="badge bg-danger">Wajib</span>
                              ) : (
                                <span className="badge bg-secondary">Opsional</span>
                              )}
                            </td>
                            <td className="text-center">
                              <button
                                className="btn btn-sm btn-warning me-1"
                                onClick={() => toast.info(`Edit syarat ${s.namaPersyaratan}`)}
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDeletePersyaratan(s.id)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SETTING SYSTEM */}
        {activeTab === "setting" && (
          <div className="tab-pane fade show active">
            <ul className="nav nav-tabs mb-3" role="tablist">
              <li className="nav-item">
                <button
                  className={`nav-link fw-bold ${settingSubTab === "user" ? "active" : ""}`}
                  onClick={() => setSettingSubTab("user")}
                >
                  CRUD Users Internal
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link fw-bold ${settingSubTab === "role" ? "active" : ""}`}
                  onClick={() => setSettingSubTab("role")}
                >
                  CRUD Role & Akses Menu
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link fw-bold ${settingSubTab === "menu" ? "active" : ""}`}
                  onClick={() => setSettingSubTab("menu")}
                >
                  CRUD Menu System
                </button>
              </li>
            </ul>

            {/* Subtab Users Internal */}
            {settingSubTab === "user" && (
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                  <h6 className="fw-bold mb-0">Manajemen Users Internal</h6>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setIsUserModalOpen(true)}
                  >
                    <i className="bi bi-person-plus me-1"></i>Tambah User Internal
                  </button>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Nama User</th>
                          <th>Username / Email</th>
                          <th>Role System</th>
                          <th>Status</th>
                          <th className="text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userList.map((u) => (
                          <tr key={u.id}>
                            <td>{u.name}</td>
                            <td>{u.email}</td>
                            <td>
                              <span
                                className={`badge ${
                                  u.role === "admin"
                                    ? "bg-danger"
                                    : u.role === "verifikator"
                                    ? "bg-primary"
                                    : "bg-success"
                                }`}
                              >
                                {u.role.toUpperCase()}
                              </span>
                            </td>
                            <td>
                              <span className="badge bg-success">{u.status}</span>
                            </td>
                            <td className="text-center">
                              <button
                                className="btn btn-sm btn-warning me-1"
                                onClick={() => toast.info(`Edit user ${u.name}`)}
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => {
                                  appStore.deleteInternalUser(u.id);
                                  toast.success("User berhasil dihapus.");
                                }}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Subtab Role & Hak Akses */}
            {settingSubTab === "role" && (
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                  <h6 className="fw-bold mb-0">Manajemen Role & Hak Akses Menu</h6>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      appStore.addRole({
                        name: "Pengawas Eksternal",
                        description: "Audit & Pengawasan Hasil Seleksi",
                        accessibleMenus: ["Dashboard", "Hasil Seleksi"],
                      });
                      toast.success("Role baru berhasil ditambahkan!");
                    }}
                  >
                    <i className="bi bi-plus-lg me-1"></i>Tambah Role
                  </button>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Nama Role</th>
                          <th>Akses Menu Terkait</th>
                          <th className="text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roleList.map((r) => (
                          <tr key={r.id}>
                            <td>
                              <strong>{r.name}</strong>
                              <br />
                              <small className="text-muted">{r.description}</small>
                            </td>
                            <td>{r.accessibleMenus.join(", ")}</td>
                            <td className="text-center">
                              <button
                                className="btn btn-sm btn-info text-white me-1"
                                onClick={() => {
                                  setSelectedRole(r);
                                  setIsRoleModalOpen(true);
                                }}
                              >
                                <i className="bi bi-shield-lock me-1"></i>Setting Akses
                              </button>
                              <button
                                className="btn btn-sm btn-warning"
                                onClick={() => toast.info(`Edit role ${r.name}`)}
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Subtab Menu System */}
            {settingSubTab === "menu" && (
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                  <h6 className="fw-bold mb-0">Manajemen Struktur Menu System</h6>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      const name = prompt("Masukkan Nama Menu:");
                      const route = prompt("Masukkan URL/Route (misal: /pengumuman):");
                      if (name && route) {
                        appStore.addMenu({
                          name: name,
                          route: route,
                          icon: "bi bi-app",
                        });
                        toast.success("Menu baru berhasil ditambahkan!");
                      }
                    }}
                  >
                    <i className="bi bi-plus-lg me-1"></i>Tambah Menu
                  </button>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Nama Menu</th>
                          <th>URL / Route</th>
                          <th>Icon</th>
                          <th className="text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {menuList.map((m) => (
                          <tr key={m.id}>
                            <td>{m.name}</td>
                            <td>
                              <code>{m.route}</code>
                            </td>
                            <td>
                              <i className={m.icon}></i>
                            </td>
                            <td className="text-center">
                              <button
                                className="btn btn-sm btn-warning me-1"
                                onClick={() => toast.info(`Edit menu ${m.name}`)}
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => {
                                  appStore.deleteMenu(m.id);
                                  toast.success("Menu berhasil dihapus.");
                                }}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Admin Modals */}
      <BeasiswaModal
        isOpen={isBeasiswaModalOpen}
        onClose={() => setIsBeasiswaModalOpen(false)}
      />
      <PersyaratanModal
        isOpen={isSyaratModalOpen}
        onClose={() => setIsSyaratModalOpen(false)}
      />
      <UserInternalModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
      />
      <RolePermissionModal
        isOpen={isRoleModalOpen}
        onClose={() => {
          setIsRoleModalOpen(false);
          setSelectedRole(null);
        }}
        role={selectedRole}
      />
    </div>
  );
}
