import React, { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { appStore, useCurrentUser } from "@/lib/store";
import { useVerifikatorQueue } from "@/hooks/use-transaksi-queries";
import { SidebarInternal } from "@/components/layout/SidebarInternal";
import { PageHeaderInternal } from "@/components/layout/PageHeaderInternal";
import { VerifikasiModal } from "@/components/modals/internal/VerifikasiModal";
import { FilePreviewModal } from "@/components/modals/applicant/FilePreviewModal";
import type { PendaftaranRecord } from "@/types";

export const Route = createFileRoute("/verifikator")({
  component: VerifikatorPageComponent,
});

function VerifikatorPageComponent() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();

  // Authentication & Role Route Guard
  useEffect(() => {
    if (!currentUser || (currentUser.role !== "verifikator" && currentUser.role !== "admin")) {
      toast.error("Akses ditolak. Halaman ini hanya untuk Petugas Verifikator.");
      navigate({ to: "/login" });
    }
  }, [currentUser, navigate]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPendaftaran, setSelectedPendaftaran] = useState<PendaftaranRecord | null>(null);
  const [isVerifOpen, setIsVerifOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    isOpen: boolean;
    fileName: string;
    fileUrl?: string;
  }>({
    isOpen: false,
    fileName: "",
  });

  const { data: pendaftarList = [], isLoading } = useVerifikatorQueue();

  // Filter list: search by name, NIK, or program
  const filteredList = pendaftarList.filter((item) => {
    const name = item.biodata?.namaLengkap || item.userName;
    const nik = item.biodata?.nik || item.userNik;
    const program = item.beasiswaNama;
    const q = searchQuery.toLowerCase();
    return name.toLowerCase().includes(q) || nik.includes(q) || program.toLowerCase().includes(q);
  });

  // Computed statistics
  const countPerluVerif =
    pendaftarList.filter(
      (p) =>
        p.status === "SUBMITTED" &&
        (!p.verifikasi || p.verifikasi.statusKeputusan === "pending")
    ).length;

  const countRevisi = pendaftarList.filter((p) => p.status === "REVISI").length;

  const countDisetujui =
    pendaftarList.filter(
      (p) =>
        p.status === "LOLOS_ADMIN" ||
        p.status === "DALAM_PROSES_WAWANCARA" ||
        p.status === "LULUS_DITERIMA"
    ).length;

  const countDitolak =
    pendaftarList.filter(
      (p) => p.status === "TIDAK_LOLOS_ADMIN" || p.status === "TIDAK_LULUS_WAWANCARA"
    ).length;

  if (!currentUser || (currentUser.role !== "verifikator" && currentUser.role !== "admin")) {
    return null;
  }

  const handleOpenVerif = (p: PendaftaranRecord) => {
    setSelectedPendaftaran(p);
    setIsVerifOpen(true);
  };

  const handleCloseVerif = () => {
    setIsVerifOpen(false);
    setSelectedPendaftaran(null);
  };

  const handlePreview = (fileName: string, fileUrl?: string) => {
    setPreviewFile({
      isOpen: true,
      fileName,
      fileUrl,
    });
  };

  return (
    <div className="d-flex min-vh-100 bg-light">
      {/* Sidebar Internal */}
      <SidebarInternal
        role="verifikator"
        activeTab="verifikasi"
      />

      {/* Main Content Area */}
      <div className="main-content flex-grow-1">
        {/* Top Header */}
        <PageHeaderInternal
          title="Verifikasi Seleksi Administrasi"
          subtitle="Kelola dan selesaikan verifikasi berkas calon peserta beasiswa"
          badgeIcon="bi-person-circle"
          badgeText={`Verifikator: ${currentUser?.name || "Ahmad Rivaldi"}`}
        />

        {/* 4 Stat Cards */}
        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <div className="card border-0 shadow-sm bg-primary text-white">
              <div className="card-body">
                <h6 className="card-title text-white-50">Perlu Verifikasi</h6>
                <h3 className="fw-bold mb-0">{countPerluVerif}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm bg-warning text-dark">
              <div className="card-body">
                <h6 className="card-title text-dark-50">Status Revisi</h6>
                <h3 className="fw-bold mb-0">{countRevisi}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm bg-success text-white">
              <div className="card-body">
                <h6 className="card-title text-white-50">Disetujui (Lolos)</h6>
                <h3 className="fw-bold mb-0">{countDisetujui}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm bg-danger text-white">
              <div className="card-body">
                <h6 className="card-title text-white-50">Ditolak</h6>
                <h3 className="fw-bold mb-0">{countDitolak}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Queue Table Card */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3 fw-bold border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
            <span>
              <i className="bi bi-list-task me-2 text-primary"></i>
              Daftar Pendaftar (Baru Submit & Revisi)
            </span>
            <input
              type="text"
              className="form-control form-control-sm w-auto"
              placeholder="Cari Nama / NIK..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: "5%" }}>No</th>
                    <th style={{ width: "25%" }}>NIK & Nama Peserta</th>
                    <th style={{ width: "25%" }}>Program Pelatihan</th>
                    <th style={{ width: "15%" }}>Tanggal Submit</th>
                    <th style={{ width: "12%" }}>Tipe Pengajuan</th>
                    <th style={{ width: "13%" }}>Status Saat Ini</th>
                    <th className="text-center" style={{ width: "15%" }}>
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-muted">
                        Tidak ada berkas yang menunggu verifikasi saat ini.
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((item, idx) => {
                      const isRevisi =
                        item.status === "REVISI" ||
                        (item.verifikasi?.catatanVerifikator &&
                          item.verifikasi.statusKeputusan === "revisi");
                      return (
                        <tr key={item.id}>
                          <td>{idx + 1}</td>
                          <td>
                            <strong>{item.biodata?.namaLengkap || item.userName}</strong>
                            <br />
                            <small className="text-muted">
                              NIK: {item.biodata?.nik || item.userNik}
                            </small>
                          </td>
                          <td>{item.beasiswaNama}</td>
                          <td>{item.submittedAt || "02 Sep 2026"}</td>
                          <td>
                            {isRevisi ? (
                              <span className="badge bg-warning text-dark">Hasil Revisi</span>
                            ) : (
                              <span className="badge bg-info text-dark">Baru Submit</span>
                            )}
                          </td>
                          <td>
                            {item.status === "SUBMITTED" && (
                              <span className="badge bg-secondary">Menunggu Verifikasi</span>
                            )}
                            {item.status === "REVISI" && (
                              <span className="badge bg-warning text-dark">Revisi Terkirim</span>
                            )}
                            {item.status === "LOLOS_ADMIN" && (
                              <span className="badge bg-success">Lolos Administrasi</span>
                            )}
                            {item.status === "TIDAK_LOLOS_ADMIN" && (
                              <span className="badge bg-danger">Ditolak</span>
                            )}
                            {item.status === "LULUS_DITERIMA" && (
                              <span className="badge bg-success">Lulus Wawancara</span>
                            )}
                            {item.status === "DRAFT" && (
                              <span className="badge bg-light text-dark border">Draft</span>
                            )}
                          </td>
                          <td className="text-center">
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handleOpenVerif(item)}
                            >
                              <i className="bi bi-pencil-square me-1"></i>
                              Verifikasi Data
                            </button>
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

      {/* Verifikasi Modal */}
      {selectedPendaftaran && (
        <VerifikasiModal
          isOpen={isVerifOpen}
          onClose={handleCloseVerif}
          pendaftaran={selectedPendaftaran}
          onPreviewFile={handlePreview}
          onSuccess={handleCloseVerif}
        />
      )}

      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={previewFile.isOpen}
        onClose={() => setPreviewFile({ isOpen: false, fileName: "", fileUrl: undefined })}
        fileName={previewFile.fileName}
        fileUrl={previewFile.fileUrl}
      />
    </div>
  );
}
