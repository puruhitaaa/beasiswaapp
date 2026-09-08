import type {
  FullConfig,
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import fs from "node:fs";
import path from "node:path";
import { getExactRoleForTest } from "./test-base";

export interface TestSummaryItem {
  id: string;
  suite: string;
  title: string;
  role: string;
  status: "passed" | "failed" | "timedOut" | "skipped" | "interrupted";
  durationMs: number;
  durationFormatted: string;
  videoPath?: string;
  error?: string;
}

function getReporterRole(test: TestCase): string {
  const file = test.location.file.replace(/\\/g, "/");
  if (file.includes("07-complete-lifecycle-handshake")) {
    return "MULTI-ROLE (RELAY)";
  }
  return getExactRoleForTest({ file, title: test.title });
}

export default class ResultsReporter implements Reporter {
  private items: TestSummaryItem[] = [];
  private outputDir = path.resolve(process.cwd(), "test-results");

  onBegin(_config: FullConfig) {
    this.items = [];
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const titlePath = test.titlePath();
    const suiteName = titlePath.length > 1 ? titlePath[1] : "General";
    const role = getReporterRole(test);

    const videoAttachment = result.attachments.find(
      (a) => a.name === "video" || a.contentType?.includes("video")
    );

    let relVideoPath: string | undefined;
    if (videoAttachment?.path) {
      relVideoPath = path.relative(process.cwd(), videoAttachment.path).replace(/\\/g, "/");
    }

    const durationSeconds = (result.duration / 1000).toFixed(1);
    const item: TestSummaryItem = {
      id: test.id,
      suite: suiteName,
      title: test.title,
      role,
      status: result.status,
      durationMs: result.duration,
      durationFormatted: `${durationSeconds}s`,
      videoPath: relVideoPath,
      error: result.error?.message,
    };

    this.items.push(item);
  }

  async onEnd(result: FullResult) {
    const jsonPath = path.join(this.outputDir, "e2e-results.json");
    const mdPath = path.join(this.outputDir, "e2e-results.md");

    const total = this.items.length;
    const passed = this.items.filter((i) => i.status === "passed").length;
    const failed = this.items.filter((i) => i.status === "failed" || i.status === "timedOut").length;
    const skipped = this.items.filter((i) => i.status === "skipped").length;

    const payload = {
      summary: {
        total,
        passed,
        failed,
        skipped,
        status: result.status,
        timestamp: new Date().toISOString(),
      },
      tests: this.items,
    };

    fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf-8");

    // Generate Markdown report
    const mdLines: string[] = [
      "# 🎬 Playwright End-to-End Test Execution Results",
      "",
      `**Execution Status:** ${result.status.toUpperCase()} | **Total:** ${total} | **Passed:** ${passed} ✅ | **Failed:** ${failed} ❌ | **Skipped:** ${skipped}`,
      `**Timestamp:** ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`,
      "",
      "---",
      "",
      "### Test Cases Breakdown with Lower Third & Video Artifacts",
      "",
      "| # | Test Title | User Role | Status | Duration | Video Recording |",
      "|---|---|---|:---:|:---:|---|",
    ];

    this.items.forEach((item, index) => {
      const statusIcon =
        item.status === "passed"
          ? "✅ PASSED"
          : item.status === "failed" || item.status === "timedOut"
          ? "❌ FAILED"
          : "⚠️ SKIPPED";

      const videoLink = item.videoPath ? `[\`video.webm\`](${item.videoPath})` : "—";

      mdLines.push(
        `| ${index + 1} | **${item.title}** | \`${item.role}\` | ${statusIcon} | ${item.durationFormatted} | ${videoLink} |`
      );
    });

    mdLines.push("");
    mdLines.push("---");
    mdLines.push("*Recorded with lower-third visual overlay & dynamic user role tracking.*");

    fs.writeFileSync(mdPath, mdLines.join("\n"), "utf-8");
  }
}
