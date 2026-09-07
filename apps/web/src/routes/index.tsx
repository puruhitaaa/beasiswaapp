import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import NavbarPublic from "@/components/layout/NavbarPublic";
import ProgramCard from "@/components/cards/ProgramCard";
import LoginModal from "@/components/modals/applicant/LoginModal";
import RegisterModal from "@/components/modals/applicant/RegisterModal";
import ProgramDetailModal from "@/components/modals/applicant/ProgramDetailModal";
import { appStore } from "@/lib/store";
import type { BeasiswaProgram } from "@/types";

export const Route = createFileRoute("/")({
  component: LandingPageComponent,
});

function LandingPageComponent() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<BeasiswaProgram | null>(null);

  const programs = appStore.getPrograms();

  const handleOpenDetail = (prog: BeasiswaProgram) => {
    setSelectedProgram(prog);
  };

  const handleDaftarFromDetail = (prog: BeasiswaProgram) => {
    setSelectedProgram(null);
    setRegisterOpen(true);
  };

  return (
    <>
      <NavbarPublic
        onOpenLogin={() => setLoginOpen(true)}
        onOpenRegister={() => setRegisterOpen(true)}
      />

      {/* Hero Section */}
      <section id="home" className="hero-section text-center text-md-start">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-7">
              <h1 className="display-4 fw-bold mb-3">
                Tingkatkan Keahlian Anda Bersama Beasiswa Pelatihan
              </h1>
              <p className="lead mb-4">
                Daftarkan diri Anda untuk mengikuti berbagai program pelatihan bersertifikat gratis. Pilih program yang sesuai dengan jalur karier impian Anda.
              </p>
              <a href="#program" className="btn btn-warning btn-lg fw-bold px-4 me-2 mb-2">
                Lihat Beasiswa Aktif
              </a>
              <button
                type="button"
                className="btn btn-outline-light btn-lg px-4 mb-2"
                onClick={() => setRegisterOpen(true)}
              >
                Daftar Sekarang
              </button>
            </div>
            <div className="col-lg-5 text-center d-none d-lg-block">
              <i className="bi bi-award display-1 opacity-75" style={{ fontSize: "10rem" }}></i>
            </div>
          </div>
        </div>
      </section>

      {/* Section Program Beasiswa */}
      <section id="program" className="py-5 bg-light">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="fw-bold">Program Beasiswa Pelatihan Aktif</h2>
            <p className="text-muted">
              Pilih program pelatihan yang saat ini membuka pendaftaran
            </p>
          </div>
          <div className="row g-4">
            {programs.map((prog) => (
              <div className="col-md-6 col-lg-4" key={prog.id}>
                <ProgramCard
                  program={prog}
                  mode="public"
                  onSelect={handleOpenDetail}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section Persyaratan Umum & Alur */}
      <section id="persyaratan" className="py-5 bg-white">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6 mb-4 mb-lg-0">
              <h2 className="fw-bold mb-3">Persyaratan Berkas Pendaftaran</h2>
              <p className="text-muted mb-4">
                Sebelum melakukan pendaftaran, pastikan Anda telah menyiapkan berkas-berkas pendukung berikut dalam format <strong>PDF/JPG/PNG (Maks. 2MB per file)</strong>:
              </p>

              <div className="d-flex mb-3">
                <div className="me-3 text-primary">
                  <i className="bi bi-card-heading fs-3"></i>
                </div>
                <div>
                  <h5 className="fw-bold mb-1">Kartu Tanda Penduduk (KTP)</h5>
                  <p className="text-muted small mb-0">
                    Identitas resmi yang mencantumkan NIK yang valid.
                  </p>
                </div>
              </div>
              <div className="d-flex mb-3">
                <div className="me-3 text-primary">
                  <i className="bi bi-people-fill fs-3"></i>
                </div>
                <div>
                  <h5 className="fw-bold mb-1">Kartu Keluarga (KK)</h5>
                  <p className="text-muted small mb-0">
                    Dokumen verifikasi data domisili dan keluarga.
                  </p>
                </div>
              </div>
              <div className="d-flex mb-3">
                <div className="me-3 text-primary">
                  <i className="bi bi-file-earmark-text-fill fs-3"></i>
                </div>
                <div>
                  <h5 className="fw-bold mb-1">Ijazah Terakhir</h5>
                  <p className="text-muted small mb-0">
                    Ijazah pendidikan formal sesuai kualifikasi program.
                  </p>
                </div>
              </div>
              <div className="d-flex">
                <div className="me-3 text-primary">
                  <i className="bi bi-file-earmark-check-fill fs-3"></i>
                </div>
                <div>
                  <h5 className="fw-bold mb-1">Surat Rekomendasi / Keterangan</h5>
                  <p className="text-muted small mb-0">
                    Surat keterangan kerja atau rekomendasi dari instansi/sekolah.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-lg-6" id="alur">
              <div className="card border-0 shadow-sm p-4 bg-light">
                <h3 className="fw-bold mb-4">Alur Pendaftaran</h3>
                <div className="timeline">
                  <div className="d-flex mb-3">
                    <span className="badge bg-primary rounded-circle p-3 me-3 align-self-start fs-6">
                      1
                    </span>
                    <div>
                      <h6 className="fw-bold mb-0">Registrasi Akun</h6>
                      <p className="small text-muted">
                        Buat akun menggunakan NIK & Email aktif untuk menerima kredensial login.
                      </p>
                    </div>
                  </div>
                  <div className="d-flex mb-3">
                    <span className="badge bg-primary rounded-circle p-3 me-3 align-self-start fs-6">
                      2
                    </span>
                    <div>
                      <h6 className="fw-bold mb-0">Pengisian Formulir (4 Step Wizard)</h6>
                      <p className="small text-muted">
                        Lengkapi Data Diri, Pendidikan/Pekerjaan, Upload Berkas, dan Pernyataan Keabsahan.
                      </p>
                    </div>
                  </div>
                  <div className="d-flex mb-3">
                    <span className="badge bg-primary rounded-circle p-3 me-3 align-self-start fs-6">
                      3
                    </span>
                    <div>
                      <h6 className="fw-bold mb-0">Seleksi Administrasi & Wawancara</h6>
                      <p className="small text-muted">
                        Pantau status seleksi secara realtime melalui dashboard akun Anda.
                      </p>
                    </div>
                  </div>
                  <div className="d-flex">
                    <span className="badge bg-success rounded-circle p-3 me-3 align-self-start fs-6">
                      4
                    </span>
                    <div>
                      <h6 className="fw-bold mb-0">Pengumuman Kelulusan</h6>
                      <p className="small text-muted">
                        Peserta yang lulus seleksi wawancara berhak mengikuti pelatihan.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark text-white py-4 mt-auto">
        <div className="container text-center">
          <p className="mb-0 small">
            &copy; 2026 Portal Aplikasi Pendaftaran Beasiswa Pelatihan. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Modals */}
      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSwitchToRegister={() => {
          setLoginOpen(false);
          setRegisterOpen(true);
        }}
      />

      <RegisterModal
        isOpen={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onSwitchToLogin={() => {
          setRegisterOpen(false);
          setLoginOpen(true);
        }}
      />

      <ProgramDetailModal
        program={selectedProgram}
        isOpen={Boolean(selectedProgram)}
        onClose={() => setSelectedProgram(null)}
        onDaftar={handleDaftarFromDetail}
      />
    </>
  );
}
