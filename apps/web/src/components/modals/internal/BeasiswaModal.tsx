import React from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import { appStore } from "@/lib/store";
import { useCreateBeasiswaMutation } from "@/hooks/use-master-queries";

interface BeasiswaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const beasiswaSchema = z.object({
  namaPelatihan: z.string().min(1, "Nama program beasiswa wajib diisi."),
  deskripsi: z.string(),
  kuota: z.number().min(1, "Kuota peserta minimal 1."),
  metode: z.string().min(1, "Metode pelaksanaan wajib dipilih."),
  batasPendaftaran: z.string().min(1, "Batas akhir pendaftaran wajib diisi."),
});

export const BeasiswaModal: React.FC<BeasiswaModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const createMutation = useCreateBeasiswaMutation();

  const form = useForm({
    defaultValues: {
      namaPelatihan: "",
      deskripsi: "",
      kuota: 25,
      metode: "Daring (Online)",
      batasPendaftaran: "31 Des 2026",
    },
    validators: {
      onSubmit: beasiswaSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await createMutation.mutateAsync({
          kodeBeasiswa: `PRG-${Date.now().toString().slice(-4)}`,
          namaPelatihan: value.namaPelatihan,
          deskripsi: value.deskripsi || "Program pelatihan kejuruan bersertifikat resmi.",
          kuota: Number(value.kuota),
          metode: value.metode,
          batasPendaftaran: value.batasPendaftaran || "-",
          tglMulaiDaftar: new Date().toISOString(),
          tglSelesaiDaftar: "2026-12-31T23:59:59Z",
        });

        appStore.addBeasiswa({
          kodeBeasiswa: `PRG-${Date.now().toString().slice(-4)}`,
          namaPelatihan: value.namaPelatihan,
          deskripsi: value.deskripsi || "Program pelatihan kejuruan bersertifikat resmi.",
          kuota: Number(value.kuota),
          metode: value.metode,
          batasPendaftaran: value.batasPendaftaran || "-",
          status: "buka",
          isActive: true,
          persyaratanKhusus: [
            "Warga Negara Indonesia (WNI), usia 18 - 35 tahun.",
            "Pendidikan minimal SMA/SMK sederajat.",
          ],
          dokumenWajib: ["Scan KTP & KK", "Scan Ijazah Terakhir", "Surat Rekomendasi"],
        });

        toast.success("Program beasiswa berhasil ditambahkan!");
        onSuccess?.();
        onClose();
      } catch (err: any) {
        toast.error(err.message || "Gagal menambahkan program beasiswa.");
      }
    },
  });

  if (!isOpen) return null;

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header bg-primary text-white">
              <h5 className="modal-title fw-bold">Tambah Program Beasiswa</h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
              ></button>
            </div>
            <div className="modal-body">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  form.handleSubmit();
                }}
              >
                <form.Field name="namaPelatihan">
                  {(field) => (
                    <div className="mb-3">
                      <label htmlFor={field.name} className="form-label">
                        Nama Beasiswa Pelatihan
                      </label>
                      <input
                        id={field.name}
                        name={field.name}
                        type="text"
                        className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                        placeholder="Contoh: Pelatihan Cloud Architect"
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

                <form.Field name="deskripsi">
                  {(field) => (
                    <div className="mb-3">
                      <label htmlFor={field.name} className="form-label">
                        Deskripsi Singkat
                      </label>
                      <textarea
                        id={field.name}
                        name={field.name}
                        className="form-control"
                        rows={2}
                        placeholder="Deskripsi materi program..."
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="kuota">
                  {(field) => (
                    <div className="mb-3">
                      <label htmlFor={field.name} className="form-label">
                        Kuota Peserta
                      </label>
                      <input
                        id={field.name}
                        name={field.name}
                        type="number"
                        className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                        placeholder="Contoh: 50"
                        min={1}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(Number(e.target.value))}
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

                <form.Field name="metode">
                  {(field) => (
                    <div className="mb-3">
                      <label htmlFor={field.name} className="form-label">
                        Metode Pelaksanaan
                      </label>
                      <select
                        id={field.name}
                        name={field.name}
                        className="form-select"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      >
                        <option value="Daring (Online)">Daring (Online)</option>
                        <option value="Hybrid">Hybrid</option>
                        <option value="Luring (Offline)">Luring (Offline)</option>
                      </select>
                    </div>
                  )}
                </form.Field>

                <form.Field name="batasPendaftaran">
                  {(field) => (
                    <div className="mb-3">
                      <label htmlFor={field.name} className="form-label">
                        Batas Akhir Pendaftaran
                      </label>
                      <input
                        id={field.name}
                        name={field.name}
                        type="text"
                        className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                        placeholder="Contoh: 31 Des 2026"
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

                <form.Subscribe
                  selector={(state) => ({
                    isSubmitting: state.isSubmitting,
                  })}
                >
                  {({ isSubmitting }) => (
                    <button
                      type="submit"
                      disabled={isSubmitting || createMutation.isPending}
                      className="btn btn-primary w-100"
                    >
                      {isSubmitting || createMutation.isPending
                        ? "Menyimpan..."
                        : "Simpan Program Beasiswa"}
                    </button>
                  )}
                </form.Subscribe>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BeasiswaModal;
