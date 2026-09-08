import React, { useState } from "react";
import type { PendaftaranRecord } from "@/types";

interface WizardReadonlyModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendaftaran: PendaftaranRecord;
  onPreviewFile?: (fileName: string, fileUrl?: string) => void;
}

export const WizardReadonlyModal: React.FC<WizardReadonlyModalProps> = ({
  isOpen,
  onClose,
  pendaftaran,
  onPreviewFile,
}) => {
  const [activeTab, setActiveTab] = useState<1 | 2 | 3 | 4>(1);

  if (!isOpen) return null;

  const bio = pendaftaran.biodata;
  const pend = pendaftaran.pendidikan;

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <div className="modal-dialog modal-xl modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header bg-secondary text-white">
              <h5 className="modal-title fw-bold">
                <i className="bi bi-lock-fill me-2"></i>Formulir Pendaftaran (Read-Only)
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
              ></button>
            </div>

            <div className="modal-body p-0">
              <div className="bg-warning-subtle p-3 border-bottom d-flex align-items-center text-dark">
                <i className="bi bi-info-circle-fill fs-5 me-2 text-warning-emphasis"></i>
                <span className="small">
                  Data pendaftaran ini sudah dikirim. Seluruh kolom isian dalam mode{" "}
                  <strong>baca saja (disabled)</strong>.
                </span>
              </div>

              <ul className="nav nav-tabs nav-justified wizard-steps bg-white" role="tablist">
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${activeTab === 1 ? "active" : ""}`}
                    onClick={() => setActiveTab(1)}
                  >
                    1. Data Diri & Kontak
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${activeTab === 2 ? "active" : ""}`}
                    onClick={() => setActiveTab(2)}
                  >
                    2. Pendidikan & Pekerjaan
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${activeTab === 3 ? "active" : ""}`}
                    onClick={() => setActiveTab(3)}
                  >
                    3. Dokumen Pendukung
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${activeTab === 4 ? "active" : ""}`}
                    onClick={() => setActiveTab(4)}
                  >
                    4. Persetujuan
                  </button>
                </li>
              </ul>

              <div className="tab-content p-4">
                {activeTab === 1 && (
                  <div>
                    <h6 className="fw-bold mb-3 text-secondary">
                      Bagian 1: Data Diri & Informasi Kontak
                    </h6>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">NIK</label>
                        <input
                          type="text"
                          className="form-control"
                          value={bio?.nik || pendaftaran.userNik}
                          disabled
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Nama Lengkap</label>
                        <input
                          type="text"
                          className="form-control"
                          value={bio?.namaLengkap || pendaftaran.userName}
                          disabled
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Tempat Lahir</label>
                        <input
                          type="text"
                          className="form-control"
                          value={bio?.tempatLahir || "-"}
                          disabled
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Tanggal Lahir</label>
                        <input
                          type="text"
                          className="form-control"
                          value={bio?.tglLahir || "-"}
                          disabled
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Jenis Kelamin</label>
                        <select className="form-select" disabled>
                          <option>
                            {bio?.jenisKelamin === "P"
                              ? "Perempuan"
                              : bio?.jenisKelamin === "L"
                              ? "Laki-laki"
                              : "-"}
                          </option>
                        </select>
                      </div>
                      <div className="col-md-12">
                        <label className="form-label">Alamat Domisili</label>
                        <textarea
                          className="form-control"
                          rows={2}
                          value={bio?.alamat || "-"}
                          disabled
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Provinsi</label>
                        <input
                          type="text"
                          className="form-control"
                          value={bio?.provinsi || "-"}
                          disabled
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Kabupaten/Kota</label>
                        <input
                          type="text"
                          className="form-control"
                          value={bio?.kabupatenKota || "-"}
                          disabled
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Kecamatan</label>
                        <input
                          type="text"
                          className="form-control"
                          value={bio?.kecamatan || "-"}
                          disabled
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Kelurahan</label>
                        <input
                          type="text"
                          className="form-control"
                          value={bio?.kelurahan || "-"}
                          disabled
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">No. HP / WhatsApp</label>
                        <input
                          type="text"
                          className="form-control"
                          value={bio?.noHp || "-"}
                          disabled
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Email</label>
                        <input
                          type="email"
                          className="form-control"
                          value={bio?.email || "-"}
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 2 && (
                  <div>
                    <h6 className="fw-bold mb-3 text-secondary">
                      Bagian 2: Latar Belakang Pendidikan & Pekerjaan
                    </h6>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Pendidikan Terakhir</label>
                        <input
                          type="text"
                          className="form-control"
                          value={pend?.pendidikanTerakhir || "-"}
                          disabled
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Nama Instansi / Sekolah</label>
                        <input
                          type="text"
                          className="form-control"
                          value={pend?.namaInstansi || "-"}
                          disabled
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Jurusan</label>
                        <input
                          type="text"
                          className="form-control"
                          value={pend?.jurusan || "-"}
                          disabled
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Pekerjaan Saat Ini</label>
                        <input
                          type="text"
                          className="form-control"
                          value={pend?.pekerjaanSaatIni || "-"}
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 3 && (
                  <div>
                    <h6 className="fw-bold mb-3 text-secondary">
                      Bagian 3: Dokumen Pendukung Terunggah
                    </h6>
                    <div className="row g-3">
                      {pendaftaran.dokumen.map((doc) => (
                        <div className="col-md-6" key={doc.persyaratanId}>
                          <label className="form-label">{doc.namaPersyaratan}</label>
                          <div className="input-group">
                            <input
                              type="text"
                              className="form-control"
                              value={doc.fileName || "Berkas Tersimpan"}
                              disabled
                            />
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              onClick={() =>
                                onPreviewFile?.(
                                  doc.fileName || doc.namaPersyaratan,
                                  doc.fileUrl || (doc.id ? `/api/dokumen/${doc.id}/view` : undefined)
                                )
                              }
                            >
                              <i className="bi bi-eye"></i> Lihat File
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 4 && (
                  <div>
                    <h6 className="fw-bold mb-3 text-secondary">Bagian 4: Lembar Persetujuan</h6>
                    <div className="form-check mb-3">
                      <input className="form-check-input" type="checkbox" checked disabled />
                      <label className="form-check-label small text-muted">
                        Saya menyatakan bahwa seluruh data dan dokumen yang saya unggah adalah benar dan sah. (Disetujui pada {pendaftaran.submittedAt || "02 Sep 2026"})
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer bg-light justify-content-end">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                <i className="bi bi-x-circle me-1"></i>Tutup Window
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WizardReadonlyModal;
