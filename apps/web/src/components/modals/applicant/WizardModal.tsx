import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { appStore } from "@/lib/store";
import { dokumenApi, transaksiApi } from "@/lib/api";
import type { BiodataData, DokumenUploadItem, PendaftaranRecord, PendidikanData } from "@/types";

interface WizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendaftaran: PendaftaranRecord;
  onSubmitted?: () => void;
}

export const WizardModal: React.FC<WizardModalProps> = ({
  isOpen,
  onClose,
  pendaftaran,
  onSubmitted,
}) => {
  const isRevisionMode = pendaftaran.status === "REVISI";

  // Resume-later: start at stepWizardTerakhir (or Step 3 if revision mode)
  const initialStep = isRevisionMode ? 3 : Math.min(Math.max(pendaftaran.stepWizardTerakhir || 1, 1), 4);
  const [currentStep, setCurrentStep] = useState(initialStep);

  // Form State Step 1
  const [biodata, setBiodata] = useState<BiodataData>({
    nik: pendaftaran.biodata?.nik || pendaftaran.userNik || "",
    namaLengkap: pendaftaran.biodata?.namaLengkap || pendaftaran.userName || "",
    tempatLahir: pendaftaran.biodata?.tempatLahir || "",
    tglLahir: pendaftaran.biodata?.tglLahir || "",
    jenisKelamin: pendaftaran.biodata?.jenisKelamin || "",
    alamat: pendaftaran.biodata?.alamat || "",
    provinsi: pendaftaran.biodata?.provinsi || "",
    kabupatenKota: pendaftaran.biodata?.kabupatenKota || "",
    kecamatan: pendaftaran.biodata?.kecamatan || "",
    kelurahan: pendaftaran.biodata?.kelurahan || "",
    noHp: pendaftaran.biodata?.noHp || "",
    email: pendaftaran.biodata?.email || "",
  });

  // Form State Step 2
  const [pendidikan, setPendidikan] = useState<PendidikanData>({
    pendidikanTerakhir: pendaftaran.pendidikan?.pendidikanTerakhir || "",
    namaInstansi: pendaftaran.pendidikan?.namaInstansi || "",
    jurusan: pendaftaran.pendidikan?.jurusan || "",
    pekerjaanSaatIni: pendaftaran.pendidikan?.pekerjaanSaatIni || "",
  });

  // Form State Step 3 (Documents)
  const [documents, setDocuments] = useState<DokumenUploadItem[]>(
    pendaftaran.dokumen.length > 0
      ? pendaftaran.dokumen
      : [
          {
            persyaratanId: "req-ktp",
            namaPersyaratan: "Upload KTP",
            fileName: "",
            fileSize: "",
            mimeType: "image/jpeg",
            format: "JPG",
          },
          {
            persyaratanId: "req-kk",
            namaPersyaratan: "Upload Kartu Keluarga (KK)",
            fileName: "",
            fileSize: "",
            mimeType: "application/pdf",
            format: "PDF",
          },
          {
            persyaratanId: "req-ijazah",
            namaPersyaratan: "Upload Ijazah Terakhir",
            fileName: "",
            fileSize: "",
            mimeType: "application/pdf",
            format: "PDF",
          },
          {
            persyaratanId: "req-rekom",
            namaPersyaratan: "Upload Surat Rekomendasi / Keterangan",
            fileName: "",
            fileSize: "",
            mimeType: "application/pdf",
            format: "PDF",
          },
        ]
  );

  // Form State Step 4
  const [pernyataanSah, setPernyataanSah] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(isRevisionMode ? 3 : Math.min(Math.max(pendaftaran.stepWizardTerakhir || 1, 1), 4));
    }
  }, [isOpen, isRevisionMode, pendaftaran.stepWizardTerakhir]);

  if (!isOpen) return null;

  const validateStep1 = () => {
    if (!/^\d{16}$/.test(biodata.nik)) {
      toast.error("NIK harus 16 digit angka.");
      return false;
    }
    if (biodata.namaLengkap.trim().length < 3) {
      toast.error("Nama lengkap wajib diisi minimal 3 karakter.");
      return false;
    }
    if (!biodata.tempatLahir || !biodata.tglLahir) {
      toast.error("Tempat dan tanggal lahir wajib diisi.");
      return false;
    }
    if (!biodata.jenisKelamin) {
      toast.error("Jenis kelamin wajib dipilih.");
      return false;
    }
    if (!biodata.alamat || biodata.alamat.trim().length < 10) {
      toast.error("Alamat domisili minimal 10 karakter.");
      return false;
    }
    if (!biodata.noHp || !biodata.email.includes("@")) {
      toast.error("Nomor HP dan email valid wajib diisi.");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (
      !pendidikan.pendidikanTerakhir ||
      !pendidikan.namaInstansi.trim() ||
      !pendidikan.jurusan.trim() ||
      !pendidikan.pekerjaanSaatIni.trim()
    ) {
      toast.error("Semua bidang riwayat pendidikan & pekerjaan wajib diisi.");
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!validateStep1()) return;
      try {
        await transaksiApi.saveStep1(pendaftaran.id, biodata);
        appStore.saveStep1(pendaftaran.id, biodata);
        toast.success("Bagian 1 tersimpan otomatis!");
        setCurrentStep(2);
      } catch (err: any) {
        toast.error(err.message || "Gagal menyimpan biodata.");
      }
    } else if (currentStep === 2) {
      if (!validateStep2()) return;
      try {
        await transaksiApi.saveStep2(pendaftaran.id, pendidikan);
        appStore.saveStep2(pendaftaran.id, pendidikan);
        toast.success("Bagian 2 tersimpan otomatis!");
        setCurrentStep(3);
      } catch (err: any) {
        toast.error(err.message || "Gagal menyimpan riwayat pendidikan.");
      }
    } else if (currentStep === 3) {
      try {
        await transaksiApi.saveStep3(pendaftaran.id, documents);
        appStore.saveStep3(pendaftaran.id, documents);
        toast.success("Dokumen berhasil diperbarui!");
        setCurrentStep(4);
      } catch (err: any) {
        toast.error(err.message || "Gagal memperbarui berkas dokumen.");
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveDraft = async () => {
    try {
      if (currentStep === 1 && validateStep1()) {
        await transaksiApi.saveStep1(pendaftaran.id, biodata);
        appStore.saveStep1(pendaftaran.id, biodata);
      } else if (currentStep === 2 && validateStep2()) {
        await transaksiApi.saveStep2(pendaftaran.id, pendidikan);
        appStore.saveStep2(pendaftaran.id, pendidikan);
      } else if (currentStep === 3) {
        await transaksiApi.saveStep3(pendaftaran.id, documents);
        appStore.saveStep3(pendaftaran.id, documents);
      }
      toast.success("Draft pendaftaran berhasil disimpan ke sistem!");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan draft.");
    }
  };

  const handleFileUpload = async (persyaratanId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check SVG rejection
    if (file.name.toLowerCase().endsWith(".svg") || file.type === "image/svg+xml") {
      toast.error("Format berkas SVG dilarang secara mutlak karena alasan keamanan.");
      e.target.value = "";
      return;
    }

    // Check size limit 2MB
    if (file.size > 2 * 1024 * 1024) {
      toast.error(`Ukuran file melebihi batas 2MB (${(file.size / 1024 / 1024).toFixed(1)}MB).`);
      e.target.value = "";
      return;
    }

    // Check allowed format
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|jpg|jpeg|png)$/i)) {
      toast.error("Format berkas tidak diizinkan. Hanya PDF, JPG, dan PNG yang diperbolehkan.");
      e.target.value = "";
      return;
    }

    try {
      const uploadRes = await dokumenApi.upload(
        pendaftaran.id,
        pendaftaran.kodePermohonan,
        persyaratanId,
        file
      );

      const updated = documents.map((doc) => {
        if (doc.persyaratanId === persyaratanId) {
          return {
            ...doc,
            id: uploadRes.dokumen?.id || doc.id,
            fileName: file.name,
            fileSize: `${(file.size / 1024).toFixed(0)} KB`,
            mimeType: file.type,
            format: file.name.split(".").pop()?.toUpperCase() || "PDF",
            isSesuai: true,
            isRejected: false,
            catatanRevisi: undefined,
          };
        }
        return doc;
      });

      setDocuments(updated);
      appStore.saveStep3(pendaftaran.id, updated);
      toast.success(`Berkas ${file.name} berhasil diunggah ke server!`);
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunggah berkas ke server.");
      e.target.value = "";
    }
  };

  const handleSubmitFinal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pernyataanSah) {
      toast.error("Anda wajib mencentang pernyataan keabsahan data.");
      return;
    }

    try {
      await transaksiApi.saveStep1(pendaftaran.id, biodata);
      await transaksiApi.saveStep2(pendaftaran.id, pendidikan);
      await transaksiApi.saveStep3(pendaftaran.id, documents);
      await transaksiApi.submit(pendaftaran.id);

      appStore.saveStep1(pendaftaran.id, biodata);
      appStore.saveStep2(pendaftaran.id, pendidikan);
      appStore.saveStep3(pendaftaran.id, documents);
      appStore.submitApplication(pendaftaran.id);

      toast.success(
        "Pendaftaran berhasil dikirim! Berkas Anda sekarang dalam proses verifikasi administrasi."
      );
      onSubmitted?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengirim formulir pendaftaran.");
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
          <div className="modal-content">
            <div className="modal-header bg-primary text-white">
              <h5 className="modal-title fw-bold">
                Formulir Pendaftaran — {pendaftaran.beasiswaNama}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
              ></button>
            </div>

            <div className="modal-body p-0">
              {/* Stepper Header */}
              <ul className="nav nav-tabs nav-justified wizard-steps bg-white" role="tablist">
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${currentStep === 1 ? "active" : ""} ${currentStep > 1 ? "completed" : ""}`}
                    onClick={() => setCurrentStep(1)}
                  >
                    1. Data Diri & Kontak
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${currentStep === 2 ? "active" : ""} ${currentStep > 2 ? "completed" : ""}`}
                    onClick={() => {
                      if (validateStep1()) setCurrentStep(2);
                    }}
                  >
                    2. Pendidikan & Pekerjaan
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${currentStep === 3 ? "active" : ""} ${currentStep > 3 ? "completed" : ""}`}
                    onClick={() => {
                      if (validateStep1() && validateStep2()) setCurrentStep(3);
                    }}
                  >
                    3. Unggah Dokumen
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${currentStep === 4 ? "active" : ""}`}
                    onClick={() => {
                      if (validateStep1() && validateStep2()) setCurrentStep(4);
                    }}
                  >
                    4. Persetujuan & Submit
                  </button>
                </li>
              </ul>

              {/* Tab Contents */}
              <div className="p-4">
                {/* STEP 1 */}
                {currentStep === 1 && (
                  <div>
                    <h6 className="fw-bold mb-3 text-primary">
                      Bagian 1: Data Diri & Informasi Kontak
                    </h6>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">
                          NIK (Nomor Induk Kependudukan) <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Masukkan 16 digit NIK"
                          maxLength={16}
                          value={biodata.nik}
                          onChange={(e) => setBiodata({ ...biodata, nik: e.target.value })}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">
                          Nama Lengkap <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Masukkan nama sesuai KTP"
                          value={biodata.namaLengkap}
                          onChange={(e) => setBiodata({ ...biodata, namaLengkap: e.target.value })}
                          required
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">
                          Tempat Lahir <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Kota tempat lahir"
                          value={biodata.tempatLahir}
                          onChange={(e) => setBiodata({ ...biodata, tempatLahir: e.target.value })}
                          required
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">
                          Tanggal Lahir <span className="text-danger">*</span>
                        </label>
                        <input
                          type="date"
                          className="form-control"
                          value={biodata.tglLahir}
                          onChange={(e) => setBiodata({ ...biodata, tglLahir: e.target.value })}
                          required
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">
                          Jenis Kelamin <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          value={biodata.jenisKelamin}
                          onChange={(e) =>
                            setBiodata({
                              ...biodata,
                              jenisKelamin: e.target.value as "L" | "P" | "",
                            })
                          }
                          required
                        >
                          <option value="">Pilih Jenis Kelamin...</option>
                          <option value="L">Laki-laki</option>
                          <option value="P">Perempuan</option>
                        </select>
                      </div>
                      <div className="col-md-12">
                        <label className="form-label">
                          Alamat Domisili <span className="text-danger">*</span>
                        </label>
                        <textarea
                          className="form-control"
                          rows={2}
                          placeholder="Nama jalan, RT/RW, no. rumah"
                          value={biodata.alamat}
                          onChange={(e) => setBiodata({ ...biodata, alamat: e.target.value })}
                          required
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">
                          Provinsi <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          value={biodata.provinsi}
                          onChange={(e) => setBiodata({ ...biodata, provinsi: e.target.value })}
                          required
                        >
                          <option value="">Pilih Provinsi...</option>
                          <option value="Jawa Barat">Jawa Barat</option>
                          <option value="DKI Jakarta">DKI Jakarta</option>
                          <option value="Jawa Tengah">Jawa Tengah</option>
                          <option value="Jawa Timur">Jawa Timur</option>
                        </select>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">
                          Kabupaten/Kota <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          value={biodata.kabupatenKota}
                          onChange={(e) =>
                            setBiodata({ ...biodata, kabupatenKota: e.target.value })
                          }
                          required
                        >
                          <option value="">Pilih Kabupaten/Kota...</option>
                          <option value="Kota Bandung">Kota Bandung</option>
                          <option value="Kab. Bogor">Kab. Bogor</option>
                          <option value="Kota Jakarta Pusat">Kota Jakarta Pusat</option>
                          <option value="Kota Surabaya">Kota Surabaya</option>
                        </select>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">
                          Kecamatan <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          value={biodata.kecamatan}
                          onChange={(e) => setBiodata({ ...biodata, kecamatan: e.target.value })}
                          required
                        >
                          <option value="">Pilih Kecamatan...</option>
                          <option value="Coblong">Coblong</option>
                          <option value="Cicendo">Cicendo</option>
                          <option value="Sukasari">Sukasari</option>
                        </select>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">
                          Kelurahan <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          value={biodata.kelurahan}
                          onChange={(e) => setBiodata({ ...biodata, kelurahan: e.target.value })}
                          required
                        >
                          <option value="">Pilih Kelurahan...</option>
                          <option value="Dago">Dago</option>
                          <option value="Pasirkaliki">Pasirkaliki</option>
                          <option value="Lebakgede">Lebakgede</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">
                          No. HP / WhatsApp <span className="text-danger">*</span>
                        </label>
                        <input
                          type="tel"
                          className="form-control"
                          placeholder="Contoh: 081234567890"
                          value={biodata.noHp}
                          onChange={(e) => setBiodata({ ...biodata, noHp: e.target.value })}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">
                          Alamat Email <span className="text-danger">*</span>
                        </label>
                        <input
                          type="email"
                          className="form-control"
                          placeholder="nama@email.com"
                          value={biodata.email}
                          onChange={(e) => setBiodata({ ...biodata, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2 */}
                {currentStep === 2 && (
                  <div>
                    <h6 className="fw-bold mb-3 text-primary">
                      Bagian 2: Latar Belakang Pendidikan & Pekerjaan
                    </h6>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">
                          Pendidikan Terakhir <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          value={pendidikan.pendidikanTerakhir}
                          onChange={(e) =>
                            setPendidikan({
                              ...pendidikan,
                              pendidikanTerakhir: e.target.value,
                            })
                          }
                          required
                        >
                          <option value="">Pilih Jenjang Pendidikan...</option>
                          <option value="SMA/SMK Sederajat">SMA/SMK Sederajat</option>
                          <option value="D3 / D4">D3 / D4</option>
                          <option value="S1 (Sarjana)">S1 (Sarjana)</option>
                          <option value="S2 / S3">S2 / S3</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">
                          Nama Instansi / Sekolah / Universitas <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Contoh: Universitas Komputer Indonesia"
                          value={pendidikan.namaInstansi}
                          onChange={(e) =>
                            setPendidikan({
                              ...pendidikan,
                              namaInstansi: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">
                          Jurusan / Program Studi <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Contoh: Teknik Informatika"
                          value={pendidikan.jurusan}
                          onChange={(e) =>
                            setPendidikan({ ...pendidikan, jurusan: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">
                          Pekerjaan Saat Ini <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Contoh: Software Developer / Freelancer"
                          value={pendidikan.pekerjaanSaatIni}
                          onChange={(e) =>
                            setPendidikan({
                              ...pendidikan,
                              pekerjaanSaatIni: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3 */}
                {currentStep === 3 && (
                  <div>
                    <h6 className="fw-bold mb-3 text-primary">
                      Bagian 3: Unggah Dokumen Pendukung (PDF/JPG/PNG, Max Size 2MB per file)
                    </h6>
                    {isRevisionMode && (
                      <div className="alert alert-warning border-0 d-flex align-items-center mb-3">
                        <i className="bi bi-exclamation-triangle-fill fs-4 me-2"></i>
                        <span className="small">
                          Beberapa berkas ditolak verifikator. Silakan unggah ulang hanya dokumen yang bertanda peringatan merah.
                        </span>
                      </div>
                    )}
                    <div className="row g-3">
                      {documents.map((doc) => {
                        const isLockedInRevision = isRevisionMode && doc.isSesuai && !doc.isRejected;
                        return (
                          <div className="col-md-6" key={doc.persyaratanId}>
                            <label className="form-label fw-semibold small">
                              {doc.namaPersyaratan} <span className="text-danger">*</span>
                            </label>
                            {isLockedInRevision ? (
                              <div className="input-group">
                                <input
                                  type="text"
                                  className="form-control"
                                  value={doc.fileName || "Berkas Tersimpan"}
                                  disabled
                                />
                                <span className="input-group-text bg-success-subtle text-success">
                                  <i className="bi bi-check-circle me-1"></i>Disetujui
                                </span>
                              </div>
                            ) : (
                              <>
                                <input
                                  type="file"
                                  className={`form-control ${doc.isRejected ? "border-danger" : ""}`}
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(e) => handleFileUpload(doc.persyaratanId, e)}
                                />
                                {doc.fileName && (
                                  <div className="form-text">
                                    File tersimpan: <span className="fw-semibold">{doc.fileName}</span> ({doc.fileSize})
                                  </div>
                                )}
                                {doc.catatanRevisi && (
                                  <div className="text-danger small mt-1">
                                    <i className="bi bi-exclamation-circle me-1"></i>
                                    Catatan Verifikator: {doc.catatanRevisi}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 4 */}
                {currentStep === 4 && (
                  <div>
                    <h6 className="fw-bold mb-3 text-primary">
                      Bagian 4: Lembar Persetujuan & Pernyataan Keabsahan Data
                    </h6>
                    <div className="card border mb-3 bg-light">
                      <div className="card-body small">
                        <h6 className="fw-bold">Ringkasan Data Pendaftaran:</h6>
                        <p className="mb-1">
                          <strong>Program Pelatihan:</strong> {pendaftaran.beasiswaNama}
                        </p>
                        <p className="mb-1">
                          <strong>Nama / NIK:</strong> {biodata.namaLengkap} ({biodata.nik})
                        </p>
                        <p className="mb-1">
                          <strong>Domisili:</strong> {biodata.alamat}, {biodata.kabupatenKota}, {biodata.provinsi}
                        </p>
                        <p className="mb-0">
                          <strong>Pendidikan:</strong> {pendidikan.pendidikanTerakhir} — {pendidikan.namaInstansi} ({pendidikan.jurusan})
                        </p>
                      </div>
                    </div>

                    <div className="alert alert-light border">
                      <p className="small mb-0 text-muted">
                        Pastikan Anda telah memeriksa kembali seluruh isian pada Step 1 hingga Step 3 sebelum menekan tombol Submit Final. Data yang telah dikirim tidak dapat diubah kembali.
                      </p>
                    </div>

                    <div className="form-check mb-3 mt-3">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="checkSah"
                        checked={pernyataanSah}
                        onChange={(e) => setPernyataanSah(e.target.checked)}
                        required
                      />
                      <label className="form-check-label small" htmlFor="checkSah">
                        Saya menyatakan dengan sesungguhnya bahwa seluruh data dan dokumen yang saya unggah adalah benar, sah, dan milik saya pribadi. Apabila di kemudian hari ditemukan kebohongan, saya bersedia didiskualifikasi dari seleksi pendaftaran.
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="modal-footer bg-light justify-content-between">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handlePrev}
                disabled={currentStep === 1}
              >
                <i className="bi bi-arrow-left me-1"></i> Kembali
              </button>
              <div>
                <button
                  type="button"
                  className="btn btn-outline-primary me-2"
                  onClick={handleSaveDraft}
                >
                  <i className="bi bi-bookmark me-1"></i>Simpan Draft
                </button>

                {currentStep < 4 ? (
                  <button type="button" className="btn btn-primary" onClick={handleNext}>
                    Selanjutnya <i className="bi bi-arrow-right ms-1"></i>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={handleSubmitFinal}
                    disabled={!pernyataanSah}
                  >
                    <i className="bi bi-send me-1"></i> Kirim Pendaftaran (Submit)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WizardModal;
