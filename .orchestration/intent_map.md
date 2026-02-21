# Intent Map

This file records the evolution and relationships of active intents.
Agent A monitors this file to define plans, while Agent B executes code changes
based on `.orchestration/active_intents.yaml`.

---

## Current Intents

- **INT-001** → _JWT Authentication Migration_

    - Status: IN_PROGRESS
    - Scope: `src/hooks/selectActiveIntent.ts`, `src/hooks/preHook.ts`
    - Constraints: Must not use external auth providers; Must maintain backward compatibility with Basic Auth
    - Acceptance Criteria: All unit tests in `tests/auth/` pass

- **INT-002** → _Refactor Auth Middleware_

    - Status: PLANNED
    - Scope: `src/hooks/index.ts`, `src/hooks/host-api.ts`
    - Constraints: Preserve existing authentication flows
    - Acceptance Criteria: Integration tests pass without regression

- **INT-003** → _AI-Native Git Layer Implementation_

    - Status: PLANNED
    - Scope: `src/hooks/tools/applyPatch.ts`, `approvePatch.ts`, `stagePatch.ts`
    - Constraints: Must distinguish AST_REFACTOR vs INTENT_EVOLUTION; Must generate SHA-256 hashes for file mutations
    - Acceptance Criteria: `agent_trace.jsonl` correctly maps intent IDs to content hashes

- **INT-004** → _Context Injection Hook_

    - Status: PLANNED
    - Scope: `src/hooks/contextHook.ts`, `src/hooks/selectActiveIntent.ts`
    - Constraints: Must block execution if no valid intent ID is declared
    - Acceptance Criteria: Pre-hook successfully injects intent context before tool execution

- **INT-005** → _Security Validation Hook_

    - Status: PLANNED
    - Scope: `src/hooks/securityHook.ts`, `src/hooks/preHook.ts`
    - Constraints: Must enforce scope validation against owned_scope
    - Acceptance Criteria: Destructive commands require explicit approval

- **INT-006** → _Traceability Logging_

    - Status: PLANNED
    - Scope: `src/hooks/tools/recordIntentTrace.ts`, `diffStagedChange.ts`, `listStagedChanges.ts`
    - Constraints: Must include intent_id, mutation_class, file path, and hash
    - Acceptance Criteria: `.orchestration/agent_trace.jsonl` contains complete mutation records

- **INT-007** → _Governance Policy Enforcement_

    - Status: PLANNED
    - Scope: `src/core/governance/**`, `src/extension.ts`
    - Constraints: Must reject commands outside declared scope
    - Acceptance Criteria: Governance violations are blocked and logged

- **INT-008** → _Intent Evolution Tracking_
    - Status: PLANNED
    - Scope: `.orchestration/intent_map.md`, `src/services/llmWrapper.ts`
    - Constraints: Must distinguish AST_REFACTOR vs INTENT_EVOLUTION
    - Acceptance Criteria: Evolution history is correctly serialized

---

## Evolution Relationships

- INT-001 → evolves into INT-004 (Context Injection Hook)

    - Evolution Type: INTENT_EVOLUTION
    - Notes: Extends PreHook logic to enforce intent ID presence

- INT-003 → evolves into INT-006 (Traceability Logging)
    - Evolution Type: AST_REFACTOR
    - Notes: Git layer extended with SHA-256 mutation logging
