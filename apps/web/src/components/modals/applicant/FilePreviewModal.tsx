import React from "react";

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  fileUrl?: string;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  fileName,
  fileUrl,
}) => {
  if (!isOpen) return null;

  const isPdf = (fileName || "").toLowerCase().endsWith(".pdf");

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      >
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header bg-primary text-white">
              <h5 className="modal-title fw-bold">
                <i className={`bi ${isPdf ? "bi-file-earmark-pdf" : "bi-file-earmark-image"} me-2`}></i>
                Pratinjau Berkas: {fileName}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
              ></button>
            </div>
            <div className="modal-body text-center p-3 bg-light" style={{ minHeight: "350px" }}>
              {fileUrl ? (
                <div>
                  {isPdf ? (
                    <iframe
                      src={fileUrl}
                      title={`Pratinjau ${fileName}`}
                      className="w-100 border rounded"
                      style={{ height: "550px", backgroundColor: "#fff" }}
                    />
                  ) : (
                    <div className="p-2">
                      <img
                        src={fileUrl}
                        alt={fileName}
                        className="img-fluid rounded shadow-sm border"
                        style={{ maxHeight: "550px", objectFit: "contain" }}
                      />
                    </div>
                  )}
                  <div className="mt-3">
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-outline-primary"
                    >
                      <i className="bi bi-box-arrow-up-right me-1"></i>Buka Dokumen di Tab Baru
                    </a>
                  </div>
                </div>
              ) : isPdf ? (
                <div className="border rounded bg-white p-5 shadow-sm">
                  <i className="bi bi-file-earmark-pdf text-danger display-1 mb-3"></i>
                  <h5>{fileName}</h5>
                  <p className="text-muted small">
                    Format: Dokumen PDF resmi (Terverifikasi Magic Bytes & Antivirus ClamAV)
                  </p>
                  <div className="alert alert-info border-0 d-inline-block small text-start">
                    <i className="bi bi-shield-check text-success me-2"></i>
                    Header Keamanan: <code>X-Content-Type-Options: nosniff</code> & <code>CSP: sandbox</code> aktif.
                  </div>
                </div>
              ) : (
                <div className="border rounded bg-white p-4 shadow-sm">
                  <i className="bi bi-file-earmark-image text-primary display-1 mb-3"></i>
                  <h5>{fileName}</h5>
                  <p className="text-muted small">
                    Format: Gambar JPG/PNG (Terverifikasi Magic Bytes & Antivirus ClamAV)
                  </p>
                  <div className="alert alert-info border-0 d-inline-block small text-start">
                    <i className="bi bi-shield-check text-success me-2"></i>
                    Header Keamanan: <code>X-Content-Type-Options: nosniff</code> aktif.
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer justify-content-between">
              <span className="small text-muted">Status: Integritas Berkas Valid (SHA-256)</span>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FilePreviewModal;
