# StealMyScene — Engineering Execution Rules

These are standing instructions for building StealMyScene. They exist to keep the work complete, verifiable, recoverable, and easy to review across many sessions.

## 1. Authority and scope

1. [`StealMyScene_Complete_Plan.md`](./StealMyScene_Complete_Plan.md) is the canonical product and engineering scope.
2. [`PROJECT_PROGRESS.md`](./PROJECT_PROGRESS.md) is the live traceability and evidence ledger.
3. This document controls how work is executed.
4. No phase, requirement, security control, rights safeguard, fallback, exit signal, or explicit deferral may be silently skipped.
5. Never mark work complete just because code exists. Completion requires acceptance evidence, tests, documentation, a clean intentional commit, and a verified push.
6. Never pull a deferred feature into an earlier phase unless it is a true dependency and the decision is documented first.
7. If the plan must change, record what changed, why, its consequences, and its replacement acceptance criteria in the plan and progress ledger before treating the new direction as authoritative.

## 2. Required workflow for every work item

Follow this order for each progress ID or small coherent group:

1. Read the relevant plan section, progress row, nearby code, tests, configuration, and repository instructions.
2. Inspect the current Git status and preserve unrelated or user-owned changes.
3. State the intended behavior and concrete acceptance checks before implementation.
4. Implement the smallest complete vertical slice, including error, loading, empty, permission, timeout, retry, and cleanup behavior where applicable.
5. Add or update tests with the implementation. Every bug fix requires a regression test whenever technically feasible.
6. Run the narrowest relevant checks first, then the broader test/build/type/lint suite before declaring completion.
7. Review the actual diff for correctness, accidental scope, secrets, debug output, generated files, dead code, copied placeholders, and inconsistent naming.
8. Update progress status and evidence honestly. Record unresolved defects or risks; do not hide them behind a `Complete` label.
9. Create a focused commit only after its checks pass.
10. Push the commit and verify the remote branch contains it before moving the delivery log to `Complete`.

## 3. Commit and push discipline

- Prefer many small, meaningful, working commits over large mixed commits. Do not manufacture noisy commits that contain no coherent value.
- Each independently working function, component, migration, API contract, security control, test group, or documentation milestone should normally receive its own atomic commit when it can stand alone safely.
- Use imperative, specific commit messages, preferably Conventional Commit style: `feat(studio): add synchronized recording stop`, `test(render): cover client timeout fallback`, `docs(plan): add delivery traceability`.
- A commit must explain one logical change. Do not mix refactors, formatting, dependencies, product behavior, and unrelated fixes unless they are inseparable.
- Keep the branch buildable. Do not intentionally push known-broken intermediate commits to inflate commit count.
- Never commit secrets, credentials, personal data, local environment files, large accidental binaries, dependency caches, or build output.
- Do not rewrite published history, force-push, squash away useful checkpoints, amend someone else's commit, or bypass protections unless the user explicitly authorizes it.
- Never claim a push succeeded without checking the push result and remote/upstream state.
- If a push is blocked by access, network, required checks, or branch protection, keep the verified local commit, record the exact blocker, and report it honestly.
- Do not publish releases, deploy production, merge branches, or open/merge pull requests unless that action is in the user's requested scope.

## 4. Testing and quality gates

Apply every gate relevant to the change:

- Formatting and lint checks.
- Static typing and schema validation.
- Unit tests for deterministic logic and state transitions.
- Integration tests for boundaries such as storage, media processing, auth, analytics, and APIs.
- End-to-end browser tests for the guest core loop and admin publication loop.
- Production build verification.
- Negative-path tests for permissions, invalid files, network failure, timeout, retry, cancellation, partial processing, and resource cleanup.
- Media checks for container/codec, duration, A/V sync, clipping, transcript timing, and actual playback.
- Accessibility checks for keyboard use, focus, labels, contrast, reduced motion, captions/transcripts, and screen sizes.
- Security checks for authorization, validation, rate limits, headers, upload scope, secret exposure, and unsafe content paths.
- Performance checks for initial media playback, main-thread responsiveness, memory use, caching, origin traffic, and render time.
- Representative browser/device checks, especially mobile Safari and Chrome and memory-constrained fallback behavior.

A skipped applicable check must be recorded with a reason and follow-up owner. “It should work” is not evidence.

## 5. Preventing repeated mistakes

