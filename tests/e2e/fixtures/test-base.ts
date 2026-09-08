import { test as baseTest, expect, Page, TestInfo } from "@playwright/test";

export interface LowerThirdOptions {
  title?: string;
  role?: string;
  status?: "RUNNING" | "PASSED" | "FAILED";
  step?: string;
}

export const ROLE_CONFIG: Record<
  string,
  { label: string; badgeBg: string; textColor: string; icon: string; accentColor: string }
> = {
  ADMINISTRATOR: {
    label: "ADMINISTRATOR",
    badgeBg: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
    textColor: "#ffffff",
    icon: "⚡",
    accentColor: "#8b5cf6",
  },
  VERIFIKATOR: {
    label: "VERIFIKATOR",
    badgeBg: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
    textColor: "#ffffff",
    icon: "🛡️",
    accentColor: "#f59e0b",
  },
  INTERVIEWER: {
    label: "INTERVIEWER",
    badgeBg: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
    textColor: "#ffffff",
    icon: "🎤",
    accentColor: "#38bdf8",
  },
  APPLICANT: {
    label: "APPLICANT",
    badgeBg: "linear-gradient(135deg, #059669 0%, #047857 100%)",
    textColor: "#ffffff",
    icon: "👤",
    accentColor: "#10b981",
  },
  "PUBLIC / GUEST": {
    label: "PUBLIC / GUEST",
    badgeBg: "linear-gradient(135deg, #475569 0%, #334155 100%)",
    textColor: "#ffffff",
    icon: "🌐",
    accentColor: "#94a3b8",
  },
};

/**
 * Infers appropriate initial role from test title or describe block.
 */
export function inferRoleFromTest(testInfo: TestInfo): string {
  const fullContext = `${testInfo.titlePath.join(" ")} ${testInfo.title}`.toLowerCase();

  if (fullContext.includes("verifikator")) {
    return "VERIFIKATOR";
  }
  if (fullContext.includes("interviewer") || fullContext.includes("wawancara")) {
    return "INTERVIEWER";
  }
  if (
    fullContext.includes("1.1 public") ||
    fullContext.includes("1.2 public") ||
    fullContext.includes("public landing")
  ) {
    return "PUBLIC / GUEST";
  }
  if (
    fullContext.includes("relay") ||
    fullContext.includes("handshake") ||
    fullContext.includes("lifecycle")
  ) {
    return "APPLICANT";
  }
  if (fullContext.includes("admin")) {
    return "ADMINISTRATOR";
  }
  if (
    fullContext.includes("applicant") ||
    fullContext.includes("peserta") ||
    fullContext.includes("wizard") ||
    fullContext.includes("revisi") ||
    fullContext.includes("announcement")
  ) {
    return "APPLICANT";
  }
  return "APPLICANT";
}

/**
 * Generates client-side injection script for Lower Third overlay.
 */
