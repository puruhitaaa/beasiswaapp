import "dotenv/config";
import { prisma } from "./db.js";

export async function seedMaster() {
  console.log("🌱 Inisialisasi data awal Master Beasiswa & Persyaratan...");

  const programs = [
    {
      id: "prog-web",
      kodeBeasiswa: "PRG-WEB-001",
      namaPelatihan: "Pelatihan Web Developer Specialist",
      deskripsi:
        "Program pelatihan intensif full-stack web development dari frontend hingga deployment server modern.",
      kuota: 100,
      tglMulaiDaftar: new Date("2026-01-01"),
      tglSelesaiDaftar: new Date("2026-12-31"),
      isActive: true,
      persyaratan: [
        {
          id: "req-ktp",
          namaPersyaratan: "KTP (Kartu Tanda Penduduk)",
          tipeDokumen: "JPG, PNG, PDF",
          isMandatory: true,
          maxFileSizeBytes: BigInt(2097152),
        },
        {
          id: "req-kk",
          namaPersyaratan: "KK (Kartu Keluarga)",
          tipeDokumen: "PDF",
          isMandatory: true,
          maxFileSizeBytes: BigInt(2097152),
        },
        {
          id: "req-ijazah",
          namaPersyaratan: "Ijazah Terakhir",
          tipeDokumen: "PDF",
          isMandatory: true,
          maxFileSizeBytes: BigInt(2097152),
        },
        {
          id: "req-rekom",
          namaPersyaratan: "Surat Rekomendasi / Keterangan",
          tipeDokumen: "PDF",
          isMandatory: true,
          maxFileSizeBytes: BigInt(2097152),
        },
      ],
    },
    {
      id: "prog-data",
      kodeBeasiswa: "PRG-DATA-002",
      namaPelatihan: "Pelatihan Data Analyst & SQL",
      deskripsi:
        "Kuasai analisis data komprehensif, relational database SQL, data visualization, dan business intelligence.",
      kuota: 80,
      tglMulaiDaftar: new Date("2026-01-01"),
      tglSelesaiDaftar: new Date("2026-12-31"),
      isActive: true,
      persyaratan: [
        {
          id: "req-ktp-data",
          namaPersyaratan: "KTP (Kartu Tanda Penduduk)",
          tipeDokumen: "JPG, PNG, PDF",
          isMandatory: true,
          maxFileSizeBytes: BigInt(2097152),
        },
        {
          id: "req-ijazah-data",
          namaPersyaratan: "Ijazah Terakhir",
          tipeDokumen: "PDF",
          isMandatory: true,
          maxFileSizeBytes: BigInt(2097152),
        },
      ],
    },
    {
      id: "prog-uiux",
      kodeBeasiswa: "PRG-UIUX-003",
      namaPelatihan: "UI/UX Design & Prototyping",
      deskripsi:
        "Pelajari user research, user journey mapping, wireframing, interactive prototyping, dan usability testing.",
      kuota: 60,
      tglMulaiDaftar: new Date("2026-01-01"),
      tglSelesaiDaftar: new Date("2026-12-31"),
      isActive: true,
      persyaratan: [
        {
          id: "req-ktp-uiux",
          namaPersyaratan: "KTP (Kartu Tanda Penduduk)",
          tipeDokumen: "JPG, PNG, PDF",
          isMandatory: true,
          maxFileSizeBytes: BigInt(2097152),
        },
      ],
    },
    {
      id: "prog-cyber",
      kodeBeasiswa: "PRG-CYB-004",
      namaPelatihan: "Cybersecurity Analyst & Defense",
      deskripsi:
        "Pelatihan keamanan siber, penetration testing, threat detection, network hardening, dan incident handling.",
      kuota: 40,
      tglMulaiDaftar: new Date("2026-01-01"),
      tglSelesaiDaftar: new Date("2026-12-31"),
      isActive: true,
      persyaratan: [],
    },
    {
      id: "prog-mobile",
      kodeBeasiswa: "PRG-MOB-005",
      namaPelatihan: "Mobile App Development (Flutter / React Native)",
      deskripsi:
        "Pengembangan aplikasi mobile modern cross-platform, state management, REST integration, dan app store publishing.",
      kuota: 50,
      tglMulaiDaftar: new Date("2026-01-01"),
      tglSelesaiDaftar: new Date("2026-12-31"),
      isActive: true,
      persyaratan: [],
    },
    {
      id: "prog-cloud",
      kodeBeasiswa: "PRG-CLD-006",
      namaPelatihan: "Cloud Computing & DevOps",
      deskripsi:
        "Implementasi infrastruktur cloud modern, containerization Docker, CI/CD automated pipeline, dan Kubernetes.",
      kuota: 40,
      tglMulaiDaftar: new Date("2026-01-01"),
      tglSelesaiDaftar: new Date("2026-12-31"),
      isActive: true,
      persyaratan: [],
    },
  ];

  for (const prog of programs) {
    const { persyaratan, ...beasiswaData } = prog;

    await prisma.beasiswaPelatihan.upsert({
      where: { id: prog.id },
      update: beasiswaData,
      create: beasiswaData,
    });

    for (const req of persyaratan) {
      await prisma.persyaratan.upsert({
        where: { id: req.id },
        update: {
          beasiswaId: prog.id,
          namaPersyaratan: req.namaPersyaratan,
          tipeDokumen: req.tipeDokumen,
          isMandatory: req.isMandatory,
          maxFileSizeBytes: req.maxFileSizeBytes,
        },
        create: {
          id: req.id,
          beasiswaId: prog.id,
          namaPersyaratan: req.namaPersyaratan,
          tipeDokumen: req.tipeDokumen,
          isMandatory: req.isMandatory,
          maxFileSizeBytes: req.maxFileSizeBytes,
        },
      });
    }
  }

  console.log("✅ Seed Master Beasiswa berhasil!");
}

if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  seedMaster()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Seed Master gagal:", err);
      process.exit(1);
    });
}