1. Search existing code, tests, progress records, and prior defect notes before starting a similar change.
2. When a defect appears, record the symptom, root cause, affected progress IDs, fix, regression coverage, and prevention rule in the progress ledger.
3. Fix the cause, not only the visible symptom. Check every sibling call site or component that could contain the same pattern.
4. Add a reusable guard—test, validator, type, lint rule, helper, assertion, documentation, or monitoring—when it can prevent recurrence.
5. Re-run the original failure scenario after the fix and include it in verification evidence.
6. Do not repeatedly retry the same failing command without learning from its output. Inspect the failure and change the next action.
7. Never conceal warnings, disable tests, loosen types, swallow errors, or add broad exceptions merely to make checks green.
8. Do not duplicate logic when an existing tested abstraction should own it; do not create an abstraction before a real repeated need exists.

## 6. Product-specific non-negotiables

- The guest core loop stays fast, obvious, and available without signup. Optional identity must never replace it.
- User recordings stay local in Phase 1. Any later upload must be explicit, narrowly scoped, moderated where hosted, and lifecycle-controlled.
- Recording must stop with the clip, release microphone/media resources, support unlimited retakes, and never leave tracks active after exit or failure.
- Original dialogue stays muted during recording; transcript cues use reviewed word timing.
- Client rendering must have capability/error handling; the Phase 2 server fallback must remain a minority path, not an accidental default.
- Published media is immutable/versioned and CDN-cacheable. Trending and counters must not introduce synchronous per-view database writes.
- No content publishes without explicit allowed rights status. Rights are a release gate, not metadata to fill in later.
- Admin upload validation is enforced server-side after storage arrival; client validation alone is never trusted.
- Hosting or publicly serving user content requires proportionate moderation, reporting/expiry controls, and rate limiting.
- Infrastructure expansion must follow measured demand. Do not introduce accounts, a heavy backend, Kubernetes, multi-region systems, or GPU fleets before their planned evidence gate.

## 7. Data, security, and dependency rules

- Collect and retain the minimum data required for the current phase.
- Treat file names, MIME types, client metadata, transcripts, and uploaded bytes as untrusted input.
- Use short-lived least-privilege credentials and presigned URLs; never expose privileged storage or provider keys to the client.
- Pin dependencies appropriately, review their licenses and security impact, and avoid adding packages when platform APIs or existing code suffice.
- Schema and storage changes require forward migration, compatibility, rollback/recovery consideration, and validation of existing records.
- Logs and analytics must not capture raw recordings, secrets, or unnecessary identifying data.
- Destructive operations require exact target verification, a recovery plan where practical, and explicit user authorization when not already clearly in scope.

## 8. Documentation and progress truthfulness

- Update documentation in the same commit as behavior changes when the documents would otherwise become inaccurate.
- Every completed progress row must point to concrete evidence: tests/checks, commit hash, and any relevant report or decision record.
- Only one status may describe an item. Use `Blocked` or `In progress` honestly when required work remains.
- Preserve explicit deferrals in the ledger until their assigned phase; they cannot disappear during cleanup or replanning.
- End each working session with Git status reviewed and the delivery log updated for completed work, current blockers, and the next ordered item.

## 9. Definition of Done

A work item is done only when:

1. Its full acceptance criteria and applicable plan details are implemented without silent omissions.
2. Success and failure paths behave correctly and resources/data are cleaned up.
3. Applicable tests and production build checks pass.
4. Security, privacy, rights, accessibility, performance, and compatibility impacts have been reviewed.
5. No unresolved high-severity defect is knowingly introduced.
6. The diff has been reviewed and contains only intentional changes.
7. Documentation and progress evidence are current.
8. The change is contained in one or more meaningful commits, pushed, and verified remotely.

If any condition is missing, the item remains `In progress` or `Blocked`; it is not `Complete`.

## 10. Build order

1. Finish Phase 0 and verify its remote commit.
2. Build Phase 1 in dependency order: foundation/catalog → public discovery → recording state machine → preview/render/download → admin ingestion → security/quality/analytics → exit-signal evaluation.
3. Enter Phase 2 only after the core loop works and its baseline is measurable.
4. Enter Phases 3–5 only when their stated dependencies and earlier exit reviews are satisfied.
5. Within a phase, choose the next unblocked vertical slice from `PROJECT_PROGRESS.md`; never skip a difficult row merely because a later feature is more attractive.
