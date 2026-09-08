import React, { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import NavbarApplicant from "@/components/layout/NavbarApplicant";
import ProgramCard from "@/components/cards/ProgramCard";
import WizardModal from "@/components/modals/applicant/WizardModal";
import WizardReadonlyModal from "@/components/modals/applicant/WizardReadonlyModal";
import DaftarUlangModal from "@/components/modals/applicant/DaftarUlangModal";
import FilePreviewModal from "@/components/modals/applicant/FilePreviewModal";
import { appStore } from "@/lib/store";
import { useBeasiswaList } from "@/hooks/use-master-queries";
import {
  useMyActiveApplication,
  useInitApplicationMutation,
} from "@/hooks/use-transaksi-queries";
import type { ApplicationStatus, BeasiswaProgram, PendaftaranRecord } from "@/types";

export const Route = createFileRoute("/applicant")({
  component: ApplicantPortalComponent,
});

function ApplicantPortalComponent() {
  const navigate = useNavigate();
  const currentUser = appStore.getCurrentUser();
  const { data: myApp, isLoading: isAppLoading } = useMyActiveApplication();
  const { data: programs = [] } = useBeasiswaList();
  const initMutation = useInitApplicationMutation();

  const storeApplication = appStore.getMyActiveApplication();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [readonlyOpen, setReadonlyOpen] = useState(false);
  const [daftarUlangOpen, setDaftarUlangOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ fileName: string; fileUrl?: string } | null>(null);

  // Authentication Route Guard
  useEffect(() => {
    if (!currentUser) {
      toast.error("Silakan masuk terlebih dahulu untuk mengakses portal pendaftar.");
      navigate({ to: "/" });
    }
  }, [currentUser, navigate]);

  // Active application precedence: backend > store
  const activeApp: PendaftaranRecord | undefined = myApp || storeApplication || undefined;

  const handleStartApplication = () => {
    setWizardOpen(true);
  };

  const handleSelectProgram = async (prog: BeasiswaProgram) => {
    try {
      await initMutation.mutateAsync({
        beasiswaId: prog.id,
        programName: prog.namaPelatihan,
      });
      toast.success(`Pendaftaran program ${prog.namaPelatihan} berhasil dimulai!`);
      setWizardOpen(true);
    } catch (err: any) {
      toast.error(err.message || "Gagal memulai pendaftaran program.");
    }
  };

  if (!currentUser) {
    return null;
  }

  // If applicant is logged in but has no active application yet, show program catalog
  if (!activeApp) {
    return (
      <>
        <NavbarApplicant userName={currentUser.name} />

        <div className="container py-4">
          <div className="alert alert-primary border-0 shadow-sm d-flex align-items-center mb-4" role="alert">
            <i className="bi bi-mortarboard-fill fs-3 me-3"></i>
            <div>
              <strong className="fs-6">Selamat Datang, {currentUser.name}!</strong>
              <p className="mb-0 small">
                Anda belum memiliki permohonan beasiswa yang sedang berjalan. Silakan pilih salah satu program pelatihan di bawah ini untuk memulai pengisian formulir pendaftaran.
              </p>
            </div>
          </div>

          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white py-3 fw-bold border-bottom">
              <i className="bi bi-grid-fill me-2 text-primary"></i>Katalog Program Beasiswa Tersedia
            </div>
            <div className="card-body">
              {isAppLoading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status"></div>
                  <p className="text-muted mt-2">Memeriksa status pendaftaran...</p>
                </div>
              ) : (
                <div className="row g-3">
                  {programs.map((prog) => (
                    <div className="col-md-6 col-lg-4" key={prog.id}>
                      <ProgramCard
                        program={prog}
                        mode="applicant"
                        isSelected={false}
                        isLockedDueToOtherActive={false}
                        onSelect={handleSelectProgram}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  const currentStatus = activeApp.status;

  const handleDownloadSK = () => {
    toast.success("Memulai pengunduhan Surat Keputusan Kelulusan (PDF)...");
    // Generate simple printable view or download
    const printableWindow = window.open("", "_blank");
    if (printableWindow) {
      printableWindow.document.write(`
        <html>
          <head>
            <title>Surat Keputusan Kelulusan - BeasiswaApp</title>
            <style>
              body { font-family: sans-serif; padding: 40px; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
              .stamp { color: #198754; font-weight: bold; border: 2px solid #198754; display: inline-block; padding: 10px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>SURAT KEPUTUSAN KELULUSAN SELEKSI</h2>
              <p>Nomor: SK-BEASISWA/2026/09/001</p>
            </div>
            <p>Berdasarkan hasil verifikasi administrasi dan seleksi wawancara yang telah dilaksanakan, dengan ini menerangkan bahwa:</p>
            <ul>
              <li><strong>Nama:</strong> ${activeApp.userName}</li>
              <li><strong>NIK:</strong> ${activeApp.userNik}</li>
              <li><strong>Kode Pendaftaran:</strong> ${activeApp.kodePermohonan}</li>
              <li><strong>Program Beasiswa:</strong> ${activeApp.beasiswaNama}</li>
            </ul>
            <p>Dinyatakan: <strong>LULUS SELEKSI & DITERIMA SEBAGAI PENERIMA BEASISWA</strong>.</p>
            <div class="stamp">TERVERIFIKASI & SAH SECARA ELEKTRONIK</div>
          </body>
        </html>
      `);
      printableWindow.document.close();
      printableWindow.print();
    }
  };

  return (
    <>
      <NavbarApplicant
        userName={activeApp.userName}
        currentStatus={currentStatus}
      />

      <div className="container py-4">
        {/* =========================================================================
            1. KONDISI DRAFT (2_index_awal.html)
            ========================================================================= */}
        {currentStatus === "DRAFT" && (
          <>
            <div className="alert alert-primary border-0 shadow-sm d-flex align-items-center mb-4" role="alert">
              <i className="bi bi-info-circle-fill fs-3 me-3"></i>
              <div>
                <strong className="fs-6">Selamat Datang! Silakan Lengkapi Formulir Pendaftaran</strong>
                <p className="mb-0 small">
                  Anda memilih program <strong>{activeApp.beasiswaNama}</strong>. Harap isi data diri dan unggah dokumen persyaratan dengan benar sebelum melakukan pengiriman final.
                </p>
              </div>
            </div>

            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white py-3 fw-bold border-bottom d-flex justify-content-between align-items-center">
                <span>
                  <i className="bi bi-file-earmark-text me-2 text-primary"></i>Pendaftaran Aktif Anda
                </span>
                <span className="badge bg-secondary">Draft Belum Dikirim</span>
              </div>
              <div className="card-body text-center py-5">
                <i className="bi bi-journal-plus display-1 text-primary opacity-50 mb-3"></i>
                <h5>Anda belum melengkapi formulir pendaftaran</h5>
                <p className="text-muted small mb-4">
                  Silakan klik tombol di bawah untuk mulai mengisi data diri, latar belakang pendidikan, dan berkas persyaratan.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-lg px-4 fw-semibold"
                  onClick={handleStartApplication}
                >
                  <i className="bi bi-pencil-square me-2"></i>Mulai Isi Formulir Pendaftaran
                </button>
              </div>
            </div>
          </>
        )}

        {/* =========================================================================
            2. KONDISI SUBMITTED / DALAM PROSES (3_index_terkirim.html)
            ========================================================================= */}
        {(currentStatus === "SUBMITTED" || currentStatus === "DALAM_PROSES_ADMIN") && (
          <>
            <div className="alert alert-success border-0 shadow-sm d-flex align-items-center mb-4" role="alert">
              <i className="bi bi-check-circle-fill fs-3 me-3"></i>
              <div>
                <strong className="fs-5">Pendaftaran Berhasil Terkirim!</strong>
                <p className="mb-0 small">
                  Berkas Anda telah terkunci dan saat ini sedang dalam proses{" "}
                  <strong>Seleksi Administrasi</strong> oleh Verifikator. Perubahan data tidak dapat dilakukan selama proses verifikasi berjalan.
                </p>
              </div>
            </div>

            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white py-3 fw-bold border-bottom d-flex justify-content-between align-items-center">
                <span>
                  <i className="bi bi-clock-history me-2 text-primary"></i>Monitoring Status Pendaftaran
                </span>
                <span className="badge bg-secondary">
                  <i className="bi bi-lock-fill me-1"></i>Data Terkunci
                </span>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Kode Tiket</th>
                        <th>Program Pelatihan</th>
                        <th>Tanggal Submit</th>
                        <th>Seleksi Administrasi</th>
                        <th>Status Wawancara</th>
                        <th>Status Final</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <span className="badge bg-light text-dark border font-monospace fs-6">
                            {activeApp.kodePermohonan}
                          </span>
                        </td>
                        <td>
                          <strong>{activeApp.beasiswaNama}</strong>
                        </td>
                        <td>{activeApp.submittedAt || "-"}</td>
                        <td>
                          <span className="badge bg-info text-dark">
                            <i className="bi bi-hourglass-split me-1"></i>Proses Verifikasi
                          </span>
                        </td>
                        <td>-</td>
                        <td>-</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setReadonlyOpen(true)}
                          >
                            <i className="bi bi-eye me-1"></i>Lihat Data Terkirim
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* =========================================================================
            3. KONDISI REVISI (4_index_revisi.html)
            ========================================================================= */}
        {currentStatus === "REVISI" && (
          <>
            <div className="alert alert-info border-0 shadow-sm d-flex align-items-center mb-4" role="alert">
              <i className="bi bi-info-circle-fill fs-4 me-3"></i>
              <div>
                <strong>Ketentuan Pendaftaran:</strong> Setiap peserta hanya diperbolehkan mendaftar pada <strong>1 (satu) program pelatihan saja</strong>.
              </div>
            </div>

            <div className="row g-4 mb-4">
              <div className="col-12">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3 fw-bold border-bottom d-flex justify-content-between align-items-center">
                    <span>
                      <i className="bi bi-clock-history me-2 text-primary"></i>Status Pendaftaran Saya
                    </span>
                    <span className="badge bg-primary">1 Pendaftaran Aktif</span>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Kode Tiket</th>
                            <th>Program Pelatihan yang Diikuti</th>
                            <th>Tgl Daftar</th>
                            <th>Seleksi Administrasi</th>
                            <th>Status Wawancara</th>
                            <th>Status Final</th>
                            <th>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>
                              <span className="badge bg-light text-dark border font-monospace fs-6">
                                {activeApp.kodePermohonan}
                              </span>
                            </td>
                            <td>
                              <strong>{activeApp.beasiswaNama}</strong>
                              <br />
                              <span className="badge bg-outline-primary text-primary border border-primary small">
                                Metode: {activeApp.beasiswaMetode || "Daring"}
                              </span>
                            </td>
                            <td>{activeApp.submittedAt || "-"}</td>
                            <td>
                              <span className="badge bg-warning text-dark">
                                <i className="bi bi-pencil-square me-1"></i>Revisi Berkas
                              </span>
                            </td>
                            <td>-</td>
                            <td>-</td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-sm btn-warning fw-semibold"
                                onClick={() => setWizardOpen(true)}
                              >
                                <i className="bi bi-pencil-square me-1"></i>Perbaiki Data
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Katalog Pelatihan (Dengan Logika 1 Pendaftaran) */}
              <div className="col-12">
                <h5 className="fw-bold mb-3">
                  <i className="bi bi-journal-bookmark me-2 text-primary"></i>Katalog Program Pelatihan
                </h5>
                <div className="row g-3">
                  {programs.map((prog) => {
                    const isSelected = prog.id === activeApp.beasiswaId;
                    return (
                      <div className="col-md-6 col-lg-4" key={prog.id}>
                        <ProgramCard
                          program={prog}
                          mode="applicant"
                          isSelected={isSelected}
                          isLockedDueToOtherActive={!isSelected}
                          onOpenWizard={() => setWizardOpen(true)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* =========================================================================
            4. KONDISI TIDAK LOLOS / PENDAFTARAN DITUTUP (5_index_ditutup.html)
            ========================================================================= */}
        {currentStatus === "TIDAK_LOLOS_ADMIN" && (
          <>
            <div className="alert alert-danger border-0 shadow-sm d-flex align-items-center mb-4" role="alert">
              <i className="bi bi-x-circle-fill fs-3 me-3"></i>
              <div>
                <strong className="fs-5">Seleksi Administrasi Tidak Memenuhi Syarat</strong>
                <p className="mb-0 small">
                  Mohon maaf, berkas pengajuan Anda belum memenuhi kualifikasi beasiswa periode ini. Terima kasih atas partisipasi Anda.
                </p>
              </div>
            </div>

            <div className="card border-0 shadow-sm text-center py-5 mb-4">
              <div className="card-body">
                <div className="mb-3">
                  <i className="bi bi-calendar-x text-danger display-1 opacity-75"></i>
                </div>
                <h4 className="fw-bold">Tidak Ada Gelombang Pendaftaran Aktif</h4>
                <p className="text-muted mx-auto" style={{ maxWidth: "600px" }}>
                  Terima kasih atas antusiasme Anda. Silakan cek secara berkala untuk informasi pembukaan gelombang program beasiswa berikutnya.
                </p>
                <button
                  type="button"
                  className="btn btn-outline-primary mt-2"
                  onClick={() => {
                    toast.info("Memperbarui status pendaftaran...");
                    window.location.reload();
                  }}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i> Mulai Pengajuan Baru
                </button>
              </div>
            </div>

            <h5 className="fw-bold mb-3">
              <i className="bi bi-journal-x me-2 text-danger"></i>Daftar Program Pelatihan (Non-Aktif)
            </h5>
            <div className="row g-3">
              {programs.map((prog) => (
                <div className="col-md-6 col-lg-4" key={prog.id}>
                  <div className="card border-0 shadow-sm h-100 card-closed">
                    <div className="card-body">
                      <span className="badge bg-danger mb-2">
                        <i className="bi bi-lock-fill me-1"></i>Pendaftaran Ditutup
                      </span>
                      <h6 className="card-title fw-bold text-muted">{prog.namaPelatihan}</h6>
                      <p className="card-text text-muted small">{prog.deskripsi}</p>
                      <hr />
                      <ul className="list-unstyled small text-muted mb-0">
                        <li>
                          <i className="bi bi-calendar-event me-2"></i>
                          <strong>Batas Akhir:</strong> 01 September 2026
                        </li>
                        <li>
                          <i className="bi bi-people me-2"></i>
                          <strong>Kuota:</strong> Terpenuhi
                        </li>
                      </ul>
                    </div>
                    <div className="card-footer bg-transparent border-0 pb-3">
                      <button type="button" className="btn btn-secondary w-100 btn-sm" disabled>
                        <i className="bi bi-slash-circle me-1"></i>Pendaftaran Ditutup
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* =========================================================================
            5. KONDISI LULUS SELEKSI (6_index_lulus.html)
            ========================================================================= */}
        {(currentStatus === "LULUS_DITERIMA" || currentStatus === "LOLOS_ADMIN") && (
          <>
            <div className="hero-lulus p-4 p-md-5 mb-4 shadow-sm position-relative overflow-hidden">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <span className="badge bg-warning text-dark fw-bold mb-2">
                    <i className="bi bi-trophy-fill me-1"></i> PENGUMUMAN SELEKSI FINAL
                  </span>
                  <h2 className="display-6 fw-bold mb-2">Selamat, {activeApp.userName}!</h2>
                  <p className="lead mb-3">
                    Anda dinyatakan <strong>LULUS SELEKSI</strong> dan diterima sebagai penerima beasiswa program{" "}
                    <strong>{activeApp.beasiswaNama}</strong>.
                  </p>
                  <div className="d-flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-warning fw-bold text-dark"
                      onClick={handleDownloadSK}
                    >
                      <i className="bi bi-file-earmark-pdf-fill me-1"></i> Unduh Surat Kelulusan (PDF)
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-light"
                      onClick={() => setDaftarUlangOpen(true)}
                    >
                      <i className="bi bi-check-circle-fill me-1"></i> Konfirmasi / Daftar Ulang
                    </button>
                  </div>
                </div>
                <div className="col-md-4 text-center d-none d-md-block">
                  <i className="bi bi-award-fill opacity-75" style={{ fontSize: "8rem" }}></i>
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white py-3 fw-bold border-bottom">
                <i className="bi bi-clipboard-data-fill me-2 text-success"></i>Rincian Status Seleksi Peserta
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Program Pelatihan</th>
                        <th>Seleksi Administrasi</th>
                        <th>Seleksi Wawancara</th>
                        <th>Status Akhir (Kelulusan)</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <strong>{activeApp.beasiswaNama}</strong>
                          <br />
                          <small className="text-muted">
                            Kode Pendaftaran: {activeApp.kodePermohonan}
                          </small>
                        </td>
                        <td>
                          <span className="badge bg-success badge-status">
                            <i className="bi bi-check-circle-fill me-1"></i> Lolos
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-success badge-status">
                            <i className="bi bi-check-circle-fill me-1"></i> Lulus Wawancara
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-success badge-status">
                            <i className="bi bi-trophy-fill me-1"></i> DITERIMA (LULUS)
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setReadonlyOpen(true)}
                          >
                            <i className="bi bi-eye me-1"></i> Lihat Data Pendaftaran
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="row g-3">
              <div className="col-md-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <h6 className="fw-bold text-success mb-3">
                      <i className="bi bi-info-circle-fill me-2"></i>Langkah Selanjutnya
                    </h6>
                    <ol className="small text-secondary ps-3 mb-0">
                      <li className="mb-2">
                        Unduh Surat Keterangan Kelulusan resmi berbentuk PDF melalui tombol di atas.
                      </li>
                      <li className="mb-2">
                        Lakukan konfirmasi kehadiran/daftar ulang sebelum <strong>10 September 2026</strong>.
                      </li>
                      <li className="mb-2">
                        Bergabung ke dalam grup koordinasi Telegram/WhatsApp peserta pelatihan.
                      </li>
                      <li>
                        Mengikuti Orientasi Pembukaan Pelatihan secara daring sesuai jadwal terlampir pada surat.
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card border-0 shadow-sm h-100 bg-white">
                  <div className="card-body">
                    <h6 className="fw-bold text-primary mb-3">
                      <i className="bi bi-calendar-check-fill me-2"></i>Jadwal Kegiatan Pelatihan
                    </h6>
                    <ul className="list-unstyled small mb-0">
                      <li className="mb-2">
                        <strong>Konfirmasi Daftar Ulang:</strong> 02 - 10 September 2026
                      </li>
                      <li className="mb-2">
                        <strong>Orientasi Peserta:</strong> 15 September 2026 (09.00 WIB)
                      </li>
                      <li>
                        <strong>Pelaksanaan Kelas Pertama:</strong> 20 September 2026
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <WizardModal
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        pendaftaran={activeApp}
        onSubmitted={() => {
          setWizardOpen(false);
          setReadonlyOpen(true);
        }}
      />

      <WizardReadonlyModal
        isOpen={readonlyOpen}
        onClose={() => setReadonlyOpen(false)}
        pendaftaran={activeApp}
        onPreviewFile={(name, fileUrl) => setPreviewFile({ fileName: name, fileUrl })}
      />

      <DaftarUlangModal
        isOpen={daftarUlangOpen}
        onClose={() => {
          setDaftarUlangOpen(false);
        }}
        pendaftaranId={activeApp.id}
        programName={activeApp.beasiswaNama}
      />

      <FilePreviewModal
        isOpen={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
        fileName={previewFile?.fileName || "dokumen.pdf"}
        fileUrl={previewFile?.fileUrl}
      />
    </>
  );
}
