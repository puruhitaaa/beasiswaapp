import React, { useEffect } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import { appStore } from "@/lib/store";
import { useSubmitWawancaraMutation } from "@/hooks/use-transaksi-queries";
import type { PendaftaranRecord } from "@/types";

interface WawancaraModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendaftaran: PendaftaranRecord | null;
  onSuccess?: () => void;
}

const wawancaraSchema = z.object({
  skorKomunikasi: z.number().min(0, "Skor minimal 0.").max(100, "Skor maksimal 100."),
  skorTeknis: z.number().min(0, "Skor minimal 0.").max(100, "Skor maksimal 100."),
  skorKomitmen: z.number().min(0, "Skor minimal 0.").max(100, "Skor maksimal 100."),
  statusHasil: z.enum(["Lulus", "Tidak Lulus"]),
  catatanEvaluasi: z.string().min(1, "Catatan evaluasi wajib diisi."),
});

export const WawancaraModal: React.FC<WawancaraModalProps> = ({
  isOpen,
  onClose,
  pendaftaran,
  onSuccess,
}) => {
  const submitWawancaraMutation = useSubmitWawancaraMutation();

  const form = useForm({
    defaultValues: {
      skorKomunikasi: pendaftaran?.wawancara?.skorKomunikasi ?? 0,
      skorTeknis: pendaftaran?.wawancara?.skorTeknis ?? 0,
      skorKomitmen: pendaftaran?.wawancara?.skorKomitmen ?? 0,
      statusHasil: (pendaftaran?.wawancara?.statusHasil ?? "Lulus") as "Lulus" | "Tidak Lulus",
      catatanEvaluasi: pendaftaran?.wawancara?.catatanEvaluasi ?? "",
    },
    validators: {
      onSubmit: wawancaraSchema,
    },
    onSubmit: async ({ value }) => {
      if (!pendaftaran) return;
      const k = Number(value.skorKomunikasi) || 0;
      const t = Number(value.skorTeknis) || 0;
      const m = Number(value.skorKomitmen) || 0;
      const nilaiAkhir = Number((k * 0.3 + t * 0.4 + m * 0.3).toFixed(2));

      try {
        await submitWawancaraMutation.mutateAsync({
          id: pendaftaran.id,
          scoring: {
            skorKomunikasi: k,
            skorTeknis: t,
            skorKomitmen: m,
            nilaiWawancara: nilaiAkhir,
            statusHasil: value.statusHasil,
            catatanEvaluasi: value.catatanEvaluasi,
          },
        });

        appStore.submitWawancaraScoring(
          pendaftaran.id,
          k,
          t,
          m,
          value.statusHasil,
          value.catatanEvaluasi
        );

        toast.success(
          `Hasil wawancara berhasil disimpan! Nilai Akhir: ${nilaiAkhir} (${value.statusHasil})`
        );
        onSuccess?.();
        onClose();
      } catch (err: any) {
        toast.error(err.message || "Gagal menyimpan hasil penilaian wawancara.");
      }
    },
  });

  useEffect(() => {
    if (pendaftaran) {
      if (pendaftaran.wawancara) {
        form.reset({
          skorKomunikasi: pendaftaran.wawancara.skorKomunikasi,
          skorTeknis: pendaftaran.wawancara.skorTeknis,
          skorKomitmen: pendaftaran.wawancara.skorKomitmen,
          statusHasil: pendaftaran.wawancara.statusHasil,
          catatanEvaluasi: pendaftaran.wawancara.catatanEvaluasi || "",
        });
      } else {
        form.reset({
          skorKomunikasi: 0,
          skorTeknis: 0,
          skorKomitmen: 0,
          statusHasil: "Lulus",
          catatanEvaluasi: "",
        });
      }
    }
  }, [pendaftaran]);

  if (!isOpen || !pendaftaran) return null;

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header bg-primary text-white py-3">
              <div className="d-flex align-items-center">
                <div
                  className="bg-white text-primary rounded-circle p-2 me-3 d-flex align-items-center justify-content-center"
                  style={{ width: "45px", height: "45px" }}
                >
                  <i className="bi bi-chat-left-quote-fill fs-4"></i>
                </div>
                <div>
                  <h5 className="modal-title fw-bold mb-0">
                    Form Penilaian & Hasil Wawancara
                  </h5>
                  <small className="text-white-50">
                    Kode Pendaftaran: {pendaftaran.kodePermohonan}
                  </small>
                </div>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
              ></button>
            </div>

            <div className="modal-body p-4 bg-light">
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body bg-white rounded">
                  <div className="row g-2 small">
                    <div className="col-md-6">
                      <strong>Nama Peserta:</strong> {pendaftaran.userName}
                    </div>
                    <div className="col-md-6">
                      <strong>NIK:</strong> {pendaftaran.userNik}
                    </div>
                    <div className="col-md-6">
                      <strong>Program Pelatihan:</strong> {pendaftaran.beasiswaNama}
                    </div>
                    <div className="col-md-6">
                      <strong>Status Administrasi:</strong>{" "}
                      <span className="badge bg-success">Lolos Administrasi</span>
                    </div>
                  </div>
                </div>
              </div>

              <form
                id="wawancaraForm"
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  form.handleSubmit();
                }}
              >
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-header bg-white fw-bold text-primary border-bottom">
                    <i className="bi bi-clipboard-check me-2"></i>Seksi 1: Input Skor Penilaian
                    (Skala 0 - 100)
                  </div>
                  <div className="card-body bg-white">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <form.Field name="skorKomunikasi">
                          {(field) => (
                            <div>
                              <label htmlFor={field.name} className="form-label small fw-semibold">
                                Komunikasi & Sikap (30%)
                              </label>
                              <input
                                id={field.name}
                                name={field.name}
                                type="number"
                                className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                                placeholder="0 - 100"
                                min={0}
                                max={100}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  field.handleChange(
                                    val === "" ? 0 : Math.max(0, Math.min(100, Number(val)))
                                  );
                                }}
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
                        <form.Field name="skorTeknis">
                          {(field) => (
                            <div>
                              <label htmlFor={field.name} className="form-label small fw-semibold">
                                Pemahaman Teknis & Motivasi (40%)
                              </label>
                              <input
                                id={field.name}
                                name={field.name}
                                type="number"
                                className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                                placeholder="0 - 100"
                                min={0}
                                max={100}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  field.handleChange(
                                    val === "" ? 0 : Math.max(0, Math.min(100, Number(val)))
                                  );
                                }}
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
                        <form.Field name="skorKomitmen">
                          {(field) => (
                            <div>
                              <label htmlFor={field.name} className="form-label small fw-semibold">
                                Komitmen & Kehadiran Pelatihan (30%)
                              </label>
                              <input
                                id={field.name}
                                name={field.name}
                                type="number"
                                className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                                placeholder="0 - 100"
                                min={0}
                                max={100}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  field.handleChange(
                                    val === "" ? 0 : Math.max(0, Math.min(100, Number(val)))
                                  );
                                }}
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
                        <label className="form-label small fw-semibold text-primary">
                          Nilai Akhir (Kalkulasi Otomatis)
                        </label>
                        <form.Subscribe
                          selector={(state) => {
                            const k = Number(state.values.skorKomunikasi) || 0;
                            const t = Number(state.values.skorTeknis) || 0;
                            const m = Number(state.values.skorKomitmen) || 0;
                            return (k * 0.3 + t * 0.4 + m * 0.3).toFixed(2);
                          }}
                        >
                          {(nilaiAkhir) => (
                            <input
                              type="text"
                              className="form-control fw-bold bg-light border-primary text-primary fs-5"
                              value={nilaiAkhir}
                              readOnly
                            />
                          )}
                        </form.Subscribe>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card border-primary shadow-sm mb-2">
                  <div className="card-header bg-primary text-white fw-bold">
                    <i className="bi bi-gavel me-2"></i>Seksi 2: Update Status Wawancara & Keputusan
                  </div>
                  <div className="card-body bg-white">
                    <div className="row g-3">
                      <div className="col-12">
                        <form.Field name="statusHasil">
                          {(field) => (
                            <div>
                              <label htmlFor={field.name} className="form-label fw-bold">
                                Status Wawancara <span className="text-danger">*</span>
                              </label>
                              <select
                                id={field.name}
                                name={field.name}
                                className="form-select form-select-lg border-primary"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                  field.handleChange(e.target.value as "Lulus" | "Tidak Lulus")
                                }
                              >
                                <option value="Lulus">Lulus Wawancara</option>
                                <option value="Tidak Lulus">Tidak Lulus Wawancara</option>
                              </select>
                            </div>
                          )}
                        </form.Field>
                      </div>

                      <div className="col-12">
                        <form.Field name="catatanEvaluasi">
                          {(field) => (
                            <div>
                              <label htmlFor={field.name} className="form-label fw-bold">
                                Catatan / Executive Summary Evaluasi{" "}
                                <span className="text-danger">*</span>
                              </label>
                              <textarea
                                id={field.name}
                                name={field.name}
                                className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                                rows={3}
                                placeholder="Tuliskan catatan hasil wawancara, kelebihan, atau alasan keputusan..."
                                value={field.state.value}
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
                </div>
              </form>
            </div>

            <div className="modal-footer bg-white border-top justify-content-between">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                <i className="bi bi-x-circle me-1"></i>Batal
              </button>
              <form.Subscribe
                selector={(state) => ({
                  isSubmitting: state.isSubmitting,
                })}
              >
                {({ isSubmitting }) => (
                  <button
                    type="submit"
                    form="wawancaraForm"
                    disabled={isSubmitting || submitWawancaraMutation.isPending}
                    className="btn btn-success px-4 fw-bold"
                  >
                    <i className="bi bi-send-check me-1"></i>
                    {isSubmitting || submitWawancaraMutation.isPending
                      ? "Menyimpan..."
                      : "Submit Hasil Wawancara"}
                  </button>
                )}
              </form.Subscribe>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WawancaraModal;
