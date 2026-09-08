import { test as baseTest, expect, Page, TestInfo } from "@playwright/test";

export interface LowerThirdOptions {
  title?: string;
  role?: string;
  step?: string;
}

export const ROLE_CONFIG: Record<
  string,
  { label: string; bg: string; icon: string; accent: string }
> = {
  ADMINISTRATOR: {
    label: "ADMINISTRATOR",
    bg: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
    icon: "⚡",
    accent: "#8b5cf6",
  },
  VERIFIKATOR: {
    label: "VERIFIKATOR",
    bg: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
    icon: "🛡️",
    accent: "#f59e0b",
  },
  INTERVIEWER: {
    label: "INTERVIEWER",
    bg: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
    icon: "🎤",
    accent: "#38bdf8",
  },
  APPLICANT: {
    label: "APPLICANT",
    bg: "linear-gradient(135deg, #059669 0%, #047857 100%)",
    icon: "👤",
    accent: "#10b981",
  },
  "PUBLIC / GUEST": {
    label: "PUBLIC / GUEST",
    bg: "linear-gradient(135deg, #475569 0%, #334155 100%)",
    icon: "🌐",
    accent: "#94a3b8",
  },
};

/**
 * Returns the exact, deterministic user role for each test case.
 */
export function getExactRoleForTest(testInfo: { file: string; title: string }): string {
  const file = testInfo.file.replace(/\\/g, "/");

  if (file.includes("01-applicant-portal")) {
    if (testInfo.title.startsWith("1.1") || testInfo.title.startsWith("1.2")) {
      return "PUBLIC / GUEST";
    }
    return "APPLICANT";
  }

  if (file.includes("02-verifikator-review")) {
    return "VERIFIKATOR";
  }

  if (file.includes("03-revision-handling")) {
    return "APPLICANT";
  }

  if (file.includes("04-interviewer-scoring")) {
    return "INTERVIEWER";
  }

  if (file.includes("05-announcement-and-reregistration")) {
    return "APPLICANT";
  }

  if (file.includes("06-admin-management")) {
    return "ADMINISTRATOR";
  }

  if (file.includes("07-complete-lifecycle-handshake")) {
    // Handshake lifecycle test starts at Stage 1 as Applicant
    return "APPLICANT";
  }

  return "APPLICANT";
}

/**
 * Generates client-side injection script for Lower Third overlay.
 * Clean, high-contrast, without running/passed status indicators.
 */
function createInjectionScript(initialState: LowerThirdOptions) {
  return `(() => {
    window.__testLowerThirdState = window.__testLowerThirdState || ${JSON.stringify(initialState)};

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
        "background: rgba(15, 23, 42, 0.94) !important",
        "border: 1px solid rgba(255, 255, 255, 0.16) !important",
        "border-left: 5px solid " + roleCfg.accent + " !important",
        "border-radius: 12px !important",
        "box-shadow: 0 16px 36px rgba(0, 0, 0, 0.55) !important",
        "backdrop-filter: blur(14px) !important",
        "-webkit-backdrop-filter: blur(14px) !important",
        "padding: 12px 18px !important",
        "transition: all 0.25s ease-in-out !important",
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
          </div>
          <span style="
            color: #94a3b8;
            font-size: 10px;
            font-weight: 700;
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
            ? \`<div style="color: #cbd5e1; font-size: 11.5px; margin-top: 5px; font-weight: 500; display: flex; align-items: center; gap: 4px;">
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

    // Query authoritative state from Playwright Node process to prevent stale role reversions
    if (typeof window.__getAuthoritativeLowerThirdState === "function") {
      window.__getAuthoritativeLowerThirdState().then((authoritative) => {
        if (authoritative) {
          window.__testLowerThirdState = {
            ...(window.__testLowerThirdState || {}),
            ...authoritative,
          };
          renderLowerThird();
        }
      }).catch(() => null);
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", renderLowerThird);
    } else {
      renderLowerThird();
    }

    // Keep active across DOM updates
    setInterval(() => {
      if (!document.getElementById("playwright-lower-third-overlay") && document.body) {
        renderLowerThird();
      }
    }, 1000);
  })();`;
}

/**
 * Updates Lower Third overlay state on a Playwright page.
 * Keeps Node runner state in sync to survive any page navigations/reloads.
 */
export async function updateLowerThird(page: Page, options: LowerThirdOptions) {
  try {
    const currentState = (page as any).__lowerThirdCurrentState;
    if (currentState) {
      if (options.role) currentState.role = options.role;
      if (options.title) currentState.title = options.title;
      if (options.step !== undefined) currentState.step = options.step;
    }

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
    }, options).catch(() => null);
  } catch {
    // ignore if page navigation is in progress
  }
}

/**
 * Extended Playwright test instance with automated Lower Third injection & dynamic role tracking.
 */
export const test = baseTest.extend<{
  lowerThird: void;
}>({
  lowerThird: [
    async ({ page }, use, testInfo) => {
      const initialRole = getExactRoleForTest(testInfo);
      const state: LowerThirdOptions = {
        title: testInfo.title,
        role: initialRole,
        step: "",
      };

      (page as any).__lowerThirdCurrentState = state;

      // Expose authoritative state getter to browser so reloaded pages always get the live role
      await page.exposeFunction("__getAuthoritativeLowerThirdState", () => state).catch(() => null);

      // Register init script to ensure lower third persists across all page navigations
      await page.addInitScript(createInjectionScript(state));

      // Push latest state whenever a new document finishes loading
      page.on("domcontentloaded", async () => {
        try {
          if (!page.isClosed()) {
            await page.evaluate((s) => {
              if (typeof (window as any).__updateLowerThird === "function") {
                (window as any).__updateLowerThird(s);
              }
            }, state).catch(() => null);
          }
        } catch {}
      });

      // Attempt immediate injection
      await updateLowerThird(page, state);

      // Execute actual test steps
      await use();

      // Brief pause to allow the final screen to be cleanly recorded in the video
      await page.waitForTimeout(500).catch(() => null);
    },
    { auto: true },
  ],
});

export { expect };
