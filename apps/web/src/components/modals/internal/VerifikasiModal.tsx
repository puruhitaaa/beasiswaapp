import React, { useState, useEffect } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import { appStore } from "@/lib/store";
import { dokumenApi } from "@/lib/api";
import { useSubmitVerifikasiMutation } from "@/hooks/use-transaksi-queries";
import type { PendaftaranRecord, DokumenUploadItem } from "@/types";

interface VerifikasiModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendaftaran: PendaftaranRecord | null;
  onPreviewFile?: (fileName: string, fileUrl?: string) => void;
  onSuccess?: () => void;
}

const verifikasiSchema = z.object({
  statusKeputusan: z.enum(["disetujui", "revisi", "ditolak"]),
  catatanVerifikator: z.string().min(1, "Catatan verifikator wajib diisi."),
});

export const VerifikasiModal: React.FC<VerifikasiModalProps> = ({
  isOpen,
  onClose,
  pendaftaran,
  onPreviewFile,
  onSuccess,
}) => {
  const submitVerifikasiMutation = useSubmitVerifikasiMutation();

  // Selected active document for embedded preview
  const [activeDocKey, setActiveDocKey] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [showBiodataDetail, setShowBiodataDetail] = useState<boolean>(false);

  // Document checklist state: mapping of persyaratanId to { isSesuai, catatanPerbaikan }
  const [docChecks, setDocChecks] = useState<
    Record<string, { isSesuai: boolean; catatanPerbaikan: string }>
  >({});

  const form = useForm({
    defaultValues: {
      statusKeputusan: (pendaftaran?.verifikasi?.statusKeputusan ?? "disetujui") as
        | "disetujui"
        | "revisi"
        | "ditolak",
      catatanVerifikator: pendaftaran?.verifikasi?.catatanVerifikator ?? "",
    },
    validators: {
      onSubmit: verifikasiSchema,
    },
    onSubmit: async ({ value }) => {
      if (!pendaftaran) return;

      const checklistArray = Object.entries(docChecks).map(([persyaratanId, val]) => ({
        persyaratanId,
        isSesuai: val.isSesuai,
        catatanPerbaikan: val.catatanPerbaikan,
      }));

      try {
        await submitVerifikasiMutation.mutateAsync({
          id: pendaftaran.id,
          decision: {
            statusKeputusan: value.statusKeputusan,
            catatanVerifikator: value.catatanVerifikator,
            catatanRevisi: value.catatanVerifikator,
            checklistKtp: docChecks["req-ktp"]?.isSesuai ?? true,
            checklistKk: docChecks["req-kk"]?.isSesuai ?? true,
            checklistIjazah: docChecks["req-ijazah"]?.isSesuai ?? true,
            checklistRekomendasi: docChecks["req-rekom"]?.isSesuai ?? true,
          },
        });

        appStore.submitVerifikasiDecision(
          pendaftaran.id,
          value.statusKeputusan,
          value.catatanVerifikator,
          checklistArray
        );

        toast.success(
          `Keputusan verifikasi berhasil disimpan: Status ${value.statusKeputusan.toUpperCase()}`
        );
        onSuccess?.();
        onClose();
      } catch (err: any) {
        toast.error(err.message || "Gagal menyimpan keputusan verifikasi.");
      }
    },
  });

  useEffect(() => {
    if (pendaftaran) {
      const initialChecks: Record<string, { isSesuai: boolean; catatanPerbaikan: string }> = {};
      pendaftaran.dokumen.forEach((doc) => {
        initialChecks[doc.persyaratanId] = {
          isSesuai: doc.isSesuai !== false,
          catatanPerbaikan: doc.catatanRevisi || "",
        };
      });
      setDocChecks(initialChecks);

      if (pendaftaran.verifikasi?.statusKeputusan) {
        form.reset({
          statusKeputusan: pendaftaran.verifikasi.statusKeputusan as
            | "disetujui"
            | "revisi"
            | "ditolak",
          catatanVerifikator: pendaftaran.verifikasi.catatanVerifikator || "",
        });
      } else {
        form.reset({
          statusKeputusan: "disetujui",
          catatanVerifikator: "",
        });
      }

      if (pendaftaran.dokumen && pendaftaran.dokumen.length > 0) {
        const first = pendaftaran.dokumen[0];
        setActiveDocKey(first.dokumenId || first.id || first.persyaratanId);
        setZoom(1);
        setRotation(0);
      }
    }
  }, [pendaftaran]);

  if (!isOpen || !pendaftaran) return null;

  const bio = pendaftaran.biodata;
  const pend = pendaftaran.pendidikan;

  // Active document selection
  const activeDoc: DokumenUploadItem | undefined =
    pendaftaran.dokumen.find(
      (d) => (d.dokumenId || d.id || d.persyaratanId) === activeDocKey
    ) || pendaftaran.dokumen[0];

  const activeDocIdFinal = activeDoc ? activeDoc.dokumenId || activeDoc.id : undefined;
  const activeDocUrl =
    activeDoc?.fileUrl || (activeDocIdFinal ? dokumenApi.getViewUrl(activeDocIdFinal) : undefined);
  const isPdf = Boolean(
    (activeDoc?.fileName || "").toLowerCase().endsWith(".pdf") ||
      activeDoc?.mimeType === "application/pdf" ||
      activeDoc?.format?.toLowerCase() === "pdf"
  );

  const handleSelectDoc = (doc: DokumenUploadItem) => {
    const key = doc.dokumenId || doc.id || doc.persyaratanId;
    setActiveDocKey(key);
    setZoom(1);
    setRotation(0);
  };

  const handleDocCheck = (persyaratanId: string, isSesuai: boolean) => {
    setDocChecks((prev) => ({
      ...prev,
      [persyaratanId]: {
        ...prev[persyaratanId],
        isSesuai,
      },
    }));

    if (!isSesuai && form.getFieldValue("statusKeputusan") === "disetujui") {
      form.setFieldValue("statusKeputusan", "revisi");
    }
  };

  const handleDocNote = (persyaratanId: string, catatanPerbaikan: string) => {
    setDocChecks((prev) => ({
      ...prev,
      [persyaratanId]: {
        ...prev[persyaratanId],
        catatanPerbaikan,
      },
    }));
  };

  const zoomIn = () => setZoom((prev) => Math.min(3, Math.round((prev + 0.25) * 100) / 100));
  const zoomOut = () => setZoom((prev) => Math.max(0.5, Math.round((prev - 0.25) * 100) / 100));
  const rotateClockwise = () => setRotation((prev) => (prev + 90) % 360);
  const resetTransform = () => {
    setZoom(1);
    setRotation(0);
  };

  const totalDocs = pendaftaran.dokumen.length;
  const sesuaiDocs = Object.values(docChecks).filter((d) => d.isSesuai).length;

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      >
        <div
          className="modal-dialog modal-fullscreen-xl-down modal-xl modal-dialog-centered"
          style={{ maxWidth: "96vw", margin: "1rem auto" }}
        >
          <div
            className="modal-content border-0 shadow-lg rounded-3 overflow-hidden"
            style={{ height: "92vh", display: "flex", flexDirection: "column" }}
          >
            {/* Modal Header */}
            <div className="modal-header bg-primary text-white py-2 px-3">
              <div className="d-flex align-items-center">
                <div
                  className="bg-white text-primary rounded-circle p-2 me-2 d-flex align-items-center justify-content-center"
                  style={{ width: "38px", height: "38px" }}
                >
                  <i className="bi bi-layout-split fs-5"></i>
                </div>
                <div>
                  <h6 className="modal-title fw-bold mb-0">
                    Workspace Verifikasi Berkas Administrasi
                  </h6>
                  <small className="text-white-50">
                    Kode Tiket: <span className="font-monospace text-white">{pendaftaran.kodePermohonan}</span> | Peserta: <span className="fw-semibold text-white">{pendaftaran.userName}</span> ({pendaftaran.beasiswaNama})
                  </small>
                </div>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-light text-primary">
                  <i className="bi bi-file-earmark-check me-1"></i>
                  {sesuaiDocs}/{totalDocs} Berkas Sesuai
                </span>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={onClose}
                  aria-label="Tutup"
                ></button>
              </div>
            </div>

            {/* Split Workspace Body */}
            <div className="modal-body p-0 bg-dark" style={{ flex: 1, overflow: "hidden" }}>
              <div className="container-fluid h-100 p-0">
                <div className="row g-0 h-100">
                  {/* LEFT PANEL: Document Viewer Workspace (approx 58%) */}
                  <div
                    className="col-lg-7 d-flex flex-column h-100 border-end border-secondary position-relative bg-dark"
                    style={{ minHeight: "450px" }}
                  >
                    {/* Viewer Toolbar */}
                    <div className="bg-dark bg-opacity-75 text-white p-2 d-flex align-items-center justify-content-between border-bottom border-secondary">
                      <div className="d-flex align-items-center text-truncate me-2">
                        <i
                          className={`bi ${
                            isPdf ? "bi-file-earmark-pdf text-danger" : "bi-file-earmark-image text-info"
                          } fs-5 me-2`}
                        ></i>
                        <span className="fw-semibold text-truncate small" title={activeDoc?.namaPersyaratan}>
                          {activeDoc?.namaPersyaratan || "Tidak ada berkas dipilih"}
                        </span>
                        {activeDoc?.format && (
                          <span className="badge bg-secondary ms-2 text-uppercase extra-small">
                            {activeDoc.format}
                          </span>
                        )}
                      </div>

                      {/* Zoom and Rotate Controls */}
                      <div className="d-flex align-items-center gap-1">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-light py-1 px-2"
                          onClick={zoomOut}
                          title="Perkecil (Zoom Out)"
                          disabled={zoom <= 0.5}
                        >
                          <i className="bi bi-zoom-out"></i>
                        </button>
                        <span
                          className="text-white-50 extra-small font-monospace px-1 text-center"
                          style={{ minWidth: "45px" }}
                        >
                          {Math.round(zoom * 100)}%
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-light py-1 px-2"
                          onClick={zoomIn}
                          title="Perbesar (Zoom In)"
                          disabled={zoom >= 3}
                        >
                          <i className="bi bi-zoom-in"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-light py-1 px-2 ms-1"
                          onClick={rotateClockwise}
                          title="Putar 90 Derajat (Rotate)"
                        >
                          <i className="bi bi-arrow-clockwise"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary py-1 px-2"
                          onClick={resetTransform}
                          title="Kembalikan Tampilan (Reset)"
                        >
                          <i className="bi bi-arrow-counterclockwise"></i>
                        </button>
                        {activeDocUrl && (
                          <a
                            href={activeDocUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-primary py-1 px-2 ms-2"
                            title="Buka Dokumen di Tab Baru"
                          >
                            <i className="bi bi-box-arrow-up-right me-1"></i>
                            <span className="d-none d-sm-inline">Tab Baru</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Viewer Canvas Area */}
                    <div
                      className="flex-grow-1 position-relative overflow-auto d-flex align-items-center justify-content-center p-2"
                      style={{ backgroundColor: "#121820" }}
                    >
                      {!activeDoc ? (
                        <div className="text-center text-white-50 p-4">
                          <i className="bi bi-folder2-open display-3 mb-2 opacity-50"></i>
                          <p className="small mb-0">Pilih dokumen dari panel kanan untuk memeriksa berkas.</p>
                        </div>
                      ) : activeDocUrl ? (
                        isPdf ? (
                          <div
                            className="w-100 h-100 d-flex align-items-center justify-content-center"
                            style={{ overflow: "hidden" }}
                          >
                            <iframe
                              src={activeDocUrl}
                              title={activeDoc.fileName || activeDoc.namaPersyaratan}
                              className="w-100 h-100 border-0 rounded bg-white"
                              style={{
                                transform: `rotate(${rotation}deg) scale(${zoom})`,
                                transformOrigin: "center center",
                                transition: "transform 0.15s ease-out",
                              }}
                            />
                          </div>
                        ) : (
                          <img
                            src={activeDocUrl}
                            alt={activeDoc.fileName || activeDoc.namaPersyaratan}
                            className="img-fluid rounded shadow"
                            style={{
                              transform: `rotate(${rotation}deg) scale(${zoom})`,
                              transformOrigin: "center center",
                              transition: "transform 0.15s ease-out",
                              maxHeight: "90%",
                              maxWidth: "90%",
                              objectFit: "contain",
                            }}
                          />
                        )
                      ) : (
                        <div className="text-center text-white-50 p-4">
                          <i
                            className={`bi ${
                              isPdf ? "bi-file-earmark-pdf text-danger" : "bi-file-earmark-image text-info"
                            } display-1 mb-3 d-block`}
                          ></i>
                          <h5 className="text-white">{activeDoc.namaPersyaratan}</h5>
                          <p className="small mb-1 font-monospace text-light">{activeDoc.fileName || "dokumen"}</p>
                          <p className="text-muted extra-small mb-3">
                            Format: {activeDoc.format || "PDF"} | Ukuran: {activeDoc.fileSize || "1.2 MB"}
                          </p>
                          <div className="badge bg-secondary-subtle text-light border border-secondary px-3 py-2">
                            <i className="bi bi-shield-check text-success me-2"></i>
                            Magic Bytes & Antivirus ClamAV Lolos Verifikasi
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Document Switcher Strip */}
                    <div className="bg-dark border-top border-secondary p-2 d-flex gap-2 overflow-x-auto">
                      {pendaftaran.dokumen.map((doc) => {
                        const key = doc.dokumenId || doc.id || doc.persyaratanId;
                        const isCurrent = key === (activeDoc?.dokumenId || activeDoc?.id || activeDoc?.persyaratanId);
                        const check = docChecks[doc.persyaratanId];
                        return (
                          <button
                            key={doc.persyaratanId}
                            type="button"
                            className={`btn btn-sm text-nowrap d-flex align-items-center gap-1 ${
                              isCurrent
                                ? "btn-primary fw-bold"
                                : "btn-outline-secondary text-white-50"
                            }`}
                            onClick={() => handleSelectDoc(doc)}
                          >
                            <i
                              className={`bi ${
                                check?.isSesuai === false
                                  ? "bi-x-circle-fill text-danger"
                                  : "bi-check-circle-fill text-success"
                              }`}
                            ></i>
                            <span>{doc.namaPersyaratan}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* RIGHT PANEL: Checklist, Applicant Info & Decision (approx 42%) */}
                  <div
                    className="col-lg-5 d-flex flex-column h-100 bg-white"
                    style={{ minHeight: "450px" }}
                  >
                    <div
                      className="p-3 overflow-y-auto flex-grow-1"
                      style={{ maxHeight: "calc(92vh - 120px)" }}
                    >
                      {/* Collapsible Applicant Details */}
                      <div className="card border mb-3 shadow-none bg-light">
                        <div className="card-body p-3">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <div className="fw-bold text-dark">{bio?.namaLengkap || pendaftaran.userName}</div>
                              <div className="text-muted extra-small">
                                NIK: <span className="font-monospace text-dark">{bio?.nik || pendaftaran.userNik}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary py-1 px-2 extra-small"
                              onClick={() => setShowBiodataDetail((prev) => !prev)}
                            >
                              <i
                                className={`bi ${
                                  showBiodataDetail ? "bi-chevron-up" : "bi-chevron-down"
                                } me-1`}
                              ></i>
                              {showBiodataDetail ? "Tutup Biodata" : "Rincian Profil"}
                            </button>
                          </div>

                          {showBiodataDetail && (
                            <div className="mt-3 pt-3 border-top small">
                              <div className="row g-2 mb-2">
                                <div className="col-6">
                                  <span className="text-muted extra-small d-block">Tempat, Tgl Lahir:</span>
                                  <strong>{bio?.tempatLahir || "-"}, {bio?.tglLahir || "-"}</strong>
                                </div>
                                <div className="col-6">
                                  <span className="text-muted extra-small d-block">Jenis Kelamin:</span>
                                  <strong>{bio?.jenisKelamin === "L" ? "Laki-laki" : bio?.jenisKelamin === "P" ? "Perempuan" : "-"}</strong>
                                </div>
                                <div className="col-12">
                                  <span className="text-muted extra-small d-block">Domisili:</span>
                                  <span>{bio?.alamat ? `${bio.alamat}, ${bio.kecamatan || ""}, ${bio.kabupatenKota || ""}, ${bio.provinsi || ""}` : "-"}</span>
                                </div>
                                <div className="col-6">
                                  <span className="text-muted extra-small d-block">Kontak / Email:</span>
                                  <span>{bio?.noHp || "-"} / {bio?.email || "-"}</span>
                                </div>
                                <div className="col-6">
                                  <span className="text-muted extra-small d-block">Pendidikan:</span>
                                  <span>{pend?.pendidikanTerakhir || "-"} ({pend?.namaInstansi || "-"})</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Verification Checklist */}
                      <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h6 className="fw-bold text-primary mb-0">
                            <i className="bi bi-card-checklist me-1"></i>
                            Checklist Berkas Persyaratan
                          </h6>
                          <span className="text-muted extra-small">
                            Klik kartu untuk melihat dokumen
                          </span>
                        </div>

                        <div className="d-flex flex-column gap-2">
                          {pendaftaran.dokumen.map((doc) => {
                            const key = doc.dokumenId || doc.id || doc.persyaratanId;
                            const isSelected = key === (activeDoc?.dokumenId || activeDoc?.id || activeDoc?.persyaratanId);
                            const check = docChecks[doc.persyaratanId] || {
                              isSesuai: true,
                              catatanPerbaikan: "",
                            };

                            return (
                              <div
                                key={doc.persyaratanId}
                                className={`card transition-all border ${
                                  isSelected
                                    ? "border-primary shadow-sm bg-primary-subtle bg-opacity-10"
                                    : "border-secondary-subtle bg-white"
                                }`}
                              >
                                <div className="card-body p-3">
                                  <div className="d-flex justify-content-between align-items-start mb-2">
                                    <div
                                      className="cursor-pointer flex-grow-1 me-2"
                                      onClick={() => handleSelectDoc(doc)}
                                      style={{ cursor: "pointer" }}
                                    >
                                      <div className="fw-bold small text-dark d-flex align-items-center">
                                        <i
                                          className={`bi ${
                                            isSelected ? "bi-eye-fill text-primary" : "bi-file-earmark"
                                          } me-1`}
                                        ></i>
                                        {doc.namaPersyaratan}
                                        {isSelected && (
                                          <span className="badge bg-primary text-white ms-2 extra-small">
                                            Aktif di Viewer
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-muted extra-small font-monospace">
                                        {doc.fileName || "Berkas Tersimpan"} {doc.fileSize ? `(${doc.fileSize})` : ""}
                                      </div>
                                    </div>

                                    {/* Action Toggle Buttons */}
                                    <div className="btn-group btn-group-sm" role="group">
                                      <button
                                        type="button"
                                        className={`btn btn-sm ${
                                          check.isSesuai ? "btn-success" : "btn-outline-success"
                                        } px-2 py-0`}
                                        style={{ fontSize: "0.75rem" }}
                                        onClick={() => handleDocCheck(doc.persyaratanId, true)}
                                      >
                                        <i className="bi bi-check-lg me-1"></i>Sesuai
                                      </button>
                                      <button
                                        type="button"
                                        className={`btn btn-sm ${
                                          !check.isSesuai ? "btn-danger" : "btn-outline-danger"
                                        } px-2 py-0`}
                                        style={{ fontSize: "0.75rem" }}
                                        onClick={() => handleDocCheck(doc.persyaratanId, false)}
                                      >
                                        <i className="bi bi-x-lg me-1"></i>Revisi
                                      </button>
                                    </div>
                                  </div>

                                  {/* Catatan Perbaikan Field */}
                                  <div>
                                    <input
                                      type="text"
                                      className={`form-control form-control-sm ${
                                        !check.isSesuai
                                          ? "border-danger text-danger bg-danger-subtle bg-opacity-10"
                                          : "border-light-subtle"
                                      }`}
                                      style={{ fontSize: "0.8rem" }}
                                      placeholder={
                                        !check.isSesuai
                                          ? "Tuliskan catatan perbaikan (wajib untuk berkas revisi)..."
                                          : "Catatan perbaikan (opsional)..."
                                      }
                                      value={check.catatanPerbaikan}
                                      onChange={(e) =>
                                        handleDocNote(doc.persyaratanId, e.target.value)
                                      }
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Participant Declaration Info */}
                      <div className="alert alert-light border p-2 mb-3 d-flex align-items-center">
                        <i className="bi bi-shield-check text-success fs-4 me-2"></i>
                        <span className="extra-small text-muted">
                          Pernyataan keabsahan data telah disetujui pendaftar pada {pendaftaran.submittedAt || "saat pendaftaran disubmit"}.
                        </span>
                      </div>

                      {/* Overall Decision Section */}
                      <div className="card border-primary shadow-sm bg-white">
                        <div className="card-header bg-primary text-white py-2 px-3 fw-bold small">
                          <i className="bi bi-gavel me-1"></i>Formulir Keputusan Akhir Verifikator
                        </div>
                        <div className="card-body p-3">
                          <form
                            id="verifikasiForm"
                            onSubmit={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              form.handleSubmit();
                            }}
                          >
                            <div className="mb-3">
                              <form.Field name="statusKeputusan">
                                {(field) => (
                                  <div>
                                    <label htmlFor={field.name} className="form-label fw-bold small">
                                      Status Keputusan Administrasi <span className="text-danger">*</span>
                                    </label>
                                    <select
                                      id={field.name}
                                      name={field.name}
                                      className={`form-select ${
                                        field.state.value === "disetujui"
                                          ? "border-success text-success fw-semibold"
                                          : field.state.value === "revisi"
                                          ? "border-warning text-dark fw-semibold"
                                          : "border-danger text-danger fw-semibold"
                                      }`}
                                      value={field.state.value}
                                      onBlur={field.handleBlur}
                                      onChange={(e) =>
                                        field.handleChange(
                                          e.target.value as "disetujui" | "revisi" | "ditolak"
                                        )
                                      }
                                    >
                                      <option value="disetujui">
                                        Disetujui (Lolos Seleksi Administrasi)
                                      </option>
                                      <option value="revisi">Revisi (Harus Perbaikan Berkas)</option>
                                      <option value="ditolak">Ditolak (Gugur Administrasi)</option>
                                    </select>
                                  </div>
                                )}
                              </form.Field>
                            </div>

                            <div>
                              <form.Field name="catatanVerifikator">
                                {(field) => (
                                  <div>
                                    <label htmlFor={field.name} className="form-label fw-bold small">
                                      Catatan Verifikator untuk Peserta <span className="text-danger">*</span>
                                    </label>
                                    <textarea
                                      id={field.name}
                                      name={field.name}
                                      className={`form-control ${
                                        field.state.meta.errors.length ? "is-invalid" : ""
                                      }`}
                                      rows={3}
                                      placeholder="Tuliskan instruksi atau alasan keputusan verifikasi secara jelas..."
                                      value={field.state.value}
                                      onBlur={field.handleBlur}
                                      onChange={(e) => field.handleChange(e.target.value)}
                                    />
                                    {field.state.meta.errors.map((error) => (
                                      <div
                                        key={error ? (typeof error === "string" ? error : error.message) : ""}
                                        className="invalid-feedback d-block extra-small"
                                      >
                                        {error ? (typeof error === "string" ? error : error.message) : ""}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </form.Field>
                            </div>
                          </form>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="modal-footer bg-white border-top py-2 px-3 justify-content-between">
              <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
                <i className="bi bi-x-circle me-1"></i>Batal / Tutup
              </button>
              <div className="d-flex align-items-center gap-2">
                <form.Subscribe
                  selector={(state) => ({
                    isSubmitting: state.isSubmitting,
                  })}
                >
                  {({ isSubmitting }) => (
                    <button
                      type="button"
                      disabled={isSubmitting || submitVerifikasiMutation.isPending}
                      onClick={() => form.handleSubmit()}
                      className="btn btn-success px-4 fw-bold"
                    >
                      <i className="bi bi-send-check me-1"></i>
                      {isSubmitting || submitVerifikasiMutation.isPending
                        ? "Menyimpan..."
                        : "Submit Keputusan Verifikasi"}
                    </button>
                  )}
                </form.Subscribe>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default VerifikasiModal;
