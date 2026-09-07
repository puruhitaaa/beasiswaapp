import net from "node:net";

export interface ScanResult {
  isInfected: boolean;
  signature?: string;
  skippedMock?: boolean;
  error?: string;
}

const EICAR_TEST_STRING =
  "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

export class AntivirusScanner {
  private useMock: boolean;
  private host: string;
  private port: number;

  constructor() {
    this.useMock = process.env.CLAMAV_MOCK === "true" || !process.env.CLAMAV_HOST;
    this.host = process.env.CLAMAV_HOST || "127.0.0.1";
    this.port = Number(process.env.CLAMAV_PORT) || 3310;
  }

  /**
   * Scans a buffer for virus signatures
   */
  async scanBuffer(buffer: Buffer): Promise<ScanResult> {
    if (this.useMock) {
      // Mock scanner for fast local development (<1ms, 0MB RAM)
      const content = buffer.toString("utf-8");
      if (content.includes(EICAR_TEST_STRING)) {
        return {
          isInfected: true,
          signature: "Eicar-Signature.TestFile",
        };
      }
      return {
        isInfected: false,
        skippedMock: true,
      };
    }

    // Production ClamAV TCP zINSTREAM protocol
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let response = "";

      socket.setTimeout(10000); // 10s timeout

      socket.connect(this.port, this.host, () => {
        socket.write("zINSTREAM\0");

        // Send chunk size (4 bytes big-endian) followed by chunk
        const sizeBuffer = Buffer.alloc(4);
        sizeBuffer.writeUInt32BE(buffer.length, 0);
        socket.write(sizeBuffer);
        socket.write(buffer);

        // Terminate stream with 4 zero bytes
        const zeroBuffer = Buffer.alloc(4, 0);
        socket.write(zeroBuffer);
      });

      socket.on("data", (data) => {
        response += data.toString("utf-8");
      });

      socket.on("end", () => {
        socket.destroy();
        if (response.includes("FOUND")) {
          const match = response.match(/stream: (.+) FOUND/);
          resolve({
            isInfected: true,
            signature: match ? match[1] : "Unknown.Malware",
          });
        } else if (response.includes("OK")) {
          resolve({ isInfected: false });
        } else {
          resolve({ isInfected: false, error: response });
        }
      });

      socket.on("error", (err) => {
        socket.destroy();
        // In fail-closed policy, if clamav cannot be reached, mark error
        resolve({
          isInfected: false,
          error: `ClamAV connection error: ${err.message}`,
        });
      });

      socket.on("timeout", () => {
        socket.destroy();
        resolve({
          isInfected: false,
          error: "ClamAV connection timed out",
        });
      });
    });
  }
}

export const scanner = new AntivirusScanner();