function createInjectionScript(initialState: LowerThirdOptions) {
  return `(() => {
    window.__testLowerThirdState = ${JSON.stringify(initialState)};

    function getRoleConfig(roleName) {
      const upper = (roleName || "APPLICANT").toUpperCase();
      if (upper.includes("ADMIN")) {
        return { label: "ADMINISTRATOR", bg: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)", icon: "⚡", accent: "#8b5cf6" };
      }
      if (upper.includes("VERIFIK")) {
        return { label: "VERIFIKATOR", bg: "linear-gradient(135deg, #d97706 0%, #b45309 100%)", icon: "🛡️", accent: "#f59e0b" };
      }
      if (upper.includes("INTERVIEW") || upper.includes("WAWANCARA")) {
        return { label: "INTERVIEWER", bg: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", icon: "🎤", accent: "#38bdf8" };
      }
      if (upper.includes("PUBLIC") || upper.includes("GUEST")) {
        return { label: "PUBLIC / GUEST", bg: "linear-gradient(135deg, #475569 0%, #334155 100%)", icon: "🌐", accent: "#94a3b8" };
      }
      return { label: "APPLICANT", bg: "linear-gradient(135deg, #059669 0%, #047857 100%)", icon: "👤", accent: "#10b981" };
    }

    function renderLowerThird() {
      if (typeof document === "undefined" || !document.body) return;
      let overlay = document.getElementById("playwright-lower-third-overlay");
      const state = window.__testLowerThirdState || {};
      const roleCfg = getRoleConfig(state.role);
      const status = state.status || "RUNNING";

      let statusBg = "rgba(59, 130, 246, 0.25)";
      let statusColor = "#60a5fa";
      let statusBorder = "1px solid rgba(59, 130, 246, 0.5)";
      let statusIcon = "⏳ RUNNING";
      let glow = "0 16px 40px rgba(0, 0, 0, 0.6)";

      if (status === "PASSED") {
        statusBg = "rgba(16, 185, 129, 0.3)";
        statusColor = "#34d399";
        statusBorder = "1px solid rgba(16, 185, 129, 0.8)";
        statusIcon = "✅ PASSED";
        glow = "0 0 25px rgba(16, 185, 129, 0.4), 0 16px 40px rgba(0, 0, 0, 0.7)";
      } else if (status === "FAILED") {
        statusBg = "rgba(239, 68, 68, 0.3)";
        statusColor = "#f87171";
        statusBorder = "1px solid rgba(239, 68, 68, 0.8)";
        statusIcon = "❌ FAILED";
        glow = "0 0 25px rgba(239, 68, 68, 0.4), 0 16px 40px rgba(0, 0, 0, 0.7)";
      }

      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "playwright-lower-third-overlay";
        document.body.appendChild(overlay);
      }

      overlay.style.cssText = [
        "position: fixed !important",
        "bottom: 24px !important",
        "left: 24px !important",
        "z-index: 2147483647 !important",
        "min-width: 360px !important",
        "max-width: 620px !important",
        "pointer-events: none !important",
        "user-select: none !important",
        "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important",
        "background: rgba(15, 23, 42, 0.93) !important",
        "border: 1px solid rgba(255, 255, 255, 0.15) !important",
        "border-left: 5px solid " + roleCfg.accent + " !important",
        "border-radius: 12px !important",
        "box-shadow: " + glow + " !important",
        "backdrop-filter: blur(14px) !important",
        "-webkit-backdrop-filter: blur(14px) !important",
        "padding: 12px 18px !important",
        "transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important",
        "opacity: 1 !important",
        "display: block !important"
      ].join(";");

      overlay.innerHTML = \`
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 6px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="
              display: inline-flex;
              align-items: center;
              gap: 5px;
              background: \${roleCfg.bg};
              color: #ffffff;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.05em;
              padding: 3px 9px;
              border-radius: 6px;
              text-transform: uppercase;
              box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            ">
              <span>\${roleCfg.icon}</span>
              <span>\${roleCfg.label}</span>
            </span>
            <span style="
              display: inline-flex;
              align-items: center;
              background: \${statusBg};
              color: \${statusColor};
              border: \${statusBorder};
              font-size: 11px;
              font-weight: 700;
              padding: 2px 8px;
              border-radius: 6px;
              letter-spacing: 0.04em;
            ">
              \${statusIcon}
            </span>
          </div>
          <span style="
            color: #94a3b8;
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          ">
            BEASISWA E2E
          </span>
        </div>
        <div style="
          color: #f8fafc;
          font-size: 13.5px;
          font-weight: 600;
          line-height: 1.35;
          margin: 0;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
          word-break: break-word;
        ">
          \${state.title || "E2E Test Execution"}
        </div>
        \${
          state.step
            ? \`<div style="color: #cbd5e1; font-size: 11px; margin-top: 4px; display: flex; align-items: center; gap: 4px;">
                <span style="color: #38bdf8;">▸</span> \${state.step}
              </div>\`
            : ""
        }
      \`;
    }

    window.__updateLowerThird = (opts) => {
      window.__testLowerThirdState = {
        ...(window.__testLowerThirdState || {}),
        ...opts,
      };
      renderLowerThird();
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", renderLowerThird);
    } else {
      renderLowerThird();
    }

    // Keep active across subtle DOM tree reshuffles
    setInterval(() => {
      if (!document.getElementById("playwright-lower-third-overlay") && document.body) {
        renderLowerThird();
      }
    }, 1000);
  })();`;
}

/**
 * Updates Lower Third overlay state on a Playwright page.
 */
export async function updateLowerThird(page: Page, options: LowerThirdOptions) {
  try {
    if (page.isClosed()) return;
    await page.evaluate((opts) => {
      if (typeof (window as any).__updateLowerThird === "function") {
        (window as any).__updateLowerThird(opts);
      } else {
        (window as any).__testLowerThirdState = {
          ...((window as any).__testLowerThirdState || {}),
          ...opts,
        };
      }
    }, options);
  } catch {
    // ignore if page navigation is in progress
  }
}

/**
 * Extended Playwright test instance with automated Lower Third injection & status recording.
 */
export const test = baseTest.extend<{
  lowerThird: void;
}>({
  lowerThird: [
    async ({ page }, use, testInfo) => {
      const initialRole = inferRoleFromTest(testInfo);
      const initialState: LowerThirdOptions = {
        title: testInfo.title,
        role: initialRole,
        status: "RUNNING",
      };

      // Register init script to ensure lower third persists across all page navigations
      await page.addInitScript(createInjectionScript(initialState));

      // Attempt immediate injection in case page is already loaded
      await updateLowerThird(page, initialState);

      // Execute actual test steps
      await use();

      // Post-test: record the outcome directly into the visual lower third
      const finalStatus: "PASSED" | "FAILED" = testInfo.status === "passed" ? "PASSED" : "FAILED";
      await updateLowerThird(page, { status: finalStatus });

      // Pause briefly so that Playwright's video recorder captures the final result badge
      await page.waitForTimeout(1000).catch(() => null);
    },
    { auto: true },
  ],
});

export { expect };
