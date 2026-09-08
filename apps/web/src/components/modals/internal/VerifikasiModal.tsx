import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { appStore } from "@/lib/store";
import { useSubmitVerifikasiMutation } from "@/hooks/use-transaksi-queries";
import type { PendaftaranRecord } from "@/types";

interface VerifikasiModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendaftaran: PendaftaranRecord | null;
  onPreviewFile?: (fileName: string) => void;
  onSuccess?: () => void;
}

export const VerifikasiModal: React.FC<VerifikasiModalProps> = ({
  isOpen,
  onClose,
  pendaftaran,
  onPreviewFile,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<1 | 2 | 3 | 4>(1);
  const [statusKeputusan, setStatusKeputusan] = useState<"disetujui" | "revisi" | "ditolak">("disetujui");
  const [catatanVerifikator, setCatatanVerifikator] = useState("");
  const submitVerifikasiMutation = useSubmitVerifikasiMutation();

  // Document checklist state: mapping of persyaratanId to { isSesuai, catatanPerbaikan }
  const [docChecks, setDocChecks] = useState<
    Record<string, { isSesuai: boolean; catatanPerbaikan: string }>
  >({});

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
        setStatusKeputusan(
          pendaftaran.verifikasi.statusKeputusan as "disetujui" | "revisi" | "ditolak"
        );
        setCatatanVerifikator(pendaftaran.verifikasi.catatanVerifikator || "");
      } else {
        setStatusKeputusan("disetujui");
        setCatatanVerifikator("");
      }
    }
  }, [pendaftaran]);

  if (!isOpen || !pendaftaran) return null;

  const bio = pendaftaran.biodata;
  const pend = pendaftaran.pendidikan;

  const handleDocCheck = (persyaratanId: string, isSesuai: boolean) => {
    setDocChecks((prev) => ({
      ...prev,
      [persyaratanId]: {
        ...prev[persyaratanId],
        isSesuai,
      },
    }));

    // Auto switch decision to "revisi" if any doc is marked not sesuai
    if (!isSesuai && statusKeputusan === "disetujui") {
      setStatusKeputusan("revisi");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendaftaran) return;
    if (!catatanVerifikator.trim()) {
      toast.error("Catatan verifikator wajib diisi.");
      return;
    }

    const checklistArray = Object.entries(docChecks).map(([persyaratanId, val]) => ({
      persyaratanId,
      isSesuai: val.isSesuai,
      catatanPerbaikan: val.catatanPerbaikan,
    }));

    try {
      await submitVerifikasiMutation.mutateAsync({
        id: pendaftaran.id,
        decision: {
          statusKeputusan,
          catatanVerifikator,
          catatanRevisi: catatanVerifikator,
          checklistKtp: docChecks["req-ktp"]?.isSesuai ?? true,
          checklistKk: docChecks["req-kk"]?.isSesuai ?? true,
          checklistIjazah: docChecks["req-ijazah"]?.isSesuai ?? true,
          checklistRekomendasi: docChecks["req-rekom"]?.isSesuai ?? true,
        },
      });

      appStore.submitVerifikasiDecision(
        pendaftaran.id,
        statusKeputusan,
        catatanVerifikator,
        checklistArray
      );

      toast.success(`Keputusan verifikasi berhasil disimpan: Status ${statusKeputusan.toUpperCase()}`);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan keputusan verifikasi.");
    }
  };

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <div className="modal-dialog modal-xl modal-dialog-scrollable">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header bg-primary text-white py-3">
              <div className="d-flex align-items-center">
                <div
                  className="bg-white text-primary rounded-circle p-2 me-3 d-flex align-items-center justify-content-center"
                  style={{ width: "45px", height: "45px" }}
                >
                  <i className="bi bi-person-bounding-box fs-4"></i>
                </div>
                <div>
                  <h5 className="modal-title fw-bold mb-0">
                    Verifikasi Berkas Seleksi Administrasi
                  </h5>
                  <small className="text-white-50">
                    Kode Pendaftaran: {pendaftaran.kodePermohonan} | Tipe: {pendaftaran.tipePengajuan}
                  </small>
                </div>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
              ></button>
            </div>

            <div className="modal-body p-0 bg-light">
              <ul
                className="nav nav-pills nav-justified bg-white border-bottom p-2 gap-2"
                role="tablist"
              >
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link fw-semibold small ${activeTab === 1 ? "active" : ""}`}
                    onClick={() => setActiveTab(1)}
                  >
                    <i className="bi bi-person-vcard me-1"></i> 1. Data Diri & Kontak
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link fw-semibold small ${activeTab === 2 ? "active" : ""}`}
                    onClick={() => setActiveTab(2)}
                  >
                    <i className="bi bi-mortarboard me-1"></i> 2. Pendidikan & Kerja
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link fw-semibold small ${activeTab === 3 ? "active" : ""}`}
                    onClick={() => setActiveTab(3)}
                  >
                    <i className="bi bi-file-earmark-check me-1"></i> 3. Upload Dokumen
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link fw-semibold small ${activeTab === 4 ? "active" : ""}`}
                    onClick={() => setActiveTab(4)}
                  >
                    <i className="bi bi-patch-check me-1"></i> 4. Persetujuan & Keputusan
                  </button>
                </li>
              </ul>

              <div className="p-4">
                {/* TAB 1 */}
                {activeTab === 1 && (
                  <div className="card border-0 shadow-sm mb-3">
                    <div className="card-header bg-white fw-bold text-primary border-bottom">
                      <i className="bi bi-card-heading me-2"></i>Informasi Data Diri & Domisili Peserta
                    </div>
                    <div className="card-body">
                      <div className="row g-3">
                        <div className="col-md-4">
                          <label className="text-muted extra-small d-block mb-1">
                            NIK (Nomor Induk Kependudukan)
                          </label>
                          <div className="fw-bold fs-6 text-dark bg-light p-2 rounded border">
                            {bio?.nik || pendaftaran.userNik}
                          </div>
                        </div>
                        <div className="col-md-5">
                          <label className="text-muted extra-small d-block mb-1">Nama Lengkap</label>
                          <div className="fw-bold fs-6 text-dark bg-light p-2 rounded border">
                            {bio?.namaLengkap || pendaftaran.userName}
                          </div>
                        </div>
                        <div className="col-md-3">
                          <label className="text-muted extra-small d-block mb-1">Jenis Kelamin</label>
                          <div className="fw-bold fs-6 text-dark bg-light p-2 rounded border">
                            {bio?.jenisKelamin === "P" ? "Perempuan" : "Laki-laki"}
                          </div>
                        </div>

                        <div className="col-md-4">
                          <label className="text-muted extra-small d-block mb-1">
                            Tempat, Tanggal Lahir
                          </label>
                          <div className="fw-semibold text-dark bg-light p-2 rounded border">
                            {bio?.tempatLahir || "-"}, {bio?.tglLahir || "-"}
                          </div>
                        </div>
                        <div className="col-md-4">
                          <label className="text-muted extra-small d-block mb-1">
                            No. HP / WhatsApp
                          </label>
                          <div className="fw-semibold text-dark bg-light p-2 rounded border">
                            <i className="bi bi-whatsapp text-success me-1"></i>{" "}
                            {bio?.noHp || "-"}
                          </div>
                        </div>
                        <div className="col-md-4">
                          <label className="text-muted extra-small d-block mb-1">Alamat Email</label>
                          <div className="fw-semibold text-dark bg-light p-2 rounded border">
                            <i className="bi bi-envelope me-1 text-primary"></i>{" "}
                            {bio?.email || "-"}
                          </div>
                        </div>

                        <div className="col-12">
                          <label className="text-muted extra-small d-block mb-1">
                            Alamat Domisili Lengkap
                          </label>
                          <div className="fw-semibold text-dark bg-light p-2 rounded border">
                            {bio?.alamat || "-"}
                          </div>
                        </div>

                        <div className="col-md-3">
                          <label className="text-muted extra-small d-block mb-1">Provinsi</label>
                          <div className="bg-light p-2 rounded border small">
                            {bio?.provinsi || "-"}
                          </div>
                        </div>
                        <div className="col-md-3">
                          <label className="text-muted extra-small d-block mb-1">Kabupaten/Kota</label>
                          <div className="bg-light p-2 rounded border small">
                            {bio?.kabupatenKota || "-"}
                          </div>
                        </div>
                        <div className="col-md-3">
                          <label className="text-muted extra-small d-block mb-1">Kecamatan</label>
                          <div className="bg-light p-2 rounded border small">
                            {bio?.kecamatan || "-"}
                          </div>
                        </div>
                        <div className="col-md-3">
                          <label className="text-muted extra-small d-block mb-1">Kelurahan</label>
                          <div className="bg-light p-2 rounded border small">
                            {bio?.kelurahan || "-"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2 */}
                {activeTab === 2 && (
                  <div className="card border-0 shadow-sm mb-3">
                    <div className="card-header bg-white fw-bold text-primary border-bottom">
                      <i className="bi bi-book me-2"></i>Riwayat Pendidikan & Pekerjaan
                    </div>
                    <div className="card-body">
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="text-muted extra-small d-block mb-1">
                            Pendidikan Terakhir
                          </label>
                          <div className="fw-bold text-dark bg-light p-2 rounded border">
                            {pend?.pendidikanTerakhir || "-"}
                          </div>
                        </div>
                        <div className="col-md-6">
                          <label className="text-muted extra-small d-block mb-1">
                            Nama Instansi / Sekolah / Universitas
                          </label>
                          <div className="fw-bold text-dark bg-light p-2 rounded border">
                            {pend?.namaInstansi || "-"}
                          </div>
                        </div>
                        <div className="col-md-6">
                          <label className="text-muted extra-small d-block mb-1">
                            Jurusan / Program Studi
                          </label>
                          <div className="fw-semibold text-dark bg-light p-2 rounded border">
                            {pend?.jurusan || "-"}
                          </div>
                        </div>
                        <div className="col-md-6">
                          <label className="text-muted extra-small d-block mb-1">
                            Pekerjaan Saat Ini
                          </label>
                          <div className="fw-semibold text-dark bg-light p-2 rounded border">
                            {pend?.pekerjaanSaatIni || "-"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3 */}
                {activeTab === 3 && (
                  <div className="card border-0 shadow-sm mb-3">
                    <div className="card-header bg-white fw-bold text-primary border-bottom d-flex justify-content-between align-items-center">
                      <span>
                        <i className="bi bi-file-earmark-arrow-up me-2"></i>Peninjauan Berkas Syarat
                        (PDF/JPG/PNG Max 2MB)
                      </span>
                      <span className="badge bg-info-subtle text-info border border-info small">
                        {pendaftaran.dokumen.length} Dokumen Diunggah
                      </span>
                    </div>
                    <div className="card-body p-0">
                      <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                          <thead className="table-light small">
                            <tr>
                              <th style={{ width: "25%" }}>Persyaratan Dokumen</th>
                              <th style={{ width: "20%" }}>Berkas Peserta</th>
                              <th style={{ width: "25%" }}>Kesesuaian Data</th>
                              <th>Catatan Perbaikan Verifikator</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pendaftaran.dokumen.map((doc) => {
                              const check = docChecks[doc.persyaratanId] || {
                                isSesuai: true,
                                catatanPerbaikan: "",
                              };
                              return (
                                <tr key={doc.persyaratanId}>
                                  <td>
                                    <strong>{doc.namaPersyaratan}</strong>
                                    <br />
                                    <small className="text-muted">
                                      Format: {doc.format || "PDF"} ({doc.fileSize || "1 MB"})
                                    </small>
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-primary w-100"
                                      onClick={() =>
                                        onPreviewFile?.(doc.fileName || doc.namaPersyaratan)
                                      }
                                    >
                                      <i className="bi bi-eye me-1"></i>Pratinjau
                                    </button>
                                  </td>
                                  <td>
                                    <div className="btn-group w-100" role="group">
                                      <button
                                        type="button"
                                        className={`btn btn-sm ${check.isSesuai ? "btn-success" : "btn-outline-success"}`}
                                        onClick={() => handleDocCheck(doc.persyaratanId, true)}
                                      >
                                        <i className="bi bi-check-lg"></i> Sesuai
                                      </button>
                                      <button
                                        type="button"
                                        className={`btn btn-sm ${!check.isSesuai ? "btn-danger" : "btn-outline-danger"}`}
                                        onClick={() => handleDocCheck(doc.persyaratanId, false)}
                                      >
                                        <i className="bi bi-x-lg"></i> Ditolak
                                      </button>
                                    </div>
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      className={`form-control form-control-sm ${!check.isSesuai ? "border-danger text-danger" : ""}`}
                                      placeholder="Isi catatan jika tidak sesuai..."
                                      value={check.catatanPerbaikan}
                                      onChange={(e) =>
                                        handleDocNote(doc.persyaratanId, e.target.value)
                                      }
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4 */}
                {activeTab === 4 && (
                  <div>
                    <div className="card border-0 shadow-sm mb-3">
                      <div className="card-header bg-white fw-bold text-primary border-bottom">
                        <i className="bi bi-shield-check me-2"></i>Checklist Akhir & Statement Peserta
                      </div>
                      <div className="card-body">
                        <div className="alert alert-success d-flex align-items-center mb-0" role="alert">
                          <i className="bi bi-check-circle-fill fs-4 me-3"></i>
                          <div>
                            <strong>Pernyataan Keabsahan Data Disetujui Peserta</strong>
                            <p className="mb-0 small">
                              Peserta telah menyetujui pernyataan keabsahan dokumen dan ketentuan pendaftaran pada{" "}
                              {pendaftaran.submittedAt || "02 September 2026 pukul 14:20 WIB"}.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="card border-primary shadow-sm">
                      <div className="card-header bg-primary text-white fw-bold">
                        <i className="bi bi-gavel me-2"></i>Keputusan Akhir Verifikator
                      </div>
                      <div className="card-body bg-white">
                        <form onSubmit={handleSubmit}>
                          <div className="row g-3">
                            <div className="col-md-5">
                              <label className="form-label fw-bold">
                                Status Keputusan <span className="text-danger">*</span>
                              </label>
                              <select
                                className="form-select form-select-lg border-primary"
                                value={statusKeputusan}
                                onChange={(e) =>
                                  setStatusKeputusan(
                                    e.target.value as "disetujui" | "revisi" | "ditolak"
                                  )
                                }
                                required
                              >
                                <option value="disetujui">
                                  Disetujui (Lolos Seleksi Administrasi)
                                </option>
                                <option value="revisi">Revisi (Harus Perbaikan Berkas)</option>
                                <option value="ditolak">Ditolak (Gugur Administrasi)</option>
                              </select>
                            </div>
                            <div className="col-md-7">
                              <label className="form-label fw-bold">
                                Catatan Verifikator untuk Peserta{" "}
                                <span className="text-danger">*</span>
                              </label>
                              <textarea
                                className="form-control"
                                rows={3}
                                placeholder="Tuliskan alasan keputusan atau petunjuk perbaikan berkas secara jelas..."
                                value={catatanVerifikator}
                                onChange={(e) => setCatatanVerifikator(e.target.value)}
                                required
                              />
                            </div>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer bg-white border-top justify-content-between">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                <i className="bi bi-x-circle me-1"></i>Tutup
              </button>
              <div>
                <button
                  type="button"
                  className="btn btn-success px-4 fw-bold"
                  onClick={handleSubmit}
                >
                  <i className="bi bi-send-check me-1"></i>Submit Keputusan Verifikasi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default VerifikasiModal;
