import net from "node:net";

export interface ScanResult {
  isInfected: boolean;
  signature?: string;
  skippedMock?: boolean;
  error?: string;
}

export interface StreamScanSession {
  writeChunk(chunk: Buffer): void;
  finish(): Promise<ScanResult>;
  abort(): void;
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

  public isMock(): boolean {
    return this.useMock;
  }

  /**
   * Creates a streaming session for direct zero-buffer chunk piping to ClamAV (TCP zINSTREAM)
   */
  createStreamScanner(): StreamScanSession {
    if (this.useMock) {
      let isInf = false;
      return {
        writeChunk(chunk: Buffer) {
          if (chunk.toString("utf-8").includes(EICAR_TEST_STRING)) {
            isInf = true;
          }
        },
        async finish(): Promise<ScanResult> {
          if (isInf) {
            return {
              isInfected: true,
              signature: "Eicar-Signature.TestFile",
            };
          }
          return {
            isInfected: false,
            skippedMock: true,
          };
        },
        abort() {},
      };
    }

    // Production ClamAV TCP zINSTREAM protocol
    const socket = new net.Socket();
    let response = "";
    let socketError: Error | null = null;
    let connected = false;
    const queuedChunks: Buffer[] = [];

    socket.setTimeout(15000);

    socket.connect(this.port, this.host, () => {
      connected = true;
      socket.write("zINSTREAM\0");
      for (const chunk of queuedChunks) {
        const sizeBuffer = Buffer.alloc(4);
        sizeBuffer.writeUInt32BE(chunk.length, 0);
        socket.write(sizeBuffer);
        socket.write(chunk);
      }
      queuedChunks.length = 0;
    });

    socket.on("data", (data) => {
      response += data.toString("utf-8");
    });

    socket.on("error", (err) => {
      socketError = err;
      socket.destroy();
    });

    socket.on("timeout", () => {
      socketError = new Error("ClamAV socket timeout");
      socket.destroy();
    });

    return {
      writeChunk(chunk: Buffer) {
        if (!connected) {
          queuedChunks.push(chunk);
        } else if (!socketError) {
          const sizeBuffer = Buffer.alloc(4);
          sizeBuffer.writeUInt32BE(chunk.length, 0);
          socket.write(sizeBuffer);
          socket.write(chunk);
        }
      },
      abort() {
        socket.destroy();
      },
      async finish(): Promise<ScanResult> {
        return new Promise((resolve) => {
          if (socketError) {
            return resolve({
              isInfected: false,
              error: socketError.message,
            });
          }

          const sendZeroAndListen = () => {
            const zeroBuffer = Buffer.alloc(4, 0);
            socket.write(zeroBuffer);

            socket.once("end", () => {
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
                resolve({
                  isInfected: false,
                  error: response || "Respon daemon ClamAV tidak dikenali",
                });
              }
            });

            socket.once("close", () => {
              if (socketError) {
                resolve({
                  isInfected: false,
                  error: socketError.message,
                });
              }
            });
          };

          if (connected) {
            sendZeroAndListen();
          } else {
            socket.once("connect", () => {
              sendZeroAndListen();
            });
            socket.once("error", (err) => {
              resolve({
                isInfected: false,
                error: `ClamAV connection error: ${err.message}`,
              });
            });
          }
        });
      },
    };
  }

  /**
   * Scans a buffer for virus signatures (backwards-compatibility)
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
