import React from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import { useConfirmDaftarUlangMutation } from "@/hooks/use-transaksi-queries";

interface DaftarUlangModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendaftaranId: string;
  programName: string;
}

const daftarUlangSchema = z.object({
  kesediaan: z.enum(["bersedia", "mengundurkan"]),
  catatan: z.string(),
});

export const DaftarUlangModal: React.FC<DaftarUlangModalProps> = ({
  isOpen,
  onClose,
  pendaftaranId,
  programName,
}) => {
  const confirmMutation = useConfirmDaftarUlangMutation();

  const form = useForm({
    defaultValues: {
      kesediaan: "bersedia" as "bersedia" | "mengundurkan",
      catatan: "",
    },
    validators: {
      onSubmit: daftarUlangSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await confirmMutation.mutateAsync({
          id: pendaftaranId,
          statusKesediaan: value.kesediaan,
          catatan: value.catatan,
        });
        if (value.kesediaan === "bersedia") {
          toast.success("Konfirmasi kehadiran Anda telah berhasil tercatat. Silakan pantau grup koordinasi!");
        } else {
          toast.info("Konfirmasi pengunduran diri telah tercatat oleh panitia.");
        }
        onClose();
      } catch (err: any) {
        toast.error(err.message || "Gagal menyimpan konfirmasi daftar ulang.");
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
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header bg-success text-white">
              <h5 className="modal-title fw-bold">
                <i className="bi bi-check2-square me-2"></i>Konfirmasi Kehadiran / Daftar Ulang
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
              ></button>
            </div>
            <div className="modal-body">
              <p className="small text-muted">
                Silakan konfirmasi kesediaan Anda untuk mengikuti program{" "}
                <strong>{programName}</strong> hingga selesai.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  form.handleSubmit();
                }}
              >
                <form.Field name="kesediaan">
                  {(field) => (
                    <div className="mb-3">
                      <label htmlFor={field.name} className="form-label fw-semibold small">
                        Status Kesediaan
                      </label>
                      <select
                        id={field.name}
                        name={field.name}
                        className="form-select"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) =>
                          field.handleChange(
                            e.target.value as "bersedia" | "mengundurkan"
                          )
                        }
                      >
                        <option value="bersedia">Ya, Saya Bersedia Mengikuti Pelatihan</option>
                        <option value="mengundurkan">Saya Mengundurkan Diri</option>
                      </select>
                    </div>
                  )}
                </form.Field>

                <form.Field name="catatan">
                  {(field) => (
                    <div className="mb-3">
                      <label htmlFor={field.name} className="form-label fw-semibold small">
                        Catatan Tambahan (Opsional)
                      </label>
                      <textarea
                        id={field.name}
                        name={field.name}
                        className="form-control"
                        rows={2}
                        placeholder="Catatan untuk panitia..."
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
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
                      disabled={isSubmitting}
                      className="btn btn-success w-100"
                    >
                      {isSubmitting ? "Mengirim..." : "Kirim Konfirmasi"}
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

export default DaftarUlangModal;
