# Naskah monolog teknis alur end-to-end aplikasi beasiswa

Dokumen ini berisi naskah monolog teknis untuk presentasi alur kerja aplikasi beasiswa dari Tahap 1 sampai 7 berdasarkan pengujian Playwright. Setiap bagian menyajikan narasi peran, daftar berkas yang dibuka, potongan kode frontend dan backend, serta rincian request network.

---

## 01. Calon peserta: portal pendaftaran dan wizard formulir

Uji terkait: `tests/e2e/01-applicant-portal.spec.ts`

### 1.1 Katalog publik dan modal rincian beasiswa

#### Narasi monolog
Sebagai pengunjung umum atau calon peserta yang belum masuk ke sistem, saya dapat mengakses halaman beranda untuk melihat daftar program beasiswa yang sedang aktif. Saya dapat meninjau kuota yang tersedia, tanggal batas pendaftaran, serta metode pelatihan daring maupun luring. Ketika saya menekan tombol "Lihat Detail & Daftar" pada kartu program, sistem membuka modal rincian yang memuat deskripsi lengkap dan daftar berkas persyaratan wajib. Saya tidak memerlukan sesi login pada tahap ini untuk membaca informasi program.

#### Berkas yang dibuka
- Pengujian E2E: [`tests/e2e/01-applicant-portal.spec.ts`](file:///d:/Coding/beasiswaapp/tests/e2e/01-applicant-portal.spec.ts#L16-L36)
- Tampilan Beranda: [`apps/web/src/routes/index.tsx`](file:///d:/Coding/beasiswaapp/apps/web/src/routes/index.tsx)
- Kartu Program: [`apps/web/src/components/cards/ProgramCard.tsx`](file:///d:/Coding/beasiswaapp/apps/web/src/components/cards/ProgramCard.tsx)
- Modal Rincian: [`apps/web/src/components/modals/applicant/ProgramDetailModal.tsx`](file:///d:/Coding/beasiswaapp/apps/web/src/components/modals/applicant/ProgramDetailModal.tsx)
- Gateway API: [`apps/api-gateway/src/index.ts`](file:///d:/Coding/beasiswaapp/apps/api-gateway/src/index.ts#L153-L183)
- Service Master Data: [`apps/service-master/src/index.ts`](file:///d:/Coding/beasiswaapp/apps/service-master/src/index.ts#L55-L59)

#### Potongan kode frontend
```tsx
// apps/web/src/routes/index.tsx
const { data: programs = [], isLoading } = useBeasiswaList();

return (
  <div className="row g-4">
    {programs.map((program) => (
      <div className="col-md-6 col-lg-4" key={program.id}>
        <ProgramCard
          program={program}
          mode="public"
          onOpenDetail={() => {
            setSelectedProgram(program);
            setDetailModalOpen(true);
          }}
        />
      </div>
    ))}
  </div>
);
```

#### Potongan kode backend
```typescript
// apps/service-master/src/index.ts
fastify.get("/api/master/beasiswa", async () => {
  return masterRepository.findAllActive();
});
```

#### Request network
- Metode: `GET`
- URL: `http://localhost:3000/api/master/beasiswa`
- Header:
  - `Accept: application/json`
- Payload: Tidak ada
- Respons: `200 OK`
```json
[
  {
    "id": "bsw-1",
    "kodeBeasiswa": "DEV-2026",
    "namaPelatihan": "Full Stack Web Developer Professional",
    "deskripsi": "Pelatihan intensif pengembangan aplikasi web modern.",
    "kuota": 30,
    "isActive": true,
    "persyaratan": [
      {
        "id": "req-ktp",
        "namaPersyaratan": "Kartu Tanda Penduduk (KTP)",
        "formatAllowed": "PDF, JPG, PNG",
        "maxSize": "2 MB",
        "isMandatory": true
      }
    ]
  }
]
```

---

### 1.2 Pendaftaran akun calon peserta

#### Narasi monolog
Sebagai calon peserta baru, saya dapat mendaftarkan akun mandiri melalui modal registrasi publik. Saya mengisikan 16 digit NIK, nama lengkap, alamat email aktif, kata sandi, serta konfirmasi kata sandi. Sistem memvalidasi bahwa NIK tepat berjumlah 16 digit numerik dan alamat email belum terdaftar pada basis data. Gateway menghapus header peran dari klien luar untuk mencegah eskalasi wewenang. Service RBAC menyimpan akun dengan hashing Argon2id, menerbitkan token akses JWT dan cookie sesi berumur 7 hari, lalu mengarahkan peramban saya ke `/applicant`.

#### Berkas yang dibuka
- Pengujian E2E: [`tests/e2e/01-applicant-portal.spec.ts`](file:///d:/Coding/beasiswaapp/tests/e2e/01-applicant-portal.spec.ts#L38-L61)
- Modal Registrasi: [`apps/web/src/components/modals/applicant/RegisterModal.tsx`](file:///d:/Coding/beasiswaapp/apps/web/src/components/modals/applicant/RegisterModal.tsx)
- Klien API Auth: [`apps/web/src/lib/api.ts`](file:///d:/Coding/beasiswaapp/apps/web/src/lib/api.ts#L161-L180)
- Gateway Hook: [`apps/api-gateway/src/index.ts`](file:///d:/Coding/beasiswaapp/apps/api-gateway/src/index.ts#L59-L65)
- Service RBAC: [`apps/service-rbac/src/index.ts`](file:///d:/Coding/beasiswaapp/apps/service-rbac/src/index.ts#L107-L147)

#### Potongan kode frontend
```tsx
// apps/web/src/components/modals/applicant/RegisterModal.tsx
const handleRegister = async (values: RegisterInput) => {
  const res = await authApi.register({
    nik: values.nik,
    name: values.namaLengkap,
    email: values.email,
    password: values.password,
  });
  toast.success("Registrasi berhasil!");
  navigate({ to: "/applicant" });
};
```

#### Potongan kode backend
```typescript
// apps/service-rbac/src/index.ts
fastify.post("/api/auth/register", async (request, reply) => {
  const { nik, name, email, password } = request.body as any;
  const existing = await rbacRepository.findUserWithAuthByEmail(email);
  if (existing) {
    return reply.status(400).send({ error: "Alamat email sudah terdaftar. Silakan masuk." });
  }

  const userId = nik ? `user-${nik}` : undefined;
  const user = await rbacRepository.createUserWithAccount({
    id: userId,
    name,
    email,
    passwordRaw: password,
    roleName: "applicant",
  });

  const accessToken = await generateAccessToken(user);
  const sessionToken = await generateSessionToken(user);
  setAuthCookies(reply, sessionToken);

  return reply.status(201).send({ token: accessToken, user });
});
```

#### Request network
- Metode: `POST`
- URL: `http://localhost:3000/api/auth/register`
- Header:
  - `Content-Type: application/json`
- Payload:
```json
{
  "nik": "3201123456780002",
  "name": "Budi Santoso E2E",
  "email": "budi_test@example.com",
  "password": "Password123!"
}
```
- Respons: `201 Created`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-3201123456780002",
    "name": "Budi Santoso E2E",
    "email": "budi_test@example.com",
    "role": "applicant",
    "nik": "3201123456780002"
  }
}
```

---

### 1.3 Wizard empat tahap, autosave, unggah dokumen, dan filter berkas SVG

#### Narasi monolog
Sebagai calon peserta terdaftar, saya dapat memilih program beasiswa untuk memulai berkas permohonan baru. Sistem membuat draft dengan nomor registrasi unik `PRM-2026-xxxx` dan menerapkan aturan satu permohonan aktif. Pada Tahap 1, saya mengisi biodata lengkap dan menekan tombol Selanjutnya. Sistem langsung menyimpan data tersebut ke basis data. Pada Tahap 2, saya mengisi riwayat pendidikan dan pekerjaan. Pada Tahap 3, saya mengunggah berkas KTP, Kartu Keluarga, Ijazah, dan Surat Rekomendasi. Jika saya mencoba mengunggah berkas format SVG, antarmuka dan backend menolak secara mutlak karena berkas SVG berbasis XML rentan serangan XSS. Dokumen valid diperiksa tipe berkasnya melalui 4096 byte pertama dan dipindai oleh ClamAV secara streaming. Terakhir, pada Tahap 4, saya mencentang lembar persetujuan keabsahan data lalu mengirim formulir.

#### Berkas yang dibuka
- Pengujian E2E: [`tests/e2e/01-applicant-portal.spec.ts`](file:///d:/Coding/beasiswaapp/tests/e2e/01-applicant-portal.spec.ts#L63-L173)
- Halaman Applicant: [`apps/web/src/routes/applicant.tsx`](file:///d:/Coding/beasiswaapp/apps/web/src/routes/applicant.tsx#L47-L62)
- Komponen Wizard: [`apps/web/src/components/modals/applicant/WizardModal.tsx`](file:///d:/Coding/beasiswaapp/apps/web/src/components/modals/applicant/WizardModal.tsx)
- Klien API Transaksi: [`apps/web/src/lib/api.ts`](file:///d:/Coding/beasiswaapp/apps/web/src/lib/api.ts#L328-L361)
- Service Transaksi: [`apps/service-transaksi/src/index.ts`](file:///d:/Coding/beasiswaapp/apps/service-transaksi/src/index.ts#L95-L294)
- Service Dokumen: [`apps/service-dokumen/src/index.ts`](file:///d:/Coding/beasiswaapp/apps/service-dokumen/src/index.ts#L59-L245)

#### Potongan kode frontend
```tsx
// apps/web/src/components/modals/applicant/WizardModal.tsx
const handleNextStep = async () => {
  if (currentStep === 1) {
    await saveStep1Mutation.mutateAsync({ id: pendaftaranId, biodata: formValues.biodata });
    setCurrentStep(2);
  } else if (currentStep === 2) {
    await saveStep2Mutation.mutateAsync({ id: pendaftaranId, pendidikan: formValues.pendidikan });
    setCurrentStep(3);
  } else if (currentStep === 3) {
    setCurrentStep(4);
  }
};

const handleFinalSubmit = async () => {
  await submitMutation.mutateAsync(pendaftaranId);
  toast.success("Pendaftaran berhasil dikirimkan!");
};
```

#### Potongan kode backend
```typescript
// apps/service-dokumen/src/index.ts
const originalName = filename.toLowerCase();
if (originalName.endsWith(".svg") || mimetype === "image/svg+xml") {
  uploadedFilePart.file.resume();
  return reply.status(400).send({
    error: "Berkas SVG dilarang secara mutlak karena alasan keamanan siber (Anti-XSS).",
  });
}

// Deteksi tipe berkas dari magic bytes awal tanpa buffer seluruh file
const detectedType = await fileTypeFromBuffer(peekBuffer.subarray(0, 4096));
const allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png"];
if (!detectedType || !allowedMimeTypes.includes(detectedType.mime)) {
  return reply.status(400).send({
    error: "Tipe berkas tidak valid. Hanya dokumen PDF, JPG, dan PNG yang diizinkan.",
  });
}
```

```typescript
// apps/service-transaksi/src/index.ts
fastify.post("/api/transaksi/pendaftaran/:id/submit", async (request, reply) => {
  const { id } = request.params as { id: string };
  const updated = await repository.update(id, {
    status: StatusPendaftaran.SUBMITTED,
    stepWizardTerakhir: 4,
    submittedAt: new Date(),
  });
  return { success: true, data: updated };
});
```

#### Request network
1. Inisiasi Draft Pendaftaran:
   - `POST /api/transaksi/pendaftaran`
   - Payload: `{"beasiswaId": "bsw-1", "programName": "Full Stack Web Developer"}`
   - Respons: `201 Created` dengan `kodePermohonan: "PRM-2026-8812"`
2. Autosave Tahap 1:
   - `PUT /api/transaksi/pendaftaran/prm-1/step/1`
   - Payload: `{"nik": "3201123456780002", "namaLengkap": "Calon Peserta Terverifikasi", "tempatLahir": "Bandung", "tglLahir": "1998-05-15", "alamat": "Jl. Dipatiukur No. 45", "provinsi": "Jawa Barat", "kabupatenKota": "Kota Bandung", "kecamatan": "Coblong", "kelurahan": "Dago", "noHp": "081234567890"}`
   - Respons: `200 OK`
3. Autosave Tahap 2:
   - `PUT /api/transaksi/pendaftaran/prm-1/step/2`
   - Payload: `{"pendidikanTerakhir": "S1 (Sarjana)", "namaInstansi": "Institut Teknologi Bandung", "jurusan": "Teknik Informatika", "pekerjaanSaatIni": "Fresh Graduate"}`
   - Respons: `200 OK`
4. Unggah Dokumen:
   - `POST /api/dokumen/upload?pendaftaranId=prm-1&persyaratanId=req-ktp&kodePermohonan=PRM-2026-8812`
   - Header: `Content-Type: multipart/form-data`
   - Respons: `201 Created` dengan metadata berkas dan status pemindaian ClamAV
5. Pengiriman Final:
   - `POST /api/transaksi/pendaftaran/prm-1/submit`
   - Header: `Authorization: Bearer <token_jwt>`
   - Respons: `200 OK`
```json
{
  "success": true,
  "message": "Pendaftaran berhasil dikirimkan dan masuk antrean verifikasi administrasi.",
  "data": {
    "id": "prm-1",
    "status": "SUBMITTED"
  }
}
```

---

### 1.4 Penguncian status dan mode read-only

#### Narasi monolog
Sebagai calon peserta yang sudah mengirimkan berkas pendaftaran, saya dapat membuka kembali data formulir melalui tombol "Lihat Data Terkirim". Sistem membuka modal dalam mode read-only. Seluruh kolom isian teks, dropdown wilayah, dan tombol pengunggahan berkas berada dalam kondisi dinonaktifkan. Tombol submit disembunyikan dan diganti dengan tombol tutup. Aturan mesin status pada backend menolak mutasi data apa pun saat permohonan berstatus `SUBMITTED`, sehingga integritas data terjamin selama proses seleksi.

#### Berkas yang dibuka
- Pengujian E2E: [`tests/e2e/01-applicant-portal.spec.ts`](file:///d:/Coding/beasiswaapp/tests/e2e/01-applicant-portal.spec.ts#L175-L200)
- Halaman Applicant: [`apps/web/src/routes/applicant.tsx`](file:///d:/Coding/beasiswaapp/apps/web/src/routes/applicant.tsx#L207-L277)
- Komponen Modal: [`apps/web/src/components/modals/applicant/WizardModal.tsx`](file:///d:/Coding/beasiswaapp/apps/web/src/components/modals/applicant/WizardModal.tsx)
- Guard Backend: [`apps/service-transaksi/src/index.ts`](file:///d:/Coding/beasiswaapp/apps/service-transaksi/src/index.ts#L185-L192)

#### Potongan kode frontend
```tsx
// apps/web/src/routes/applicant.tsx
<button
  type="button"
  className="btn btn-sm btn-outline-primary"
  onClick={() => setReadonlyOpen(true)}
>
  <i className="bi bi-eye me-1"></i>Lihat Data Terkirim
</button>

<WizardModal
  isOpen={readonlyOpen}
  onClose={() => setReadonlyOpen(false)}
  pendaftaranRecord={activeApp}
  readOnly={true}
/>
```

#### Potongan kode backend
```typescript
// apps/service-transaksi/src/index.ts
if (
  pendaftaran.status !== StatusPendaftaran.DRAFT &&
  pendaftaran.status !== StatusPendaftaran.REVISI
) {
  return reply.status(403).send({
    error: "Formulir terkunci penuh (Read-Only) karena telah dikirimkan.",
  });
}
```

#### Request network
- Metode: `GET`
- URL: `http://localhost:3000/api/transaksi/pendaftaran/my-active`
- Header:
  - `Authorization: Bearer <token_applicant>`
- Respons: `200 OK`
```json
{
  "id": "prm-1",
  "kodePermohonan": "PRM-2026-8812",
  "status": "SUBMITTED",
  "stepWizardTerakhir": 4,
  "biodata": {
    "namaLengkap": "Calon Peserta Terverifikasi"
  }
}
```

---

## 02. Petugas verifikator: review dan keputusan seleksi administrasi

Uji terkait: `tests/e2e/02-verifikator-review.spec.ts`

### 2.1 Login verifikator dan dashboard antrean berkas

#### Narasi monolog
Sebagai petugas verifikator, saya dapat masuk ke portal internal verifikasi di rute `/verifikator`. Gateway API memverifikasi token dan memastikan pengguna memiliki peran `verifikator`, `admin`, atau `superadmin`. Halaman menampilkan ringkasan metrik beban kerja: jumlah permohonan yang perlu diverifikasi, berkas berstatus revisi, berkas yang disetujui, dan berkas yang ditolak. Di bawah kartu metrik, sistem menyajikan tabel daftar pelamar yang menunggu pemeriksaan dokumen.

#### Berkas yang dibuka
- Pengujian E2E: [`tests/e2e/02-verifikator-review.spec.ts`](file:///d:/Coding/beasiswaapp/tests/e2e/02-verifikator-review.spec.ts#L9-L22)
- Halaman Verifikator: [`apps/web/src/routes/verifikator.tsx`](file:///d:/Coding/beasiswaapp/apps/web/src/routes/verifikator.tsx#L40-L76)
- Gateway Proxy: [`apps/api-gateway/src/index.ts`](file:///d:/Coding/beasiswaapp/apps/api-gateway/src/index.ts#L186-L209)
- Endpoint Antrean: [`apps/service-transaksi/src/index.ts`](file:///d:/Coding/beasiswaapp/apps/service-transaksi/src/index.ts#L320-L332)

#### Potongan kode frontend
```tsx
// apps/web/src/routes/verifikator.tsx
const { data: pendaftarList = [], isLoading } = useVerifikatorQueue();

const countPerluVerif = pendaftarList.filter(
  (p) => p.status === "SUBMITTED" && (!p.verifikasi || p.verifikasi.statusKeputusan === "pending")
).length;
const countRevisi = pendaftarList.filter((p) => p.status === "REVISI").length;
const countDisetujui = pendaftarList.filter((p) => p.status === "LOLOS_ADMIN").length;
```

#### Potongan kode backend
```typescript
// apps/service-transaksi/src/index.ts
fastify.get("/api/transaksi/verifikasi/queue", async (request, reply) => {
  const userRole = request.headers["x-user-role"] as string;
  if (userRole !== "verifikator" && userRole !== "admin" && userRole !== "superadmin") {
    return reply.status(403).send({ error: "Akses verifikator diperlukan." });
  }
  return repository.getVerifikatorQueue();
});
```

#### Request network
- Metode: `GET`
- URL: `http://localhost:3000/api/transaksi/verifikasi/queue`
- Header:
  - `Authorization: Bearer <token_verifikator>`
- Respons: `200 OK`
```json
[
  {
    "id": "prm-1",
    "kodePermohonan": "PRM-2026-8812",
    "userName": "Calon Peserta Terverifikasi",
    "status": "SUBMITTED",
    "beasiswaNama": "Full Stack Web Developer Professional"
  }
]
```

---

### 2.2 Inspeksi dokumen multi-tab dan penerbitan revisi berkas

#### Narasi monolog
Sebagai petugas verifikator, saya dapat membuka workspace verifikasi calon peserta melalui tombol "Verifikasi Data". Di panel kiri, saya memeriksa keabsahan data identitas dan checklist berkas persyaratan. Di panel kanan, sistem menampilkan pratinjau dokumen fisik yang dialirkan secara aman melalui token akses bertanda tangan. Apabila saya menemukan dokumen yang buram atau tidak terbaca, saya dapat menandai dokumen tersebut dengan status "Revisi" dan menuliskan catatan perbaikan spesifik. Saya kemudian memilih keputusan akhir "revisi", mengisi catatan ringkasan verifikator, dan mengirimkan keputusan. Permohonan berpindah status menjadi `REVISI`.

#### Berkas yang dibuka
- Pengujian E2E: [`tests/e2e/02-verifikator-review.spec.ts`](file:///d:/Coding/beasiswaapp/tests/e2e/02-verifikator-review.spec.ts#L24-L89)
- Komponen Modal: [`apps/web/src/components/modals/internal/VerifikasiModal.tsx`](file:///d:/Coding/beasiswaapp/apps/web/src/components/modals/internal/VerifikasiModal.tsx#L54-L80)
- Streaming Dokumen: [`apps/service-dokumen/src/index.ts`](file:///d:/Coding/beasiswaapp/apps/service-dokumen/src/index.ts#L248-L287)
- Penyimpanan Keputusan: [`apps/service-transaksi/src/index.ts`](file:///d:/Coding/beasiswaapp/apps/service-transaksi/src/index.ts#L334-L361)

#### Potongan kode frontend
```tsx
// apps/web/src/components/modals/internal/VerifikasiModal.tsx
const handleSubmitDecision = async () => {
  await submitVerifikasiMutation.mutateAsync({
    id: pendaftaran.id,
    decision: {
      statusKeputusan: "revisi",
      catatanVerifikator: "Mohon perbaiki dokumen ijazah yang buram sesuai catatan.",
      catatanRevisi: "Scan dokumen tidak jelas/buram. Harap unggah ulang dengan format jelas.",
      checklistIjazah: false,
    },
  });
  toast.success("Keputusan revisi berhasil dikirimkan.");
};
```

#### Potongan kode backend
```typescript
// apps/service-transaksi/src/index.ts
fastify.post("/api/transaksi/verifikasi/:id/decision", async (request, reply) => {
  const { id } = request.params as { id: string };
  const body = request.body as any;

  const updated = await repository.upsertVerifikasi(id, userId, {
    statusKeputusan: body.statusKeputusan,
    catatanRevisi: body.catatanRevisi || body.catatanVerifikator,
    checklistKtp: body.checklistKtp,
    checklistIjazah: body.checklistIjazah,
  });

  return {
    success: true,
    message: `Keputusan verifikasi berhasil disimpan. Status: ${updated?.status}.`,
    data: updated,
  };
});
```

#### Request network
- Metode: `POST`
- URL: `http://localhost:3000/api/transaksi/verifikasi/prm-1/decision`
- Header:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token_verifikator>`
- Payload:
```json
{
  "statusKeputusan": "revisi",
  "catatanVerifikator": "Mohon perbaiki dokumen ijazah yang buram sesuai catatan.",
  "catatanRevisi": "Scan dokumen tidak jelas/buram. Harap unggah ulang dengan format jelas.",
  "checklistKtp": true,
  "checklistKk": true,
  "checklistIjazah": false,
  "checklistRekomendasi": true
}
```
- Respons: `200 OK`
```json
{
  "success": true,
  "message": "Keputusan verifikasi berhasil disimpan. Status permohonan sekarang: REVISI.",
  "data": {
    "id": "prm-1",
    "status": "REVISI"
  }
}
```

---

### 2.3 Persetujuan berkas pendaftaran (LOLOS_ADMIN)

#### Narasi monolog
Sebagai petugas verifikator, saya dapat menyetujui permohonan pelamar ketika seluruh berkas persyaratan telah terverifikasi valid dan sesuai pedoman. Saya menandai setiap butir dokumen dengan status "Sesuai", memilih status keputusan "disetujui", dan memberikan catatan kelulusan administrasi. Backend memvalidasi bahwa tidak ada dokumen yang berstatus tolak sebelum mengubah status menjadi `LOLOS_ADMIN`. Pelamar yang disetujui otomatis keluar dari antrean verifikator dan diteruskan ke antrean pewawancara.

#### Berkas yang dibuka
- Pengujian E2E: [`tests/e2e/02-verifikator-review.spec.ts`](file:///d:/Coding/beasiswaapp/tests/e2e/02-verifikator-review.spec.ts#L91-L121)
- Komponen Modal: [`apps/web/src/components/modals/internal/VerifikasiModal.tsx`](file:///d:/Coding/beasiswaapp/apps/web/src/components/modals/internal/VerifikasiModal.tsx#L100-L135)
- Repository Transaksi: [`apps/service-transaksi/src/repository.ts`](file:///d:/Coding/beasiswaapp/apps/service-transaksi/src/repository.ts)

#### Potongan kode frontend
```tsx
// apps/web/src/components/modals/internal/VerifikasiModal.tsx
const handleApproveAll = async () => {
  await submitVerifikasiMutation.mutateAsync({
    id: pendaftaran.id,
    decision: {
      statusKeputusan: "disetujui",
      catatanVerifikator: "Seluruh dokumen persyaratan telah diverifikasi dan memenuhi syarat kelulusan administrasi.",
      checklistKtp: true,
      checklistKk: true,
      checklistIjazah: true,
      checklistRekomendasi: true,
    },
  });
};
```

#### Potongan kode backend
```typescript
// apps/service-transaksi/src/repository.ts
if (decision.statusKeputusan === "disetujui") {
  pendaftaran.status = StatusPendaftaran.LOLOS_ADMIN;
} else if (decision.statusKeputusan === "revisi") {
  pendaftaran.status = StatusPendaftaran.REVISI;
} else if (decision.statusKeputusan === "ditolak") {
  pendaftaran.status = StatusPendaftaran.TIDAK_LOLOS_ADMIN;
}
```

#### Request network
- Metode: `POST`
- URL: `http://localhost:3000/api/transaksi/verifikasi/prm-1/decision`
- Header:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token_verifikator>`
- Payload:
```json
{
  "statusKeputusan": "disetujui",
  "catatanVerifikator": "Seluruh dokumen persyaratan telah diverifikasi dan memenuhi syarat kelulusan administrasi.",
  "checklistKtp": true,
  "checklistKk": true,
  "checklistIjazah": true,
  "checklistRekomendasi": true
}
```
- Respons: `200 OK`
```json
{
  "success": true,
  "message": "Keputusan verifikasi berhasil disimpan. Status permohonan sekarang: LOLOS_ADMIN.",
  "data": {
    "id": "prm-1",
    "status": "LOLOS_ADMIN"
  }
}
```

---

## 03. Calon peserta: penanganan revisi dan unggah ulang berkas

Uji terkait: `tests/e2e/03-revision-handling.spec.ts`

### 3.1 Peringatan revisi dan pembukaan selektif form dokumen

#### Narasi monolog
Sebagai calon peserta yang menerima status revisi, saya dapat masuk ke dasbor dan melihat kartu peringatan berwarna kuning beserta tombol "Perbaiki Data". Saat tombol tersebut ditekan, wizard langsung membuka Tahap 3 (Unggah Dokumen) secara otomatis tanpa mengharuskan saya mengisi ulang biodata atau pendidikan. Sistem menerapkan penguncian selektif: dokumen yang telah disetujui menampilkan lencana hijau "Disetujui" dengan input berkas dinonaktifkan. Hanya dokumen yang ditolak yang membuka tombol unggah ulang disertai catatan perbaikan dari verifikator. Saya mengunggah berkas pengganti yang jelas, mencentang lembar persetujuan pada Tahap 4, lalu mengirim ulang pendaftaran. Status permohonan kembali menjadi `SUBMITTED`.

#### Berkas yang dibuka
- Pengujian E2E: [`tests/e2e/03-revision-handling.spec.ts`](file:///d:/Coding/beasiswaapp/tests/e2e/03-revision-handling.spec.ts#L22-L74)
- Dasbor Pemohon: [`apps/web/src/routes/applicant.tsx`](file:///d:/Coding/beasiswaapp/apps/web/src/routes/applicant.tsx#L280-L350)
- Wizard Pengunggahan: [`apps/web/src/components/modals/applicant/WizardModal.tsx`](file:///d:/Coding/beasiswaapp/apps/web/src/components/modals/applicant/WizardModal.tsx)
- Handler Re-Submit: [`apps/service-transaksi/src/index.ts`](file:///d:/Coding/beasiswaapp/apps/service-transaksi/src/index.ts#L265-L294)

#### Potongan kode frontend
```tsx
// apps/web/src/components/modals/applicant/WizardModal.tsx
// Buka otomatis ke Step 3 jika status pendaftaran adalah REVISI
useEffect(() => {
  if (pendaftaranRecord?.status === "REVISI") {
    setCurrentStep(3);
  }
}, [pendaftaranRecord]);

// Render selektif: kunci dokumen yang sudah berstatus Sesuai
{isApproved ? (
  <span className="badge bg-success-subtle text-success border border-success">
    <i className="bi bi-check-circle me-1"></i>Disetujui
  </span>
) : (
  <input
    type="file"
    className="form-control"
    onChange={(e) => handleFileChange(req.id, e.target.files?.[0])}
  />
)}
```

#### Potongan kode backend
```typescript
// apps/service-transaksi/src/index.ts
// Izinkan mutasi step hanya bila status bernilai DRAFT atau REVISI
if (
  pendaftaran.status !== StatusPendaftaran.DRAFT &&
  pendaftaran.status !== StatusPendaftaran.REVISI
) {
  return reply.status(403).send({
    error: "Formulir terkunci penuh (Read-Only) karena telah dikirimkan.",
  });
}
```

#### Request network
1. Mengunggah Berkas Ijazah Pengganti:
   - `POST /api/dokumen/upload?pendaftaranId=prm-1&persyaratanId=req-ijazah&kodePermohonan=PRM-2026-8812`
   - Header: `Content-Type: multipart/form-data`
   - Respons: `201 Created`
2. Kirim Ulang Permohonan:
   - `POST /api/transaksi/pendaftaran/prm-1/submit`
   - Header: `Authorization: Bearer <token_applicant>`
   - Respons: `200 OK`
```json
{
  "success": true,
  "message": "Pendaftaran berhasil dikirimkan dan masuk antrean verifikasi administrasi.",
  "data": {
    "id": "prm-1",
    "status": "SUBMITTED"
  }
}
```

---

## 04. Lembaga seleksi: penilaian wawancara dan perhitungan bobot

Uji terkait: `tests/e2e/04-interviewer-scoring.spec.ts`

### 4.1 Antrean kandidat siap wawancara

#### Narasi monolog
Sebagai pewawancara dari lembaga seleksi, saya dapat masuk ke portal `/wawancara`. Halaman ini menyaring pendaftar secara ketat, hanya menampilkan peserta yang telah lulus verifikasi administrasi dengan status `LOLOS_ADMIN`. Pewawancara tidak terbebani oleh berkas yang belum lengkap atau berstatus revisi. Saya dapat melihat ringkasan metrik kandidat yang siap diwawancarai, kandidat yang sudah dinilai, dan kandidat yang belum dinilai.

#### Berkas yang dibuka
- Pengujian E2E: [`tests/e2e/04-interviewer-scoring.spec.ts`](file:///d:/Coding/beasiswaapp/tests/e2e/04-interviewer-scoring.spec.ts#L9-L19)
- Halaman Wawancara: [`apps/web/src/routes/wawancara.tsx`](file:///d:/Coding/beasiswaapp/apps/web/src/routes/wawancara.tsx#L20-L65)
- Endpoint Antrean Wawancara: [`apps/service-transaksi/src/index.ts`](file:///d:/Coding/beasiswaapp/apps/service-transaksi/src/index.ts#L363-L375)

#### Potongan kode frontend
```tsx
// apps/web/src/routes/wawancara.tsx
const { data: candidates = [], isLoading } = useWawancaraQueue();

const countBelumDinilai = candidates.filter((p) => !p.wawancara?.nilaiWawancara).length;
const countLulus = candidates.filter(
  (p) => p.wawancara?.statusHasil === "Lulus" || p.status === "LULUS_DITERIMA"
).length;
```

#### Potongan kode backend
```typescript
// apps/service-transaksi/src/index.ts
fastify.get("/api/transaksi/wawancara/queue", async (request, reply) => {
  const userRole = request.headers["x-user-role"] as string;
  if (userRole !== "interviewer" && userRole !== "admin" && userRole !== "superadmin") {
    return reply.status(403).send({ error: "Akses pewawancara diperlukan." });
  }
  return repository.getWawancaraQueue();
});
```

#### Request network
- Metode: `GET`
- URL: `http://localhost:3000/api/transaksi/wawancara/queue`
- Header:
  - `Authorization: Bearer <token_interviewer>`
- Respons: `200 OK`
```json
[
  {
    "id": "prm-1",
    "kodePermohonan": "PRM-2026-8812",
    "userName": "Calon Peserta Terverifikasi",
    "status": "LOLOS_ADMIN",
    "beasiswaNama": "Full Stack Web Developer Professional"
  }
]
```

---

### 4.2 Penilaian rubrik terbobot dan penetapan kelulusan

#### Narasi monolog
Sebagai pewawancara, saya dapat membuka modal penilaian pada kandidat yang terpilih. Saya mengisikan skor untuk tiga rubrik standar: Komunikasi (bobot 30%), Kemampuan Teknis (bobot 40%), dan Komitmen Waktu (bobot 30%). Antarmuka menghitung skor akhir secara waktu nyata pada input read-only: jika komunikasi bernilai 85, teknis 90, dan komitmen 80, skor akhir otomatis tampil 85.50. Saya memilih status keputusan "Lulus", menyertakan catatan evaluasi kualitatif, dan mengirimkan penilaian. Backend menghitung ulang formula pembobotan secara independen sebelum menyimpan ke database untuk memastikan nilai tidak dapat dimanipulasi dari sisi klien. Status kandidat diperbarui menjadi `LULUS_DITERIMA`.

#### Berkas yang dibuka
- Pengujian E2E: [`tests/e2e/04-interviewer-scoring.spec.ts`](file:///d:/Coding/beasiswaapp/tests/e2e/04-interviewer-scoring.spec.ts#L21-L65)
- Modal Wawancara: [`apps/web/src/components/modals/internal/WawancaraModal.tsx`](file:///d:/Coding/beasiswaapp/apps/web/src/components/modals/internal/WawancaraModal.tsx#L43-L61)
- Endpoint Skoring Backend: [`apps/service-transaksi/src/index.ts`](file:///d:/Coding/beasiswaapp/apps/service-transaksi/src/index.ts#L376-L409)

#### Potongan kode frontend
```tsx
// apps/web/src/components/modals/internal/WawancaraModal.tsx
const k = Number(value.skorKomunikasi) || 0;
const t = Number(value.skorTeknis) || 0;
const m = Number(value.skorKomitmen) || 0;
const nilaiAkhir = Number((k * 0.3 + t * 0.4 + m * 0.3).toFixed(2));

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
```

#### Potongan kode backend
```typescript
// apps/service-transaksi/src/index.ts
fastify.post("/api/transaksi/wawancara/:id/scoring", async (request, reply) => {
  const { id } = request.params as { id: string };
  const body = request.body as any;

  // Hitung ulang secara server-side: (K * 0.3) + (T * 0.4) + (M * 0.3)
  const k = Number(body.skorKomunikasi ?? 0);
  const t = Number(body.skorTeknis ?? 0);
  const m = Number(body.skorKomitmen ?? 0);
  const calculatedNilai = Number((k * 0.3 + t * 0.4 + m * 0.3).toFixed(2));

  const updated = await repository.upsertWawancara(id, userId, {
    nilaiWawancara: calculatedNilai,
    catatanEvaluasi: body.catatanEvaluasi,
    statusHasil: body.statusHasil || (calculatedNilai >= 70 ? "Lulus" : "Tidak Lulus"),
  });

  return { success: true, data: updated };
});
```

#### Request network
- Metode: `POST`
- URL: `http://localhost:3000/api/transaksi/wawancara/prm-1/scoring`
- Header:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token_interviewer>`
- Payload:
```json
{
  "skorKomunikasi": 85,
  "skorTeknis": 90,
  "skorKomitmen": 80,
  "nilaiWawancara": 85.50,
  "statusHasil": "Lulus",
  "catatanEvaluasi": "Kandidat memiliki wawasan teknis yang sangat baik, motivasi tinggi, dan komitmen waktu penuh."
}
```
- Respons: `200 OK`
```json
{
  "success": true,
  "message": "Penilaian wawancara berhasil disimpan. Nilai akhir: 85.5.",
  "data": {
    "id": "prm-1",
    "status": "LULUS_DITERIMA"
  }
}
```

---

## 05. Calon peserta: pengumuman kelulusan dan daftar ulang

Uji terkait: `tests/e2e/05-announcement-and-reregistration.spec.ts`

### 5.1 Banner kelulusan, unduh SK, dan konfirmasi kehadiran

#### Narasi monolog
Sebagai peserta yang dinyatakan lulus seleksi, saya dapat masuk ke portal pendaftar dan disambut oleh banner perayaan kelulusan. Saya dapat menekan tombol "Unduh Surat Kelulusan (PDF)" untuk mencetak dokumen Surat Keputusan resmi yang memuat nomor registrasi, nama, program beasiswa, dan stempel verifikasi elektronik. Selanjutnya, saya menekan tombol "Konfirmasi / Daftar Ulang" untuk membuka modal kepastian kehadiran, memilih opsi "bersedia", mengisi catatan komitmen belajar, lalu mengirimkan konfirmasi. Sistem mencatat kesediaan saya ke basis data untuk mengunci alokasi kuota penerima beasiswa.

#### Berkas yang dibuka
- Pengujian E2E: [`tests/e2e/05-announcement-and-reregistration.spec.ts`](file:///d:/Coding/beasiswaapp/tests/e2e/05-announcement-and-reregistration.spec.ts#L9-L42)
- Halaman Applicant: [`apps/web/src/routes/applicant.tsx`](file:///d:/Coding/beasiswaapp/apps/web/src/routes/applicant.tsx#L119-L154) dan [L455-L485](file:///d:/Coding/beasiswaapp/apps/web/src/routes/applicant.tsx#L455-L485)
- Modal Daftar Ulang: [`apps/web/src/components/modals/applicant/DaftarUlangModal.tsx`](file:///d:/Coding/beasiswaapp/apps/web/src/components/modals/applicant/DaftarUlangModal.tsx)
- Endpoint Backend: [`apps/service-transaksi/src/index.ts`](file:///d:/Coding/beasiswaapp/apps/service-transaksi/src/index.ts#L296-L318)

#### Potongan kode frontend
```tsx
// apps/web/src/routes/applicant.tsx
{currentStatus === "LULUS_DITERIMA" && (
  <div className="hero-lulus p-4 mb-4 shadow-sm">
    <h2>Selamat, {activeApp.userName}!</h2>
    <p>Anda dinyatakan LULUS SELEKSI dan diterima sebagai penerima beasiswa.</p>
    <button className="btn btn-warning" onClick={handleDownloadSK}>
      Unduh Surat Kelulusan (PDF)
    </button>
    <button className="btn btn-outline-light ms-2" onClick={() => setDaftarUlangOpen(true)}>
      Konfirmasi / Daftar Ulang
    </button>
  </div>
)}
```

#### Potongan kode backend
```typescript
// apps/service-transaksi/src/index.ts
fastify.post("/api/transaksi/pendaftaran/:id/daftar-ulang", async (request, reply) => {
  const { id } = request.params as { id: string };
  const { statusKesediaan, catatan } = request.body as any;

  const updated = await repository.confirmDaftarUlang(id, statusKesediaan, catatan);
  return {
    success: true,
    message: "Konfirmasi daftar ulang berhasil disimpan.",
    data: updated,
  };
});
```

#### Request network
- Metode: `POST`
- URL: `http://localhost:3000/api/transaksi/pendaftaran/prm-1/daftar-ulang`
- Header:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token_applicant>`
- Payload:
```json
{
  "statusKesediaan": "bersedia",
  "catatan": "Saya bersedia mengikuti pelatihan secara penuh dan mematuhi tata tertib."
}
```
- Respons: `200 OK`
```json
{
  "success": true,
  "message": "Konfirmasi daftar ulang berhasil disimpan.",
  "data": {
    "id": "prm-1",
    "statusKesediaan": "bersedia",
    "confirmedAt": "2026-09-08T13:37:00.000Z"
  }
}
```

---

## 06. Administrator: pengelolaan master data, akun internal, dan audit

Uji terkait: `tests/e2e/06-admin-management.spec.ts`

### 6.1 Statistik dashboard dan monitoring kuota

#### Narasi monolog
Sebagai administrator sistem, saya dapat mengakses dasbor `/admin` untuk melihat agregasi data pendaftaran dari seluruh layanan. Dasbor menyajikan kartu metrik utama: total pelamar yang mendaftar, jumlah berkas dalam proses seleksi administrasi, jumlah yang lolos administrasi, dan total peserta yang diterima. Informasi ini membantu pemangku kepentingan memantau keterisian kuota secara transparan.

#### Berkas yang dibuka
- Pengujian E2E: [`tests/e2e/06-admin-management.spec.ts`](file:///d:/Coding/beasiswaapp/tests/e2e/06-admin-management.spec.ts#L9-L19)
- Halaman Admin: [`apps/web/src/routes/admin.tsx`](file:///d:/Coding/beasiswaapp/apps/web/src/routes/admin.tsx#L60-L70)
- Endpoint Statistik: [`apps/service-transaksi/src/index.ts`](file:///d:/Coding/beasiswaapp/apps/service-transaksi/src/index.ts#L410-L418)

#### Potongan kode frontend
```tsx
// apps/web/src/routes/admin.tsx
const { data: backendStats } = useAdminStatistics();

return (
  <div className="row g-3">
    <div className="col-md-3">
      <StatCard title="Total Calon Peserta" value={backendStats?.total ?? 0} />
    </div>
    <div className="col-md-3">
      <StatCard title="Proses Administrasi" value={backendStats?.submitted ?? 0} />
    </div>
    <div className="col-md-3">
      <StatCard title="Lulus Administrasi" value={backendStats?.lolosAdmin ?? 0} />
    </div>
  </div>
);
```

#### Potongan kode backend
```typescript
// apps/service-transaksi/src/index.ts
fastify.get("/api/transaksi/admin/statistics", async (request, reply) => {
  const userRole = request.headers["x-user-role"] as string;
  if (userRole !== "admin" && userRole !== "superadmin") {
    return reply.status(403).send({ error: "Akses administrator diperlukan." });
  }
  return repository.getStatistics();
});
```

#### Request network
- Metode: `GET`
- URL: `http://localhost:3000/api/transaksi/admin/statistics`
- Header:
  - `Authorization: Bearer <token_admin>`
- Respons: `200 OK`
```json
{
  "total": 48,
  "draft": 6,
  "submitted": 14,
  "revisi": 4,
  "lolosAdmin": 12,
  "lulusDiterima": 10,
  "tidakLolos": 2
}
```

---

### 6.2 Rekapitulasi hasil seleksi dan ekspor berkas Excel / CSV

#### Narasi monolog
Sebagai administrator, saya dapat berpindah ke tab "Hasil Seleksi" untuk mengaudit tabel kelulusan seluruh peserta. Saya dapat menekan tombol "Export Excel" untuk mengekspor rekapitulasi data pendaftaran. Backend menghasilkan berkas CSV berkarakter UTF-8 Byte Order Mark (BOM) agar simbol dan tanda baca terbaca rapi saat dibuka di Microsoft Excel. Dokumen ekspor ini mencakup nama peserta, NIK, program pelatihan, skor wawancara, dan status kelulusan akhir.

#### Berkas yang dibuka
- Pengujian E2E: [`tests/e2e/06-admin-management.spec.ts`](file:///d:/Coding/beasiswaapp/tests/e2e/06-admin-management.spec.ts#L21-L45)
- Halaman Admin: [`apps/web/src/routes/admin.tsx`](file:///d:/Coding/beasiswaapp/apps/web/src/routes/admin.tsx#L73-L80)
- Ekspor Klien: [`apps/web/src/lib/api.ts`](file:///d:/Coding/beasiswaapp/apps/web/src/lib/api.ts#L415-L428)
- Generator CSV: [`apps/service-transaksi/src/index.ts`](file:///d:/Coding/beasiswaapp/apps/service-transaksi/src/index.ts#L438-L455)

#### Potongan kode frontend
```tsx
// apps/web/src/lib/api.ts
async exportExcel() {
  const blob = await request<Blob>("/api/transaksi/admin/export-excel");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `Rekap_Hasil_Seleksi_Beasiswa_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
```

#### Potongan kode backend
```typescript
// apps/service-transaksi/src/index.ts
fastify.get("/api/transaksi/admin/export-excel", async (request, reply) => {
  const list = await repository.getAll();
  const headers = ["No", "Kode Permohonan", "NIK", "Nama Peserta", "Program Beasiswa", "Nilai Akhir", "Status"];
  const rows = list.map((item, idx) => [
    idx + 1,
    item.kodePermohonan,
    item.userNik,
    item.userName,
    item.beasiswaNama,
    item.wawancara?.nilaiWawancara ?? "-",
    item.status,
  ]);

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  reply
    .header("Content-Type", "text/csv; charset=utf-8")
    .header("Content-Disposition", 'attachment; filename="Rekap_Hasil_Seleksi.csv"')
    .send(csvContent);
});
```

#### Request network
- Metode: `GET`
- URL: `http://localhost:3000/api/transaksi/admin/export-excel`
- Header:
  - `Authorization: Bearer <token_admin>`
- Respons: `200 OK` (Stream berkas teks CSV dengan header attachment)

---

### 6.3 Pengelolaan data master program beasiswa dan persyaratan dokumen

#### Narasi monolog
Sebagai administrator, saya dapat mengelola master data pada tab "Data Master". Saya dapat membuka modal "Tambah Beasiswa" untuk mendaftarkan program pelatihan baru dengan mengisi nama pelatihan, deskripsi, kuota, metode, dan batas tanggal pendaftaran. Di sub-tab persyaratan, saya dapat menentukan aturan dokumen baru seperti batas ukuran maksimal dan format berkas yang diperbolehkan. Gateway memastikan hanya peran administrator yang diizinkan mengirim mutasi HTTP POST, PUT, atau DELETE ke `/api/master/*`.

#### Berkas yang dibuka
- Pengujian E2E: [`tests/e2e/06-admin-management.spec.ts`](file:///d:/Coding/beasiswaapp/tests/e2e/06-admin-management.spec.ts#L47-L85)
- Halaman Admin: [`apps/web/src/routes/admin.tsx`](file:///d:/Coding/beasiswaapp/apps/web/src/routes/admin.tsx#L82-L100)
- Modal Beasiswa: [`apps/web/src/components/modals/internal/BeasiswaModal.tsx`](file:///d:/Coding/beasiswaapp/apps/web/src/components/modals/internal/BeasiswaModal.tsx)
- Modal Syarat: [`apps/web/src/components/modals/internal/PersyaratanModal.tsx`](file:///d:/Coding/beasiswaapp/apps/web/src/components/modals/internal/PersyaratanModal.tsx)
- Gateway Master: [`apps/api-gateway/src/index.ts`](file:///d:/Coding/beasiswaapp/apps/api-gateway/src/index.ts#L153-L183)
- Service Master: [`apps/service-master/src/index.ts`](file:///d:/Coding/beasiswaapp/apps/service-master/src/index.ts#L103-L168)

#### Potongan kode frontend
```tsx
// apps/web/src/components/modals/internal/BeasiswaModal.tsx
const handleCreateBeasiswa = async (values: BeasiswaFormValues) => {
  await createBeasiswaMutation.mutateAsync({
    namaPelatihan: values.namaPelatihan,
    deskripsi: values.deskripsi,
    kuota: Number(values.kuota),
    metode: values.metode,
    tglSelesaiDaftar: values.batasPendaftaran,
  });
  toast.success("Program beasiswa baru berhasil dibuat.");
};
```

#### Potongan kode backend
```typescript
// apps/service-master/src/index.ts
fastify.post("/api/master/beasiswa", async (request, reply) => {
  const userRole = request.headers["x-user-role"] as string;
  if (userRole !== "admin" && userRole !== "superadmin") {
    return reply.status(403).send({ error: "Akses ditolak. Hak administrator diperlukan." });
  }

  const created = await masterRepository.create(request.body as any);
  return reply.status(201).send(created);
});
```

#### Request network
1. Pembuatan Program Baru:
   - `POST /api/master/beasiswa`
   - Payload: `{"namaPelatihan": "Cloud DevOps Engineering 2026", "kuota": 45, "metode": "Daring (Online)", ...}`
   - Respons: `201 Created`
2. Pembuatan Persyaratan Berkas Baru:
   - `POST /api/master/persyaratan`
   - Payload: `{"namaPersyaratan": "Sertifikat Vaksin / Sehat", "formatAllowed": "PDF", "maxSize": "2 MB"}`
   - Respons: `201 Created`

---

### 6.4 Manajemen pengguna internal dan konfigurasi izin peran

#### Narasi monolog
Sebagai administrator, saya dapat mengatur akun staf pada tab "Setting System". Saya dapat mendaftarkan akun baru untuk petugas verifikator atau pewawancara dengan mengisikan nama, alamat email dinas, dan peran pengguna. Selain itu, saya dapat mengatur matriks hak akses menu pada setiap peran. Service RBAC menyimpan data pengguna dan memperbarui izin akses sehingga navigasi portal merender menu sesuai peran yang ditetapkan.

#### Berkas yang dibuka
- Pengujian E2E: [`tests/e2e/06-admin-management.spec.ts`](file:///d:/Coding/beasiswaapp/tests/e2e/06-admin-management.spec.ts#L87-L123)
- Halaman Admin: [`apps/web/src/routes/admin.tsx`](file:///d:/Coding/beasiswaapp/apps/web/src/routes/admin.tsx#L50-L58)
- Modal Pengguna Internal: [`apps/web/src/components/modals/internal/UserInternalModal.tsx`](file:///d:/Coding/beasiswaapp/apps/web/src/components/modals/internal/UserInternalModal.tsx)
- Modal Izin Peran: [`apps/web/src/components/modals/internal/RolePermissionModal.tsx`](file:///d:/Coding/beasiswaapp/apps/web/src/components/modals/internal/RolePermissionModal.tsx)
- Service RBAC: [`apps/service-rbac/src/index.ts`](file:///d:/Coding/beasiswaapp/apps/service-rbac/src/index.ts#L202-L227)

#### Potongan kode frontend
```tsx
// apps/web/src/components/modals/internal/UserInternalModal.tsx
const handleCreateUser = async (data: { name: string; email: string; role: "verifikator" | "interviewer" }) => {
  await authApi.createInternalUser(data);
  toast.success(`Akun petugas ${data.name} berhasil ditambahkan.`);
};
```

#### Potongan kode backend
```typescript
// apps/service-rbac/src/index.ts
fastify.post("/api/rbac/users", async (request, reply) => {
  const userRole = request.headers["x-user-role"] as string;
  if (userRole !== "admin" && userRole !== "superadmin") {
    return reply.status(403).send({ error: "Akses administrator diperlukan." });
  }

  const { name, email, role, password } = request.body as any;
  const user = await rbacRepository.createUserWithAccount({
    name,
    email,
    passwordRaw: password || "Password123!",
    roleName: role,
  });

  return reply.status(201).send(user);
});
```

#### Request network
- Metode: `POST`
- URL: `http://localhost:3000/api/rbac/users`
- Header:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token_admin>`
- Payload:
```json
{
  "name": "Petugas Verifikasi Baru",
  "email": "verif_baru@beasiswa.go.id",
  "role": "verifikator"
}
```
- Respons: `201 Created`
```json
{
  "id": "user-int-892",
  "name": "Petugas Verifikasi Baru",
  "email": "verif_baru@beasiswa.go.id",
  "role": "verifikator"
}
```

---

## 07. Pengujian estafet siklus hidup penuh (complete lifecycle handshake)

Uji terkait: `tests/e2e/07-complete-lifecycle-handshake.spec.ts`

### 7.1 Eksekusi estafet terpadu multi-peran dari pendaftaran hingga ekspor data

#### Narasi monolog
Sebagai teknisi penguji atau pembawa presentasi teknis, saya dapat mendemonstrasikan keseluruhan siklus hidup beasiswa dalam satu pengujian otomatis terpadu tanpa intervensi manual. Skenario ini membuktikan kolaborasi lima persona dan empat microservice yang saling terhubung:
1. Calon peserta mendaftar akun baru, melengkapi wizard 4 tahap, mengunggah dokumen KTP, KK, Ijazah, dan Rekomendasi, lalu mengirimkan formulir.
2. Petugas verifikator masuk, menemukan satu berkas yang buram, menandai status revisi pada berkas tersebut dengan catatan spesifik, lalu menerbitkan keputusan revisi.
3. Calon peserta masuk kembali, melihat peringatan revisi, membuka wizard yang langsung menuju Tahap 3, mengunggah dokumen pengganti yang bersih, lalu mengirim ulang permohonan.
4. Petugas verifikator masuk kembali, memeriksa berkas hasil perbaikan, menyetujui seluruh dokumen, dan menetapkan status `LOLOS_ADMIN`.
5. Pewawancara masuk, menemukan kandidat dalam antrean wawancara, menginputkan nilai evaluasi berbobot (rata-rata 90.0), lalu menetapkan keputusan lulus.
6. Calon peserta masuk kembali, melihat pengumuman kelulusan, dan mengirimkan konfirmasi kehadiran daftar ulang.
7. Administrator masuk, memeriksa audit tabel kelulusan, dan memvalidasi bahwa rekapitulasi data siap diekspor ke format Excel.

#### Berkas yang dibuka
- Pengujian Estafet Penuh: [`tests/e2e/07-complete-lifecycle-handshake.spec.ts`](file:///d:/Coding/beasiswaapp/tests/e2e/07-complete-lifecycle-handshake.spec.ts#L19-L278)
- Fixture Autentikasi: [`tests/e2e/fixtures/auth.fixture.ts`](file:///d:/Coding/beasiswaapp/tests/e2e/fixtures/auth.fixture.ts)
- Base Pengujian: [`tests/e2e/fixtures/test-base.ts`](file:///d:/Coding/beasiswaapp/tests/e2e/fixtures/test-base.ts)
- Transaksi Service: [`apps/service-transaksi/src/index.ts`](file:///d:/Coding/beasiswaapp/apps/service-transaksi/src/index.ts)
- Gateway Proxy: [`apps/api-gateway/src/index.ts`](file:///d:/Coding/beasiswaapp/apps/api-gateway/src/index.ts)

#### Potongan kode frontend
```typescript
// tests/e2e/07-complete-lifecycle-handshake.spec.ts
// Menunjukkan perpindahan estafet peran secara terprogram dalam satu alur
await updateLowerThird(page, { role: "APPLICANT", step: "Tahap 1: Registrasi & Pengajuan Formulir" });
// ... pengisian formulir & submit ...

await logoutUser(page);
await loginAsVerifikator(page);
await updateLowerThird(page, { role: "VERIFIKATOR", step: "Tahap 2: Verifikasi Berkas & Permintaan Revisi" });
// ... verifikator menolak 1 dokumen buram ...

await logoutUser(page);
await loginAsApplicant(page, relayEmail, relayPassword);
await updateLowerThird(page, { role: "APPLICANT", step: "Tahap 3: Perbaikan & Unggah Ulang Dokumen" });
// ... applicant upload ulang ijazah ...

await logoutUser(page);
await loginAsVerifikator(page);
await updateLowerThird(page, { role: "VERIFIKATOR", step: "Tahap 4: Persetujuan Berkas (LOLOS_ADMIN)" });
// ... verifikator setujui seluruh berkas ...

await logoutUser(page);
await loginAsInterviewer(page);
await updateLowerThird(page, { role: "INTERVIEWER", step: "Tahap 5: Input Penilaian Skor Terbobot" });
// ... wawancara memberikan skor 90.0 ...

await logoutUser(page);
await loginAsApplicant(page, relayEmail, relayPassword);
await updateLowerThird(page, { role: "APPLICANT", step: "Tahap 6: Konfirmasi Daftar Ulang" });
// ... applicant konfirmasi hadir ...

await logoutUser(page);
await loginAsAdmin(page);
await updateLowerThird(page, { role: "ADMINISTRATOR", step: "Tahap 7: Audit Kelulusan & Export Excel" });
// ... admin audit hasil ...
```

#### Potongan kode backend
```typescript
// apps/service-transaksi/src/repository.ts
// Menjaga transisi status berjalan berurutan sesuai finite state machine
// DRAFT -> SUBMITTED -> REVISI -> SUBMITTED -> LOLOS_ADMIN -> LULUS_DITERIMA -> DAFTAR_ULANG
export function validateStateTransition(current: StatusPendaftaran, next: StatusPendaftaran): boolean {
  const allowedTransitions: Record<StatusPendaftaran, StatusPendaftaran[]> = {
    [StatusPendaftaran.DRAFT]: [StatusPendaftaran.SUBMITTED],
    [StatusPendaftaran.SUBMITTED]: [StatusPendaftaran.REVISI, StatusPendaftaran.LOLOS_ADMIN, StatusPendaftaran.TIDAK_LOLOS_ADMIN],
    [StatusPendaftaran.REVISI]: [StatusPendaftaran.SUBMITTED],
    [StatusPendaftaran.LOLOS_ADMIN]: [StatusPendaftaran.DALAM_PROSES_WAWANCARA, StatusPendaftaran.LULUS_DITERIMA, StatusPendaftaran.TIDAK_LULUS_WAWANCARA],
    [StatusPendaftaran.LULUS_DITERIMA]: [StatusPendaftaran.DAFTAR_ULANG],
    [StatusPendaftaran.DAFTAR_ULANG]: [],
    [StatusPendaftaran.TIDAK_LOLOS_ADMIN]: [],
    [StatusPendaftaran.TIDAK_LULUS_WAWANCARA]: [],
  };

  return allowedTransitions[current]?.includes(next) ?? false;
}
```

#### Rangkuman alur network per tahap
1. Calon Peserta:
   - `POST /api/auth/register` (HTTP 201)
   - `POST /api/transaksi/pendaftaran` (HTTP 201, status `DRAFT`)
   - `PUT /api/transaksi/pendaftaran/:id/step/1` dan `/step/2` (HTTP 200)
   - `POST /api/dokumen/upload` (HTTP 201)
   - `POST /api/transaksi/pendaftaran/:id/submit` (HTTP 200, status `SUBMITTED`)
2. Petugas Verifikator:
   - `GET /api/transaksi/verifikasi/queue` (HTTP 200)
   - `POST /api/transaksi/verifikasi/:id/decision` dengan opsi revisi (HTTP 200, status `REVISI`)
3. Calon Peserta:
   - `POST /api/dokumen/upload` untuk berkas pengganti (HTTP 201)
   - `POST /api/transaksi/pendaftaran/:id/submit` (HTTP 200, status `SUBMITTED`)
4. Petugas Verifikator:
   - `POST /api/transaksi/verifikasi/:id/decision` dengan opsi disetujui (HTTP 200, status `LOLOS_ADMIN`)
5. Pewawancara:
   - `GET /api/transaksi/wawancara/queue` (HTTP 200)
   - `POST /api/transaksi/wawancara/:id/scoring` dengan skor 90.00 (HTTP 200, status `LULUS_DITERIMA`)
6. Calon Peserta:
   - `POST /api/transaksi/pendaftaran/:id/daftar-ulang` (HTTP 200, konfirmasi tersimpan)
7. Administrator:
   - `GET /api/transaksi/admin/pendaftaran` (HTTP 200, tabel audit terisi)
   - `GET /api/transaksi/admin/export-excel` (HTTP 200, stream berkas CSV)
