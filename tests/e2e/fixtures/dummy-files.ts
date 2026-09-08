import fs from "node:fs";
import path from "node:path";

const FIXTURES_DIR = path.resolve(process.cwd(), "tests/e2e/fixtures/files");

export function ensureDummyFiles(): {
  ktpJpg: string;
  kkPdf: string;
  ijazahPdf: string;
  rekomPdf: string;
  invalidSvg: string;
} {
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  }

  // 1. Valid JPEG: Starts with SOI 0xFF, 0xD8, 0xFF
  const ktpJpg = path.join(FIXTURES_DIR, "dummy_ktp.jpg");
  const jpgHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);
  const jpgContent = Buffer.concat([jpgHeader, Buffer.alloc(1024, 0x55), Buffer.from([0xff, 0xd9])]);
  fs.writeFileSync(ktpJpg, jpgContent);

  // 2. Valid PDF: Starts with %PDF-
  const makePdf = (filePath: string, label: string) => {
    const pdfContent = `%PDF-1.4\n1 0 obj\n<< /Title (${label}) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n`;
    fs.writeFileSync(filePath, Buffer.from(pdfContent, "utf-8"));
  };

  const kkPdf = path.join(FIXTURES_DIR, "dummy_kk.pdf");
  makePdf(kkPdf, "Kartu Keluarga");

  const ijazahPdf = path.join(FIXTURES_DIR, "dummy_ijazah.pdf");
  makePdf(ijazahPdf, "Ijazah Terakhir");

  const rekomPdf = path.join(FIXTURES_DIR, "dummy_rekomendasi.pdf");
  makePdf(rekomPdf, "Surat Rekomendasi");

  // 3. Prohibited SVG file
  const invalidSvg = path.join(FIXTURES_DIR, "prohibited.svg");
  fs.writeFileSync(invalidSvg, `<svg xmlns="http://www.w3.org/2000/svg"><text>Test</text></svg>`, "utf-8");

  return {
    ktpJpg,
    kkPdf,
    ijazahPdf,
    rekomPdf,
    invalidSvg,
  };
}
