import React, { useState } from "react";
import { toast } from "sonner";
import { useCreatePersyaratanMutation } from "@/hooks/use-master-queries";

interface PersyaratanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PersyaratanModal: React.FC<PersyaratanModalProps> = ({ isOpen, onClose }) => {
  const [namaPersyaratan, setNamaPersyaratan] = useState("");
  const [formatAllowed, setFormatAllowed] = useState("");
  const [maxSize, setMaxSize] = useState("");
  const [isMandatory, setIsMandatory] = useState(true);
  const createMutation = useCreatePersyaratanMutation();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaPersyaratan.trim()) {
      toast.error("Nama persyaratan wajib diisi.");
      return;
    }
    if (!formatAllowed.trim()) {
      toast.error("Format file diperbolehkan wajib diisi.");
      return;
    }
    if (!maxSize.trim()) {
      toast.error("Ukuran maksimal file wajib diisi.");
      return;
    }

    try {
      await createMutation.mutateAsync({
        namaPersyaratan,
        formatAllowed,
        maxSize,
        isMandatory,
      });

      toast.success("Persyaratan dokumen berhasil ditambahkan!");
      setNamaPersyaratan("");
      setFormatAllowed("");
      setMaxSize("");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Gagal menambahkan persyaratan dokumen.");
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
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Nama Dokumen</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: Surat Keterangan Domisili"
                    value={namaPersyaratan}
                    onChange={(e) => setNamaPersyaratan(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Format File Diperbolehkan</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: PDF / JPG / PNG"
                    value={formatAllowed}
                    onChange={(e) => setFormatAllowed(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Ukuran Maksimal (File Size)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: 2 MB"
                    value={maxSize}
                    onChange={(e) => setMaxSize(e.target.value)}
                    required
                  />
                </div>
                <div className="form-check mb-3">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="mandatoryCheck"
                    checked={isMandatory}
                    onChange={(e) => setIsMandatory(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="mandatoryCheck">
                    Wajib Diunggah (Mandatory)
                  </label>
                </div>
                <button type="submit" className="btn btn-primary w-100">
                  Simpan Persyaratan
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PersyaratanModal;
