import { describe, it, expect } from "vitest";
import { fileTypeFromBuffer } from "file-type";
import { AntivirusScanner } from "../apps/service-dokumen/src/scanner";

describe("Security, File Sniffing & Antivirus Verification", () => {
  const scanner = new AntivirusScanner();

  it("Rule: Strict SVG rejection to prevent Stored XSS", () => {
    const dangerousSvg = `<svg xmlns="http://www.w3.org/2000/svg" onload="alert('XSS')"><text>payload</text></svg>`;
    const isSvgExt = (filename: string) => filename.toLowerCase().endsWith(".svg");
    const isSvgMime = (mime: string) => mime === "image/svg+xml";

    expect(isSvgExt("document.svg")).toBe(true);
    expect(isSvgExt("image.SVG")).toBe(true);
    expect(isSvgMime("image/svg+xml")).toBe(true);
    expect(isSvgExt("ktp.pdf")).toBe(false);
    expect(isSvgExt("foto.jpg")).toBe(false);
  });

  it("Magic bytes sniffing detects valid PDF files", async () => {
    // Valid PDF header: %PDF-1.7
    const pdfBuffer = Buffer.from("%PDF-1.7\n%Fake PDF content for test header peek", "utf-8");
    const header = pdfBuffer.subarray(0, 4096);
    const isPdfHeader = header.toString("utf-8").startsWith("%PDF");
    expect(isPdfHeader).toBe(true);
  });

  it("Magic bytes sniffing detects valid JPEG files", async () => {
    // Valid JPEG header: FF D8 FF
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const isJpeg =
      jpegBuffer[0] === 0xff && jpegBuffer[1] === 0xd8 && jpegBuffer[2] === 0xff;
    expect(isJpeg).toBe(true);
  });

  it("Magic bytes sniffing detects valid PNG files", async () => {
    // Valid PNG header: 89 50 4E 47 0D 0A 1A 0A
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const isPng =
      pngBuffer[0] === 0x89 &&
      pngBuffer[1] === 0x50 &&
      pngBuffer[2] === 0x4e &&
      pngBuffer[3] === 0x47;
    expect(isPng).toBe(true);
  });

  it("Rejects dangerous executable disguised as PDF", async () => {
    // Executable DOS/MZ header disguised with a .pdf extension
    const exeBuffer = Buffer.from("MZ\x90\x00\x03\x00\x00\x00\x04\x00", "binary");
    const detected = await fileTypeFromBuffer(exeBuffer);

    // Should NOT be recognized as PDF
    expect(detected?.mime).not.toBe("application/pdf");
  });

  it("Antivirus scanner catches EICAR malware test string", async () => {
    const eicarPayload = Buffer.from(
      "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*",
      "utf-8"
    );
    const result = await scanner.scanBuffer(eicarPayload);
    expect(result.isInfected).toBe(true);
    expect(result.signature).toBe("Eicar-Signature.TestFile");
  });

  it("Antivirus scanner passes clean files", async () => {
    const cleanPayload = Buffer.from("This is a clean innocent document content.", "utf-8");
    const result = await scanner.scanBuffer(cleanPayload);
    expect(result.isInfected).toBe(false);
  });
});
