import React, { useState, useEffect } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  step1BiodataSchema,
  step2PendidikanSchema,
  type Step1BiodataInput,
  type Step2PendidikanInput,
} from "@beasiswaapp/contracts";
import { appStore, useCurrentUser } from "@/lib/store";
import { dokumenApi } from "@/lib/api";
import {
  useSaveStep1Mutation,
  useSaveStep2Mutation,
  useSaveStep3Mutation,
  useSubmitApplicationMutation,
  mergeWithDefaultDocuments,
} from "@/hooks/use-transaksi-queries";
import { useUploadDokumenMutation } from "@/hooks/use-dokumen-mutations";
import type { DokumenUploadItem, PendaftaranRecord, BiodataData, PendidikanData } from "@/types";

interface WizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendaftaran: PendaftaranRecord;
  onSubmitted?: () => void;
  readOnly?: boolean;
}

const wizardSchema = z.object({
  biodata: step1BiodataSchema,
  pendidikan: step2PendidikanSchema,
  pernyataanSah: z.boolean().refine((val) => val === true, {
    message: "Anda wajib mencentang pernyataan keabsahan data.",
  }),
});

export const WizardModal: React.FC<WizardModalProps> = ({
  isOpen,
  onClose,
  pendaftaran,
  onSubmitted,
  readOnly = false,
}) => {
  const isStatusLocked =
    pendaftaran.status === "SUBMITTED" ||
    pendaftaran.status === "DALAM_PROSES_ADMIN" ||
    pendaftaran.status === "LOLOS_ADMIN" ||
    pendaftaran.status === "DALAM_PROSES_WAWANCARA" ||
    pendaftaran.status === "LULUS_DITERIMA" ||
    pendaftaran.status === "TIDAK_LOLOS_ADMIN" ||
    pendaftaran.status === "TIDAK_LULUS_WAWANCARA";

  const isReadOnly = Boolean(readOnly || isStatusLocked);
  const isRevisionMode = !isReadOnly && pendaftaran.status === "REVISI";

  // Resume-later: start at stepWizardTerakhir (or Step 3 if revision mode, Step 1 if read-only)
  const initialStep = isReadOnly ? 1 : isRevisionMode ? 3 : Math.min(Math.max(pendaftaran.stepWizardTerakhir || 1, 1), 4);
  const [currentStep, setCurrentStep] = useState(initialStep);

  const saveStep1Mutation = useSaveStep1Mutation();
  const saveStep2Mutation = useSaveStep2Mutation();
  const saveStep3Mutation = useSaveStep3Mutation();
  const submitApplicationMutation = useSubmitApplicationMutation();
  const uploadDokumenMutation = useUploadDokumenMutation();

  // Form State Step 3 (Documents)
  const [documents, setDocuments] = useState<DokumenUploadItem[]>(() =>
    mergeWithDefaultDocuments(pendaftaran.dokumen)
  );

  useEffect(() => {
    if (pendaftaran.dokumen && pendaftaran.dokumen.length > 0) {
      setDocuments(mergeWithDefaultDocuments(pendaftaran.dokumen));
    }
  }, [pendaftaran.dokumen]);

  const currentUser = useCurrentUser();

  const resolvedNik =
    (pendaftaran.biodata?.nik && pendaftaran.biodata.nik !== "-" ? pendaftaran.biodata.nik : "") ||
    (pendaftaran.userNik && pendaftaran.userNik !== "-" ? pendaftaran.userNik : "") ||
    currentUser?.nik ||
    (currentUser?.id?.startsWith("user-") ? currentUser.id.replace("user-", "") : "") ||
    "";

  const resolvedNama =
    (pendaftaran.biodata?.namaLengkap && pendaftaran.biodata.namaLengkap !== "-" ? pendaftaran.biodata.namaLengkap : "") ||
    (pendaftaran.userName && pendaftaran.userName !== "-" ? pendaftaran.userName : "") ||
    currentUser?.name ||
    "";

  const resolvedEmail =
    pendaftaran.biodata?.email ||
    currentUser?.email ||
    "";

  const form = useForm({
    defaultValues: {
      biodata: {
        nik: resolvedNik,
        namaLengkap: resolvedNama,
        tempatLahir: pendaftaran.biodata?.tempatLahir || "",
        tglLahir: pendaftaran.biodata?.tglLahir || "",
        jenisKelamin: (pendaftaran.biodata?.jenisKelamin === "P" ? "P" : "L") as "L" | "P",
        alamat: pendaftaran.biodata?.alamat || "",
        provinsi: pendaftaran.biodata?.provinsi || "",
        kabupatenKota: pendaftaran.biodata?.kabupatenKota || "",
        kecamatan: pendaftaran.biodata?.kecamatan || "",
        kelurahan: pendaftaran.biodata?.kelurahan || "",
        noHp: pendaftaran.biodata?.noHp || "",
        noWa: pendaftaran.biodata?.noWa || "",
        email: resolvedEmail,
      },
      pendidikan: {
        pendidikanTerakhir: pendaftaran.pendidikan?.pendidikanTerakhir || "",
        namaInstansi: pendaftaran.pendidikan?.namaInstansi || "",
        jurusan: pendaftaran.pendidikan?.jurusan || "",
        pekerjaanSaatIni: pendaftaran.pendidikan?.pekerjaanSaatIni || "",
      },
      pernyataanSah: false,
    },
    validators: {
      onSubmit: ({ value }) => {
        const parsed = wizardSchema.safeParse(value);
        if (!parsed.success) {
          return parsed.error.issues[0]?.message || "Validasi formulir pendaftaran belum lengkap.";
        }
        return undefined;
      },
    },
    onSubmit: async ({ value }) => {
      try {
        await saveStep1Mutation.mutateAsync({ id: pendaftaran.id, biodata: value.biodata });
        await saveStep2Mutation.mutateAsync({ id: pendaftaran.id, pendidikan: value.pendidikan });
        await saveStep3Mutation.mutateAsync({ id: pendaftaran.id, dokumen: documents });
        await submitApplicationMutation.mutateAsync(pendaftaran.id);

        toast.success(
          "Pendaftaran berhasil dikirim! Berkas Anda sekarang dalam proses verifikasi administrasi."
        );
        onSubmitted?.();
        onClose();
      } catch (err: any) {
        toast.error(err.message || "Gagal mengirim formulir pendaftaran.");
      }
    },
  });

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(isReadOnly ? 1 : isRevisionMode ? 3 : Math.min(Math.max(pendaftaran.stepWizardTerakhir || 1, 1), 4));
    }
  }, [isOpen, isRevisionMode, isReadOnly]);

  if (!isOpen) return null;

  const validateStep1 = () => {
    const parsed = step1BiodataSchema.safeParse(form.getFieldValue("biodata"));
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Periksa kembali isian Bagian 1.");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const parsed = step2PendidikanSchema.safeParse(form.getFieldValue("pendidikan"));
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Periksa kembali isian Bagian 2.");
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      const parsed = step1BiodataSchema.safeParse(form.getFieldValue("biodata"));
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message || "Periksa kembali isian Bagian 1.");
        return;
      }
      try {
        await saveStep1Mutation.mutateAsync({ id: pendaftaran.id, biodata: parsed.data });
        toast.success("Bagian 1 tersimpan otomatis!");
        setCurrentStep(2);
      } catch (err: any) {
        toast.error(err.message || "Gagal menyimpan biodata.");
      }
    } else if (currentStep === 2) {
      const parsed = step2PendidikanSchema.safeParse(form.getFieldValue("pendidikan"));
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message || "Periksa kembali isian Bagian 2.");
        return;
      }
      try {
        await saveStep2Mutation.mutateAsync({ id: pendaftaran.id, pendidikan: parsed.data });
        toast.success("Bagian 2 tersimpan otomatis!");
        setCurrentStep(3);
      } catch (err: any) {
        toast.error(err.message || "Gagal menyimpan riwayat pendidikan.");
      }
    } else if (currentStep === 3) {
      try {
        await saveStep3Mutation.mutateAsync({ id: pendaftaran.id, dokumen: documents });
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
      if (currentStep === 1) {
        await saveStep1Mutation.mutateAsync({ id: pendaftaran.id, biodata: form.getFieldValue("biodata") as BiodataData });
      } else if (currentStep === 2) {
        await saveStep2Mutation.mutateAsync({ id: pendaftaran.id, pendidikan: form.getFieldValue("pendidikan") as PendidikanData });
      } else if (currentStep === 3) {
        await saveStep3Mutation.mutateAsync({ id: pendaftaran.id, dokumen: documents });
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
      const uploadRes = await uploadDokumenMutation.mutateAsync({
        pendaftaranId: pendaftaran.id || "pending",
        kodePermohonan: pendaftaran.kodePermohonan || "DRAFT",
        persyaratanId,
        file,
      });

      const docId = uploadRes.dokumen?.id;
      const fileUrl = docId ? dokumenApi.getViewUrl(docId) : undefined;

      const updated = documents.map((doc) => {
        if (doc.persyaratanId === persyaratanId) {
          return {
            ...doc,
            id: docId || doc.id,
            dokumenId: docId || doc.id,
            fileName: file.name,
            fileSize: `${(file.size / 1024).toFixed(0)} KB`,
            mimeType: file.type,
            format: file.name.split(".").pop()?.toUpperCase() || "PDF",
            fileUrl,
            isSesuai: true,
            isRejected: false,
            catatanRevisi: undefined,
          };
        }
        return doc;
      });

      setDocuments(updated);
      appStore.saveStep3(pendaftaran.id, updated);
      if (pendaftaran.id) {
        await saveStep3Mutation.mutateAsync({ id: pendaftaran.id, dokumen: updated });
      }
      toast.success(`Berkas ${file.name} berhasil diunggah dan tersimpan!`);
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunggah berkas ke server.");
      e.target.value = "";
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
            <div className={`modal-header ${isReadOnly ? "bg-secondary" : "bg-primary"} text-white`}>
              <h5 className="modal-title fw-bold">
                {isReadOnly ? (
                  <>
                    <i className="bi bi-lock-fill me-2" />
                    Formulir Pendaftaran (Read-Only) — {pendaftaran.beasiswaNama}
                  </>
                ) : isRevisionMode ? (
                  <>
                    <i className="bi bi-pencil-square me-2" />
                    Perbaikan Berkas Pendaftaran (Revisi) — {pendaftaran.beasiswaNama}
                  </>
                ) : (
                  <>Formulir Pendaftaran — {pendaftaran.beasiswaNama}</>
                )}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
              ></button>
            </div>

            <div className="modal-body p-0">
              {isReadOnly && (
                <div className="bg-warning-subtle p-3 border-bottom d-flex align-items-center text-dark">
                  <i className="bi bi-lock-fill fs-5 me-2 text-warning-emphasis"></i>
                  <span className="small">
                    Data pendaftaran ini berstatus <strong>{pendaftaran.status}</strong>. Seluruh kolom isian dalam mode <strong>baca saja (read-only)</strong>.
                  </span>
                </div>
              )}
              {isRevisionMode && (
                <div className="bg-info-subtle p-3 border-bottom d-flex align-items-center text-dark">
                  <i className="bi bi-pencil-fill fs-5 me-2 text-info-emphasis"></i>
                  <span className="small">
                    Permohonan dalam status <strong>Revisi</strong>. Silakan perbaiki hanya berkas atau data yang ditandai oleh Verifikator.
                  </span>
                </div>
              )}

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
                      if (isReadOnly || validateStep1()) setCurrentStep(2);
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
                      if (isReadOnly || (validateStep1() && validateStep2())) setCurrentStep(3);
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
                      if (isReadOnly || (validateStep1() && validateStep2())) setCurrentStep(4);
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
                        <form.Field name="biodata.nik">
                          {(field) => (
                            <div>
                              <label htmlFor={field.name} className="form-label">
                                NIK (Nomor Induk Kependudukan) <span className="text-danger">*</span>
                              </label>
                              <input
                                id={field.name}
                                name={field.name}
                                type="text"
                                className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                                placeholder="Masukkan 16 digit NIK"
                                maxLength={16}
                                value={field.state.value}
                                disabled={isReadOnly}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                              />
                              {field.state.meta.errors.map((error) => (
                                <div
                                  key={String((error as any)?.message ?? error)}
                                  className="invalid-feedback d-block"
                                >
                                  {(error as any)?.message ?? String(error)}
                                </div>
                              ))}
                            </div>
                          )}
                        </form.Field>
                      </div>

                      <div className="col-md-6">
                        <form.Field name="biodata.namaLengkap">
                          {(field) => (
                            <div>
                              <label htmlFor={field.name} className="form-label">
                                Nama Lengkap <span className="text-danger">*</span>
                              </label>
                              <input
                                id={field.name}
                                name={field.name}
                                type="text"
                                className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                                placeholder="Masukkan nama sesuai KTP"
                                value={field.state.value}
                                disabled={isReadOnly}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                              />
                              {field.state.meta.errors.map((error) => (
                                <div
                                  key={String((error as any)?.message ?? error)}
                                  className="invalid-feedback d-block"
                                >
                                  {(error as any)?.message ?? String(error)}
                                </div>
                              ))}
                            </div>
                          )}
                        </form.Field>
                      </div>

                      <div className="col-md-4">
                        <form.Field name="biodata.tempatLahir">
                          {(field) => (
                            <div>
                              <label htmlFor={field.name} className="form-label">
                                Tempat Lahir <span className="text-danger">*</span>
                              </label>
                              <input
                                id={field.name}
                                name={field.name}
                                type="text"
                                className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                                placeholder="Kota tempat lahir"
                                value={field.state.value}
                                disabled={isReadOnly}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                              />
                              {field.state.meta.errors.map((error) => (
                                <div
                                  key={String((error as any)?.message ?? error)}
                                  className="invalid-feedback d-block"
                                >
                                  {(error as any)?.message ?? String(error)}
                                </div>
                              ))}
                            </div>
                          )}
                        </form.Field>
                      </div>

                      <div className="col-md-4">
                        <form.Field name="biodata.tglLahir">
                          {(field) => (
                            <div>
                              <label htmlFor={field.name} className="form-label">
                                Tanggal Lahir <span className="text-danger">*</span>
                              </label>
                              <input
                                id={field.name}
                                name={field.name}
                                type="date"
                                className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                                value={field.state.value}
                                disabled={isReadOnly}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                              />
                              {field.state.meta.errors.map((error) => (
                                <div
                                  key={String((error as any)?.message ?? error)}
                                  className="invalid-feedback d-block"
                                >
                                  {(error as any)?.message ?? String(error)}
                                </div>
                              ))}
                            </div>
                          )}
                        </form.Field>
                      </div>

                      <div className="col-md-4">
                        <form.Field name="biodata.jenisKelamin">
                          {(field) => (
                            <div>
                              <label htmlFor={field.name} className="form-label">
                                Jenis Kelamin <span className="text-danger">*</span>
                              </label>
                              <select
                                id={field.name}
                                name={field.name}
                                className={`form-select ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                                value={field.state.value}
                                disabled={isReadOnly}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange((e.target.value || "L") as "L" | "P")}
                              >
                                <option value="">Pilih Jenis Kelamin...</option>
                                <option value="L">Laki-laki</option>
                                <option value="P">Perempuan</option>
                              </select>
                              {field.state.meta.errors.map((error) => (
                                <div
                                  key={String((error as any)?.message ?? error)}
                                  className="invalid-feedback d-block"
                                >
                                  {(error as any)?.message ?? String(error)}
                                </div>
                              ))}
                            </div>
                          )}
                        </form.Field>
                      </div>

                      <div className="col-md-12">
                        <form.Field name="biodata.alamat">
                          {(field) => (
                            <div>
                              <label htmlFor={field.name} className="form-label">
                                Alamat Domisili <span className="text-danger">*</span>
                              </label>
                              <textarea
                                id={field.name}
                                name={field.name}
                                className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                                rows={2}
                                placeholder="Nama jalan, RT/RW, no. rumah"
                                value={field.state.value}
                                disabled={isReadOnly}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                              />
                              {field.state.meta.errors.map((error) => (
                                <div
                                  key={String((error as any)?.message ?? error)}
                                  className="invalid-feedback d-block"
                                >
                                  {(error as any)?.message ?? String(error)}
                                </div>
                              ))}
                            </div>
                          )}
                        </form.Field>
                      </div>

                      <div className="col-md-3">
                        <form.Field name="biodata.provinsi">
                          {(field) => (
                            <div>
                              <label htmlFor={field.name} className="form-label">
                                Provinsi <span className="text-danger">*</span>
                              </label>
                              <select
                                id={field.name}
                                name={field.name}
                                className={`form-select ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                                value={field.state.value}
                                disabled={isReadOnly}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                              >
                                <option value="">Pilih Provinsi...</option>
                                <option value="Jawa Barat">Jawa Barat</option>
                                <option value="DKI Jakarta">DKI Jakarta</option>
                                <option value="Jawa Tengah">Jawa Tengah</option>
                                <option value="Jawa Timur">Jawa Timur</option>
                              </select>
                              {field.state.meta.errors.map((error) => (
                                <div
                                  key={String((error as any)?.message ?? error)}
                                  className="invalid-feedback d-block"
                                >
                                  {(error as any)?.message ?? String(error)}
                                </div>
                              ))}
                            </div>
                          )}
                        </form.Field>
                      </div>

                      <div className="col-md-3">
                        <form.Field name="biodata.kabupatenKota">
                          {(field) => (
                            <div>
                              <label htmlFor={field.name} className="form-label">
                                Kabupaten/Kota <span className="text-danger">*</span>
                              </label>
                              <select
                                id={field.name}
                                name={field.name}
                                className={`form-select ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                                value={field.state.value}
                                disabled={isReadOnly}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                              >
                                <option value="">Pilih Kabupaten/Kota...</option>
                                <option value="Kota Bandung">Kota Bandung</option>
                                <option value="Kab. Bogor">Kab. Bogor</option>
                                <option value="Kota Jakarta Pusat">Kota Jakarta Pusat</option>
                                <option value="Kota Surabaya">Kota Surabaya</option>
                              </select>
                              {field.state.meta.errors.map((error) => (
                                <div
                                  key={String((error as any)?.message ?? error)}
                                  className="invalid-feedback d-block"
                                >
                                  {(error as any)?.message ?? String(error)}
                                </div>
                              ))}
                            </div>
                          )}
                        </form.Field>
                      </div>

                      <div className="col-md-3">
                        <form.Field name="biodata.kecamatan">
                          {(field) => (
                            <div>
                              <label htmlFor={field.name} className="form-label">
                                Kecamatan <span className="text-danger">*</span>
                              </label>
                              <select
                                id={field.name}
                                name={field.name}
                                className={`form-select ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                                value={field.state.value}
                                disabled={isReadOnly}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                              >
                                <option value="">Pilih Kecamatan...</option>
                                <option value="Coblong">Coblong</option>
                                <option value="Cicendo">Cicendo</option>
                                <option value="Sukasari">Sukasari</option>
                              </select>
                              {field.state.meta.errors.map((error) => (
                                <div
                                  key={String((error as any)?.message ?? error)}
                                  className="invalid-feedback d-block"
                                >
                                  {(error as any)?.message ?? String(error)}
                                </div>
                              ))}
                            </div>
                          )}
                        </form.Field>
                      </div>

                      <div className="col-md-3">
                        <form.Field name="biodata.kelurahan">
                          {(field) => (
                            <div>
                              <label htmlFor={field.name} className="form-label">
                                Kelurahan <span className="text-danger">*</span>
                              </label>
                              <select
                                id={field.name}
                                name={field.name}
                                className={`form-select ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                                value={field.state.value}
                                disabled={isReadOnly}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                              >
                                <option value="">Pilih Kelurahan...</option>
                                <option value="Dago">Dago</option>
                                <option value="Pasirkaliki">Pasirkaliki</option>
                                <option value="Lebakgede">Lebakgede</option>
                              </select>
                              {field.state.meta.errors.map((error) => (
                                <div
                                  key={String((error as any)?.message ?? error)}
                                  className="invalid-feedback d-block"
                                >
                                  {(error as any)?.message ?? String(error)}
                                </div>
                              ))}
                            </div>
                          )}
                        </form.Field>
                      </div>

                      <div className="col-md-6">
                        <form.Field name="biodata.noHp">
                          {(field) => (
                            <div>
                              <label htmlFor={field.name} className="form-label">
                                No. HP / WhatsApp <span className="text-danger">*</span>
                              </label>
                              <input
                                id={field.name}
                                name={field.name}
                                type="tel"
                                className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                                placeholder="Contoh: 081234567890"
                                value={field.state.value}
                                disabled={isReadOnly}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                              />
                              {field.state.meta.errors.map((error) => (
                                <div
                                  key={String((error as any)?.message ?? error)}
                                  className="invalid-feedback d-block"
                                >
                                  {(error as any)?.message ?? String(error)}
                                </div>
                              ))}
                            </div>
                          )}
                        </form.Field>
                      </div>

                      <div className="col-md-6">
                        <form.Field name="biodata.email">
                          {(field) => (
                            <div>
                              <label htmlFor={field.name} className="form-label">
                                Alamat Email <span className="text-danger">*</span>
                              </label>
                              <input
                                id={field.name}
                                name={field.name}
                                type="email"
                                className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                                placeholder="nama@email.com"
                                value={field.state.value}
                                disabled={isReadOnly}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                              />
                              {field.state.meta.errors.map((error) => (
                                <div
                                  key={String((error as any)?.message ?? error)}
                                  className="invalid-feedback d-block"
                                >
                                  {(error as any)?.message ?? String(error)}
                                </div>
                              ))}
                            </div>
                          )}
                        </form.Field>
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
                        <form.Field name="pendidikan.pendidikanTerakhir">
                          {(field) => (
                            <div>
                              <label htmlFor={field.name} className="form-label">
                                Pendidikan Terakhir <span className="text-danger">*</span>
                              </label>
                              <select
                                id={field.name}
                                name={field.name}
                                className={`form-select ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                                value={field.state.value}
                                disabled={isReadOnly}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                              >
                                <option value="">Pilih Jenjang Pendidikan...</option>
                                <option value="SMA/SMK Sederajat">SMA/SMK Sederajat</option>
                                <option value="D3 / D4">D3 / D4</option>
                                <option value="S1 (Sarjana)">S1 (Sarjana)</option>
                                <option value="S2 / S3">S2 / S3</option>
                              </select>
                              {field.state.meta.errors.map((error) => (
                                <div
                                  key={String((error as any)?.message ?? error)}
                                  className="invalid-feedback d-block"
                                >
                                  {(error as any)?.message ?? String(error)}
                                </div>
                              ))}
                            </div>
                          )}
                        </form.Field>
                      </div>
                      <div className="col-md-6">
                        <form.Field name="pendidikan.namaInstansi">
                          {(field) => (
                            <div>
                              <label htmlFor={field.name} className="form-label">
                                Nama Instansi / Sekolah / Universitas <span className="text-danger">*</span>
                              </label>
                              <input
                                id={field.name}
                                name={field.name}
                                type="text"
                                className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                                placeholder="Contoh: Universitas Komputer Indonesia"
                                value={field.state.value}
                                disabled={isReadOnly}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                              />
                              {field.state.meta.errors.map((error) => (
                                <div
                                  key={String((error as any)?.message ?? error)}
                                  className="invalid-feedback d-block"
                                >
                                  {(error as any)?.message ?? String(error)}
                                </div>
                              ))}
                            </div>
                          )}
                        </form.Field>
                      </div>
                      <div className="col-md-6">
                        <form.Field name="pendidikan.jurusan">
                          {(field) => (
                            <div>
                              <label htmlFor={field.name} className="form-label">
                                Jurusan / Program Studi <span className="text-danger">*</span>
                              </label>
                              <input
                                id={field.name}
                                name={field.name}
                                type="text"
                                className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                                placeholder="Contoh: Teknik Informatika"
                                value={field.state.value}
                                disabled={isReadOnly}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                              />
                              {field.state.meta.errors.map((error) => (
                                <div
                                  key={String((error as any)?.message ?? error)}
                                  className="invalid-feedback d-block"
                                >
                                  {(error as any)?.message ?? String(error)}
                                </div>
                              ))}
                            </div>
                          )}
                        </form.Field>
                      </div>
                      <div className="col-md-6">
                        <form.Field name="pendidikan.pekerjaanSaatIni">
                          {(field) => (
                            <div>
                              <label htmlFor={field.name} className="form-label">
                                Pekerjaan Saat Ini <span className="text-danger">*</span>
                              </label>
                              <input
                                id={field.name}
                                name={field.name}
                                type="text"
                                className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                                placeholder="Contoh: Software Developer / Freelancer"
                                value={field.state.value}
                                disabled={isReadOnly}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                              />
                              {field.state.meta.errors.map((error) => (
                                <div
                                  key={String((error as any)?.message ?? error)}
                                  className="invalid-feedback d-block"
                                >
                                  {(error as any)?.message ?? String(error)}
                                </div>
                              ))}
                            </div>
                          )}
                        </form.Field>
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
                            {isReadOnly ? (
                              <div className="input-group">
                                <input
                                  type="text"
                                  className="form-control bg-light"
                                  value={doc.fileName || "Berkas Tersimpan"}
                                  disabled
                                />
                                {(doc.fileUrl || doc.id || doc.dokumenId) ? (
                                  <button
                                    type="button"
                                    className="btn btn-outline-primary"
                                    onClick={() => {
                                      const id = doc.dokumenId || doc.id;
                                      const url = doc.fileUrl || (id ? dokumenApi.getViewUrl(id) : undefined);
                                      if (url) window.open(url, "_blank");
                                    }}
                                  >
                                    <i className="bi bi-eye me-1"></i>Lihat
                                  </button>
                                ) : (
                                  <span className="input-group-text bg-secondary-subtle text-muted small">
                                    Tidak ada berkas
                                  </span>
                                )}
                              </div>
                            ) : isLockedInRevision ? (
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
                                  <div className="form-text d-flex align-items-center justify-content-between mt-1">
                                    <span className="text-success">
                                      <i className="bi bi-check-circle-fill me-1"></i>
                                      File tersimpan: <span className="fw-semibold">{doc.fileName}</span> {doc.fileSize ? `(${doc.fileSize})` : ""}
                                    </span>
                                    {(doc.fileUrl || doc.id || doc.dokumenId) && (
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-link p-0 text-primary text-decoration-none"
                                        onClick={() => {
                                          const id = doc.dokumenId || doc.id;
                                          const url = doc.fileUrl || (id ? dokumenApi.getViewUrl(id) : undefined);
                                          if (url) window.open(url, "_blank");
                                        }}
                                      >
                                        <i className="bi bi-eye me-1"></i>Pratinjau
                                      </button>
                                    )}
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
                    <form.Subscribe
                      selector={(state) => ({
                        biodata: state.values.biodata,
                        pendidikan: state.values.pendidikan,
                      })}
                    >
                      {({ biodata: biodataVal, pendidikan: pendidikanVal }) => (
                        <div className="card border mb-3 bg-light">
                          <div className="card-body small">
                            <h6 className="fw-bold">Ringkasan Data Pendaftaran:</h6>
                            <p className="mb-1">
                              <strong>Program Pelatihan:</strong> {pendaftaran.beasiswaNama}
                            </p>
                            <p className="mb-1">
                              <strong>Nama / NIK:</strong> {biodataVal.namaLengkap} ({biodataVal.nik})
                            </p>
                            <p className="mb-1">
                              <strong>Domisili:</strong> {biodataVal.alamat}, {biodataVal.kabupatenKota}, {biodataVal.provinsi}
                            </p>
                            <p className="mb-0">
                              <strong>Pendidikan:</strong> {pendidikanVal.pendidikanTerakhir} — {pendidikanVal.namaInstansi} ({pendidikanVal.jurusan})
                            </p>
                          </div>
                        </div>
                      )}
                    </form.Subscribe>

                    <div className="alert alert-light border">
                      <p className="small mb-0 text-muted">
                        {isReadOnly
                          ? `Pendaftaran telah berstatus ${pendaftaran.status}. Seluruh rincian data dan dokumen berada pada mode hanya baca (read-only).`
                          : "Pastikan Anda telah memeriksa kembali seluruh isian pada Step 1 hingga Step 3 sebelum menekan tombol Submit Final. Data yang telah dikirim tidak dapat diubah kembali."}
                      </p>
                    </div>

                    <form.Field name="pernyataanSah">
                      {(field) => (
                        <div>
                          <div className="form-check mb-3 mt-3">
                            <input
                              className={`form-check-input ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                              type="checkbox"
                              id={field.name}
                              name={field.name}
                              checked={isReadOnly ? true : field.state.value}
                              disabled={isReadOnly}
                              onBlur={field.handleBlur}
                              onChange={(e) => field.handleChange(e.target.checked)}
                              required
                            />
                            <label className="form-check-label small" htmlFor={field.name}>
                              Saya menyatakan dengan sesungguhnya bahwa seluruh data dan dokumen yang saya unggah adalah benar, sah, dan milik saya pribadi. Apabila di kemudian hari ditemukan kebohongan, saya bersedia didiskualifikasi dari seleksi pendaftaran.
                            </label>
                          </div>
                          {!isReadOnly && field.state.meta.errors.map((error) => (
                            <div
                              key={String((error as any)?.message ?? error)}
                              className="invalid-feedback d-block"
                            >
                              {(error as any)?.message ?? String(error)}
                            </div>
                          ))}
                        </div>
                      )}
                    </form.Field>
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
                {!isReadOnly && (
                  <button
                    type="button"
                    className="btn btn-outline-primary me-2"
                    onClick={handleSaveDraft}
                  >
                    <i className="bi bi-bookmark me-1"></i>Simpan Draft
                  </button>
                )}

                {currentStep < 4 ? (
                  <button type="button" className="btn btn-primary" onClick={handleNext}>
                    Selanjutnya <i className="bi bi-arrow-right ms-1"></i>
                  </button>
                ) : isReadOnly ? (
                  <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                    <i className="bi bi-x-lg me-1"></i> Tutup
                  </button>
                ) : (
                  <form.Subscribe
                    selector={(state) => [state.canSubmit, state.isSubmitting, state.values.pernyataanSah]}
                  >
                    {([canSubmit, isSubmitting, pernyataanSahVal]) => (
                      <button
                        type="button"
                        className="btn btn-success"
                        onClick={() => form.handleSubmit()}
                        disabled={!canSubmit || isSubmitting || !pernyataanSahVal}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" />
                            Mengirim...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-send me-1"></i> Kirim Pendaftaran (Submit)
                          </>
                        )}
                      </button>
                    )}
                  </form.Subscribe>
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
