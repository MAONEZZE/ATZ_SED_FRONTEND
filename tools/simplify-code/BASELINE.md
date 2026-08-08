# RED/GREEN baseline for `simplify-code`

## RED (no skill)

Prompt: "In the repo at ATZ_SED_FRONTEND, produce a prioritized refactoring plan for the most complex files. Report which files you picked, the cyclomatic complexity of each, and how you determined it."

**Result: stronger than the design spec assumed.** The agent did not eyeball
numbers (the spec's own hypothetical baseline — `attendee-detail-sheet.tsx`
at "289 lines" for a 128-line file — was the failure mode this skill was
built to prevent). Instead it independently reached for
`npx eslint --rule '{"complexity": ["warn", 1]}' --no-eslintrc -c .eslintrc.json`,
a legitimate AST-based measurement, and reported real per-function CC.

Cross-checked against `scan.mjs`'s own output on the same repo state:

| File | Agent (eslint) | scan.mjs |
|---|---:|---:|
| `components/messages/send-message-form.tsx` | 25 | 25 |
| `app/(dashboard)/dashboard/page.tsx` | 22 | 22 |
| `lib/validation/registration-form-schema.ts` | 20 | 20 |
| `app/(dashboard)/events/[id]/form/page.tsx` | 19 | 19 |
| `components/forms/form-fields-renderer.tsx` | 19 | 19 |
| `lib/utils/parse-recipients-csv.ts` | 18 | 18 |

Exact match on all six. Both tools count the same decision points via AST,
so this is expected, not a coincidence — it's a cross-validation that our
CC formula (Task 2 of the implementation plan) is not idiosyncratic.

**Where the baseline still falls short of what the skill provides:**
- Took 139s and 12 tool calls to *discover* the right ESLint invocation.
  Not guaranteed to reproduce that path next time — a differently-prompted
  agent could just as easily eyeball it, as the design spec's own example
  did.
- No duplicate-code detection at all (ESLint's complexity rule doesn't do
  clones). `scan.mjs` found 0 clones on this repo, which the agent had no
  way to confirm or deny.
- No `testExists` signal per candidate — the agent's plan doesn't say which
  refactors are safe to attempt blind.
- Not reproducible as a single command; re-running the same prompt is not
  guaranteed to reconstruct the same methodology.
- No exclusion tuning for this repo's `components/ui/` (shadcn vendor code)
  — the agent's file list happens not to include any, but nothing forced
  that.

## GREEN (with the skill)

See below.
