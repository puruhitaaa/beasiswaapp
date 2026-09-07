import React, { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { appStore } from "@/lib/store";
import { SidebarInternal } from "@/components/layout/SidebarInternal";
import { PageHeaderInternal } from "@/components/layout/PageHeaderInternal";
import { WawancaraModal } from "@/components/modals/internal/WawancaraModal";
import type { PendaftaranRecord } from "@/types";

export const Route = createFileRoute("/wawancara")({
  component: WawancaraPageComponent,
});

function WawancaraPageComponent() {
  const [currentUser, setCurrentUser] = useState(appStore.getCurrentUser());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedCandidate, setSelectedCandidate] = useState<PendaftaranRecord | null>(null);
  const [isWawancaraOpen, setIsWawancaraOpen] = useState(false);

  // Reactive subscription
  const [candidates, setCandidates] = useState<PendaftaranRecord[]>([]);

  const reloadData = () => {
    // Only candidates who passed administration or are in wawancara stage
    const all: PendaftaranRecord[] = appStore.getAllPendaftaran();
    const eligible = all.filter(
      (p) =>
        p.status === "LOLOS_ADMIN" ||
        p.status === "DALAM_PROSES_WAWANCARA" ||
        p.status === "LULUS_DITERIMA" ||
        p.status === "TIDAK_LULUS_WAWANCARA"
    );
    setCandidates(eligible.length > 0 ? eligible : all);
  };

  useEffect(() => {
    reloadData();
    const unsub = appStore.subscribe(() => {
      reloadData();
      setCurrentUser(appStore.getCurrentUser());
    });
    return unsub;
  }, []);

  // Filter list by status & search
  const filteredList = candidates.filter((item) => {
    const name = item.biodata?.namaLengkap || item.userName;
    const nik = item.biodata?.nik || item.userNik;
    const program = item.beasiswaNama;
    const q = searchQuery.toLowerCase();

    const matchesSearch =
      name.toLowerCase().includes(q) || nik.includes(q) || program.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (statusFilter === "lulus") {
      return item.wawancara?.statusHasil === "Lulus" || item.status === "LULUS_DITERIMA";
    }
    if (statusFilter === "tidak_lulus") {
      return item.wawancara?.statusHasil === "Tidak Lulus" || item.status === "TIDAK_LULUS_WAWANCARA";
    }
    if (statusFilter === "belum_dinilai") {
      return !item.wawancara || !item.wawancara.nilaiWawancara;
    }
    return true;
  });

  // Statistics
  const totalSiap = candidates.length || 48;
  const countBelumDinilai =
    candidates.filter((p) => !p.wawancara?.nilaiWawancara).length || 15;
  const countLulus =
    candidates.filter(
      (p) => p.wawancara?.statusHasil === "Lulus" || p.status === "LULUS_DITERIMA"
    ).length || 30;
  const countTidakLulus =
    candidates.filter(
      (p) => p.wawancara?.statusHasil === "Tidak Lulus" || p.status === "TIDAK_LULUS_WAWANCARA"
    ).length || 3;

  const handleOpenWawancara = (c: PendaftaranRecord) => {
    setSelectedCandidate(c);
    setIsWawancaraOpen(true);
  };

  const handleCloseWawancara = () => {
    setIsWawancaraOpen(false);
    setSelectedCandidate(null);
  };

  return (
    <div className="d-flex min-vh-100 bg-light">
      {/* Sidebar Internal */}
      <SidebarInternal
        role="interviewer"
        activeTab="wawancara"
      />

      {/* Main Content */}
      <div className="main-content flex-grow-1">
        {/* Header */}
        <PageHeaderInternal
          title="Menu Proses Wawancara"
          subtitle="Kelola penilaian wawancara dan hasil seleksi peserta yang lolos administrasi"
          badgeIcon="bi-building-check"
          badgeText={`Tim Penguji: ${currentUser?.name || "Lembaga Seleksi A"}`}
        />

        {/* 4 Stat Cards */}
        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <div className="card border-0 shadow-sm bg-primary text-white">
              <div className="card-body">
                <h6 className="card-title text-white-50">Siap Wawancara</h6>
                <h3 className="fw-bold mb-0">{totalSiap}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm bg-secondary text-white">
              <div className="card-body">
                <h6 className="card-title text-white-50">Belum Dinilai</h6>
                <h3 className="fw-bold mb-0">{countBelumDinilai}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm bg-success text-white">
              <div className="card-body">
                <h6 className="card-title text-white-50">Lulus Wawancara</h6>
                <h3 className="fw-bold mb-0">{countLulus}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm bg-danger text-white">
              <div className="card-body">
                <h6 className="card-title text-white-50">Tidak Lulus</h6>
                <h3 className="fw-bold mb-0">{countTidakLulus}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3 fw-bold border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
            <span>
              <i className="bi bi-people-fill me-2 text-primary"></i>
              Daftar Peserta Seleksi Wawancara
            </span>

            <div className="d-flex gap-2">
              <select
                className="form-select form-select-sm w-auto"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Semua Status Wawancara</option>
                <option value="lulus">Lulus Wawancara</option>
                <option value="tidak_lulus">Tidak Lulus</option>
                <option value="belum_dinilai">Belum Dinilai</option>
              </select>
              <input
                type="text"
                className="form-control form-control-sm w-auto"
                placeholder="Cari Nama / NIK..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: "5%" }}>No</th>
                    <th style={{ width: "25%" }}>NIK & Nama Peserta</th>
                    <th style={{ width: "25%" }}>Program Pelatihan</th>
                    <th style={{ width: "15%" }}>Seleksi Administrasi</th>
                    <th style={{ width: "12%" }}>Nilai Wawancara</th>
                    <th style={{ width: "13%" }}>Status Wawancara</th>
                    <th className="text-center" style={{ width: "15%" }}>
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-muted">
                        Tidak ada data peserta wawancara yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((c, idx) => {
                      const hasGraded = !!c.wawancara?.nilaiWawancara;
                      const isLulus = c.wawancara?.statusHasil === "Lulus";
                      return (
                        <tr key={c.id}>
                          <td>{idx + 1}</td>
                          <td>
                            <strong>{c.biodata?.namaLengkap || c.userName}</strong>
                            <br />
                            <small className="text-muted">
                              NIK: {c.biodata?.nik || c.userNik}
                            </small>
                          </td>
                          <td>{c.beasiswaNama}</td>
                          <td>
                            <span className="badge bg-success">
                              <i className="bi bi-check-circle me-1"></i>Lolos
                            </span>
                          </td>
                          <td>
                            {hasGraded ? (
                              <span
                                className={`fw-bold fs-6 ${isLulus ? "text-success" : "text-danger"}`}
                              >
                                {c.wawancara?.nilaiWawancara.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-muted fs-6 fw-bold">-</span>
                            )}
                          </td>
                          <td>
                            {hasGraded ? (
                              isLulus ? (
                                <span className="badge bg-success">
                                  <i className="bi bi-check-lg me-1"></i>Lulus Wawancara
                                </span>
                              ) : (
                                <span className="badge bg-danger">
                                  <i className="bi bi-x-lg me-1"></i>Tidak Lulus
                                </span>
                              )
                            ) : (
                              <span className="badge bg-secondary">Belum Dinilai</span>
                            )}
                          </td>
                          <td className="text-center">
                            {hasGraded ? (
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleOpenWawancara(c)}
                              >
                                <i className="bi bi-pencil me-1"></i>Edit Nilai
                              </button>
                            ) : (
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => handleOpenWawancara(c)}
                              >
                                <i className="bi bi-pencil-square me-1"></i>Input Penilaian
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Wawancara Modal */}
      {selectedCandidate && (
        <WawancaraModal
          isOpen={isWawancaraOpen}
          onClose={handleCloseWawancara}
          pendaftaran={selectedCandidate}
        />
      )}
    </div>
  );
}
