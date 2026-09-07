# Agent Guidelines & Development Standards

I am **Baiq**. You are my agent, and we will be working together closely. I wanted to share my development philosophy, preferences, and guidelines so we are fully aligned.

The models we work with are excellent at **tone-matching**, so please read these guidelines carefully and align your behavior, communication, and code style to match the expectations below.

---

## 1. About Baiq & Core Design Philosophy

- **Simple Systems, Ambitious Ideas:** I love to build. My primary focus is on building complex things as simply as possible, finding elegant ways to reduce complexity when solving tough problems.
- **Fight Complexity:** Do not preserve complexity just because it already exists. Do not introduce bloated machinery simply because it looks "architecturally impressive." Understand the real constraints, and fight for the smallest change that makes the correct behavior unsurprising.
- **YAGNI ("You Aren't Gonna Need It"):** Match the "ceremony" to the actual task. Fight scope creep, and honor the developer's intent in both a minimal and realistic fashion.

## 2. General Coding Preferences

- **Simplicity & Type Safety:** Keep implementations straightforward and prioritize robust type safety.
- **Propose Bold Solutions:** Never be afraid to suggest bold, high-impact ideas that can meaningfully benefit the codebase.
- **Safety First:** Be extremely careful with destructive actions. Never execute destructive terminal commands, delete files, or overwrite key configurations unless explicitly requested.
- **Focused Verification:** Targeted testing and rapid verification are far better than endless "smoke tests" or bloated regression tests. Focus on what actually needs validation.
- **Smart Commenting:** Comments should explain _how_ a function, class, or definition is meant to be used, not just translate the code line-by-line. Keep comments concise, place them directly above the definition, and keep them strictly up-to-date when editing logic.
- **Inferred Types Over Annotations:** Prefer TypeScript's inferred types over explicit annotations where appropriate. Treat `any` as the enemy. Avoid simple one-liners that function purely as casting wrappers.
- **shadcn/ui Component Usage & Customization:**
  - **Check Project Setup First:** Always verify whether the current workspace already utilizes shadcn/ui (check for `components.json`, shadcn dependencies in `package.json`, or existing `@/components/ui/` directories).
  - **When shadcn is NOT in use:** Creating custom UI components—even for primitives where shadcn has equivalents—is completely justified and expected. Do not force or invent a shadcn setup unless explicitly requested.
  - **When shadcn IS in use:**
    - Utilize shadcn/ui components for UI primitives and new components/pages rather than building ad-hoc custom replacements from scratch.
    - When new shadcn components are needed, **always use the official shadcn CLI** (e.g., `pnpm dlx shadcn@latest add <component>` or `npx shadcn@latest add <component>`)—**never manually generate raw mock shadcn component files**.
    - Styling tweaks and customizations should primarily be applied via the `className` prop at the invocation/call-site—avoid modifying underlying generated primitive component files unless global design system changes are required.
  - **Available shadcn/ui Components Catalog:**
    - *Layout & Structure:* Aspect Ratio, Card, Collapsible, Resizable (Resizable Panels), Scroll Area, Separator, Sidebar
    - *Forms & Inputs:* Button, Checkbox, Combobox, Date Picker, Form (React Hook Form + Zod), Input, Input OTP, Label, Radio Group, Select, Slider, Switch, Textarea, Toggle, Toggle Group
    - *Navigation:* Breadcrumb, Menubar, Navigation Menu, Pagination, Tabs
    - *Overlays & Feedback:* Alert, Alert Dialog, Dialog, Drawer, Dropdown Menu, Hover Card, Popover, Sheet, Sonner (Toaster), Tooltip
    - *Data Display:* Avatar, Badge, Calendar, Carousel, Chart, Command, Context Menu, Data Table (TanStack Table), Progress, Skeleton, Table

## 3. Interaction & Agent Controls

- **Questions are "Read-Only":** If I am only asking an informational question about the codebase, DO NOT start editing or modifying files. Keep your inspection read-only.
- **No Multi-Agent Bloat:** Do not spawn sub-agents or multi-agent panels for a task that a single agent can finish in one pass. Delegation is for breath or adversarial review, not ordinary tasks.
- **Coordinate Parallel Work:** If multiple agents are running in parallel, state your file ownership upfront to prevent edit collisions.
- **Blast Radius Guardrails:** Always verify your actions won't break running environments or production-level systems. Be cautious when stopping dev servers or killing processes so you don't accidentally terminate the runtime/agent harness itself.
- **Visual Design Style:** When doing visual or frontend work, do not edit core layout components first. If introducing styling, prefer high-contrast dark modes with clean text layouts to avoid muddy grays.
- **Security Context:** Security is highly important, but do not overindex on heavy security configurations for local dev mode or internal development networks when it unnecessarily slows down execution.

## 4. Glossary for Our Work

To prevent terminology confusion and ensure we communicate clearly, let's use this shared glossary:

- **You:** The agent reading this file and modifying the codebase.
- **We / Us / Maintainers:** Baiq and the core repository maintainers.
- **User:** The person running and directing the coding agent.
- **Provider:** The agent runtime/harness (e.g., Claude, Cursor, Codex).
- **Environment:** The running server, machine filesystem, credentials, and state.
- **Project:** An environment's local workspace record rooted at a directory.

## 5. Principles of Contribution & Code Quality

- **Maintain Compatibility:** Support open development patterns. Ensure that core changes do not break custom user setups, forks, or remote integrations.
- **Performance Audits:** Regularly inspect your changes for performance regressions. Avoid sending excessive payloads over network wires, using heavy styles/animations that spike GPU usage, or introducing hard-to-render lists.
- **Hit Every Surface:** When implementing user-facing features, frontend work is not done until it is supported everywhere it belongs (e.g., matching settings, palettes, keybindings, and multiple surfaces/clients).
- **Reverse States:** Always write symmetrical logic. If you implement a "settle" or "snooze" feature, ensure you also implement the corresponding "unsettle" or "unsnooze" state.
- **Split Documentation:** Keep public user-facing documentation and internal maintainer documentation strictly separate. Do not leak technical implementation minutiae to the end-users.

---

## 6. Code Standards

### Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- First check if shadcn/ui is configured in the project; if not, building custom components is justified
- When shadcn/ui is present, use official shadcn components for UI primitives and install additions via CLI (`pnpm dlx shadcn@latest add <component>` or `npx shadcn@latest add <component>`)
- Modify shadcn components via `className` at the call site rather than editing raw source primitives
- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**

- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**

- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**

- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

### Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting
