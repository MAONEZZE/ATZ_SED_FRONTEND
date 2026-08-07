# Complexity Reduction Skill Design

**Date:** 2026-08-07  
**Project:** ATZ_SED_FRONTEND  
**Status:** Design (awaiting implementation)

---

## 1. Overview

A skill that analyzes the entire ATZ_SED_FRONTEND codebase for high cyclomatic complexity and large file sizes, then generates a structured refactoring plan. The plan prioritizes legibility, removes code duplication, and consolidates similar files — all without changing program flow.

**Goal:** Reduce maintenance burden by making code more readable and removing redundancy.

---

## 2. Problem Statement

Current codebase has several large, complex files:
- `components/messages/send-message-form.tsx` (632 lines, high CC)
- `components/attendees/attendee-detail-sheet.tsx` (289 lines)
- `components/forms/form-fields-renderer.tsx` (233 lines)
- `lib/email/build-email.ts` (204 lines)

These files are difficult to maintain due to:
1. **Nested conditionals** — hard to follow logic flow
2. **Duplicated patterns** — similar error handling, state management repeated across files
3. **Large components** — multiple concerns in one file (form logic + rendering + validation)
4. **Low readability** — cryptic variable names, unclear abstractions

Refactoring these files will:
- Reduce cognitive load for developers
- Make testing easier (smaller, focused units)
- Reduce duplicate code
- Enable safer changes (less blast radius per change)

---

## 3. Design: Agent-Driven Analysis

### 3.1 Architecture

Three phases:

#### **Phase 1: Scan**
- Identify all TypeScript/TSX files in scope
- Calculate cyclomatic complexity (CC) for each function/component
- Count lines of code (excluding comments)
- Flag candidates: **CC > 15 OR lines > 200**

Target directories:
- `components/**/*.tsx`
- `lib/**/*.ts`
- `hooks/**/*.ts`
- `app/**/*.tsx` (excluding generated files)

Exclude:
- `node_modules/`
- Generated files (`types.ts` with `@generated`)
- External UI library wraps (shadcn/ui)
- Test files

#### **Phase 2: Agent-Driven Analysis**
- Agent reads top candidates (sorted by CC + lines)
- For each file, agent analyzes:
  - **Legibility issues:** nested conditions, unclear abstractions, cryptic names
  - **Duplication:** identifies similar code patterns across files (>50 lines of similarity)
  - **Refactoring opportunities:** specific recommendations (extract function, consolidate conditions, merge files)
- Agent produces narrative analysis + structured recommendations

#### **Phase 3: Generate Plan**
- Output: JSON plan file with refactorings + duplications
- Each refactoring includes:
  - Target file and function
  - Current CC/lines metrics
  - Issues identified
  - Proposed approach (extract-function, consolidate, merge)
  - Effort estimate (low/medium/high)
  - Priority (1=highest)

### 3.2 Output Format

**Location:** `docs/superpowers/refactoring/YYYY-MM-DD-complexity-analysis.json`

**Structure:**
```json
{
  "timestamp": "2026-08-07T10:30:00Z",
  "projectRoot": "/path/to/ATZ_SED_FRONTEND",
  "thresholds": {
    "cc": 15,
    "lines": 200
  },
  "summary": {
    "totalFiles": 127,
    "candidates": 8,
    "duplications": 3
  },
  "refactorings": [
    {
      "id": "ref-001",
      "file": "components/messages/send-message-form.tsx",
      "metrics": {
        "cc": 18,
        "lines": 632,
        "functions": 6
      },
      "issues": [
        "Nested if-else chains in form submission handler",
        "Template selection logic duplicated in preview + send paths"
      ],
      "approach": {
        "type": "extract-function + consolidate-conditions",
        "steps": [
          "Extract handleFormSubmit into separate function",
          "Extract template-selection logic into helper",
          "Consolidate preview + send validation"
        ]
      },
      "effort": "medium",
      "effortHours": "4-6",
      "priority": 1,
      "testFile": "tests/unit_test/components/messages/send-message-form.spec.ts",
      "testExists": true,
      "testStrategy": [
        "Run tests before refactoring",
        "Verify form submission logic unchanged",
        "Verify template selection unchanged"
      ]
    }
  ],
  "duplications": [
    {
      "id": "dup-001",
      "pattern": "HTTP error handling in API calls",
      "affectedFiles": [
        "lib/api/events.ts",
        "lib/api/registrations.ts",
        "lib/api/global-messaging.ts"
      ],
      "similarityScore": 0.85,
      "suggestion": "Extract base HTTP method with error handling to lib/api/http-base.ts",
      "effort": "low",
      "priority": 2
    }
  ]
}
```

---

## 4. Execution Flow

### 4.1 User Triggers Skill
```
User: /simplify-code
  → Skill: [Scan + Analyze + Plan]
  → Output: JSON plan + terminal summary
```

### 4.2 Agent Executes Plan
```
User: /execute-refactor <plan-json>
  → Agent:
    [1] Reads plan, sorts by priority
    [2] For each refactoring:
        - Open file
        - Apply changes (extract, consolidate, merge)
        - Run tests (if exist)
        - Create incremental commit
    [3] Summary: files changed, tests status, commits created
```

### 4.3 Safety Constraints

- **No flow changes:** Refactoring preserves program behavior
- **Incremental commits:** Each refactoring = one commit (easy revert)
- **Test gate:** If tests fail, agent stops (doesn't continue blind)
- **Manual review:** User reviews each commit before push
- **Exports intact:** Public APIs/interfaces unchanged

---

## 5. Metrics & Thresholds

### 5.1 Cyclomatic Complexity

Counts decision points:
- `if`, `else if`, `switch case`, `for`, `while`, `&&`, `||`, `? :`, `catch`

**Threshold:** CC > 15  
**Rationale:** CC > 10 is generally considered unmaintainable; > 15 is flagged for review

### 5.2 Lines of Code

Non-comment, non-blank lines.

**Threshold:** > 200  
**Rationale:** Components with >200 lines often mix concerns; recommend split

### 5.3 Duplication

Identifies code blocks that are identical/similar (token-based matching).

**Threshold:** > 50 lines of similarity across files

---

## 6. Scope & Boundaries

### 6.1 In Scope

- **Components:** React components in `components/**/*.tsx`
- **Utilities:** Functions in `lib/**/*.ts` (API, email, validation, etc.)
- **Hooks:** Custom hooks in `hooks/**/*.ts`
- **Pages:** Server/client components in `app/**/*.tsx`
- **TypeScript strict mode:** Project uses `strict: true`

### 6.2 Out of Scope

- **UI library:** shadcn/ui wrapped components (external, no refactor)
- **Generated files:** Files with `@generated` comment or `types.ts` (auto-generated)
- **Tests:** `tests/**/*.spec.ts` (test files are out of scope)
- **Config files:** `next.config.ts`, `vitest.config.ts`, etc.
- **node_modules:** Third-party code

---

## 7. Testing Strategy

### 7.1 Before Execution

- Skill identifies if test file exists for each candidate
- Skill notes test coverage in plan (helps agent decide risk level)

### 7.2 During Execution

- Agent runs `npm run test -- <test-file>` before refactoring
- Agent applies refactoring
- Agent runs tests again after refactoring
- If tests fail: agent reverts changes and flags in report

### 7.3 Test Categories

- **Unit tests:** Vitest (for functions, hooks)
- **Component tests:** Playwright E2E (for UI components)
- **No tests:** Agent notes "⚠️ No test coverage" and requires manual review

---

## 8. Files & Artifacts

### 8.1 Skill Implementation

**Location:** `~/.claude/skills/simplify-code/`

**Files:**
- `SKILL.md` — description
- `agents/default.md` — agent prompt (analysis + plan generation)

### 8.2 Project Artifacts

**Plan output:** `docs/superpowers/refactoring/YYYY-MM-DD-complexity-analysis.json`

**Design doc:** `docs/superpowers/specs/2026-08-07-complexity-reduction-skill-design.md` (this file)

---

## 9. Success Criteria

Skill is successful if:

1. ✅ Identifies all files with CC > 15 OR lines > 200
2. ✅ Detects duplicated code patterns (>50 lines similarity)
3. ✅ Generates prioritized refactoring plan (JSON structure)
4. ✅ Plan includes:
   - Specific files + functions
   - Concrete refactoring approaches
   - Effort estimates
   - Test strategy
5. ✅ Agent can execute plan without user intervention (except review)
6. ✅ All refactorings maintain program flow (no behavior change)
7. ✅ Incremental commits per refactoring

---

## 10. Future Enhancements (Out of Scope)

- **Metrics dashboard:** Visual report of complexity trends over time
- **Pre-commit hook:** Flag high-CC commits before push
- **Auto-fix:** Skill auto-applies simple refactorings (extract-function templates)
- **Plugin integration:** ESLint plugin for real-time complexity warnings

---

## 11. Appendix: Example Refactoring

**Before:**
```typescript
// send-message-form.tsx (632 lines, CC=18)
export function SendMessageForm() {
  const [template, setTemplate] = useState(null);
  const [recipients, setRecipients] = useState([]);
  
  const handleSubmit = async () => {
    if (!template) return;
    if (!recipients.length) return;
    
    if (template.type === 'email') {
      // 50 lines of email logic
    } else if (template.type === 'sms') {
      // 40 lines of SMS logic
    } else if (template.type === 'webhook') {
      // 35 lines of webhook logic
    }
    // ...more logic
  };
  
  return <form onSubmit={handleSubmit}>{/*...*/}</form>;
}
```

**After (refactored):**
```typescript
// send-message-form.tsx (refactored, CC=8)
export function SendMessageForm() {
  const [template, setTemplate] = useState(null);
  const [recipients, setRecipients] = useState([]);
  
  const handleSubmit = async () => {
    const error = validateFormState({ template, recipients });
    if (error) return handleError(error);
    
    await sendMessage({ template, recipients });
  };
  
  return <form onSubmit={handleSubmit}>{/*...*/}</form>;
}

// New file: send-message-form.helpers.ts
export async function sendMessage({ template, recipients }) {
  const handler = getTemplateHandler(template.type);
  return handler({ template, recipients });
}

function getTemplateHandler(type) {
  const handlers = {
    email: handleEmailMessage,
    sms: handleSmsMessage,
    webhook: handleWebhookMessage,
  };
  return handlers[type];
}
```

**Changes:**
- ✅ CC reduced from 18 to 8
- ✅ Lines reduced (300 → 150 per file)
- ✅ Logic moved to helpers (testable independently)
- ✅ Behavior unchanged (same submit flow)

---

**Document version:** 1.0  
**Last updated:** 2026-08-07
