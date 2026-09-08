import React from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import { useCreatePersyaratanMutation } from "@/hooks/use-master-queries";

interface PersyaratanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const persyaratanSchema = z.object({
  namaPersyaratan: z.string().min(1, "Nama persyaratan wajib diisi."),
  formatAllowed: z.string().min(1, "Format file diperbolehkan wajib diisi."),
  maxSize: z.string().min(1, "Ukuran maksimal file wajib diisi."),
  isMandatory: z.boolean(),
});

export const PersyaratanModal: React.FC<PersyaratanModalProps> = ({ isOpen, onClose }) => {
  const createMutation = useCreatePersyaratanMutation();

  const form = useForm({
    defaultValues: {
      namaPersyaratan: "",
      formatAllowed: "",
      maxSize: "",
      isMandatory: true,
    },
    validators: {
      onSubmit: persyaratanSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await createMutation.mutateAsync({
          namaPersyaratan: value.namaPersyaratan,
          formatAllowed: value.formatAllowed,
          maxSize: value.maxSize,
          isMandatory: value.isMandatory,
        });

        toast.success("Persyaratan dokumen berhasil ditambahkan!");
        form.reset();
        onClose();
      } catch (err: any) {
        toast.error(err.message || "Gagal menambahkan persyaratan dokumen.");
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
              <h5 className="modal-title fw-bold">Tambah Persyaratan Dokumen</h5>
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
                <form.Field name="namaPersyaratan">
                  {(field) => (
                    <div className="mb-3">
                      <label htmlFor={field.name} className="form-label">
                        Nama Dokumen
                      </label>
                      <input
                        id={field.name}
                        name={field.name}
                        type="text"
                        className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                        placeholder="Contoh: Surat Keterangan Domisili"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      {field.state.meta.errors.map((error) => (
                        <div
                          key={error ? (typeof error === "string" ? error : error.message) : ""}
                          className="invalid-feedback d-block"
                        >
                          {error ? (typeof error === "string" ? error : error.message) : ""}
                        </div>
                      ))}
                    </div>
                  )}
                </form.Field>

                <form.Field name="formatAllowed">
                  {(field) => (
                    <div className="mb-3">
                      <label htmlFor={field.name} className="form-label">
                        Format File Diperbolehkan
                      </label>
                      <input
                        id={field.name}
                        name={field.name}
                        type="text"
                        className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                        placeholder="Contoh: PDF / JPG / PNG"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      {field.state.meta.errors.map((error) => (
                        <div
                          key={error ? (typeof error === "string" ? error : error.message) : ""}
                          className="invalid-feedback d-block"
                        >
                          {error ? (typeof error === "string" ? error : error.message) : ""}
                        </div>
                      ))}
                    </div>
                  )}
                </form.Field>

                <form.Field name="maxSize">
                  {(field) => (
                    <div className="mb-3">
                      <label htmlFor={field.name} className="form-label">
                        Ukuran Maksimal (File Size)
                      </label>
                      <input
                        id={field.name}
                        name={field.name}
                        type="text"
                        className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                        placeholder="Contoh: 2 MB"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      {field.state.meta.errors.map((error) => (
                        <div
                          key={error ? (typeof error === "string" ? error : error.message) : ""}
                          className="invalid-feedback d-block"
                        >
                          {error ? (typeof error === "string" ? error : error.message) : ""}
                        </div>
                      ))}
                    </div>
                  )}
                </form.Field>

                <form.Field name="isMandatory">
                  {(field) => (
                    <div className="form-check mb-3">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={field.name}
                        name={field.name}
                        checked={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor={field.name}>
                        Wajib Diunggah (Mandatory)
                      </label>
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
                        : "Simpan Persyaratan"}
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

export default PersyaratanModal;
