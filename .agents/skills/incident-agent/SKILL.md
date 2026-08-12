---
name: incident-agent
description: Automatically fetch, analyze, and propose code fixes for runtime incidents reported to system_incidents table, requiring user approval before execution.
---

# Incident Agent Workflow Instructions

This skill defines the autonomous Incident Agent workflow for Invest Vision.

## Core Responsibilities

1. **Fetch Unresolved Incidents**:
   - Query the `system_incidents` table for entries with status `OPEN` or `ANALYZING`.

2. **Analyze Failure Context & Stack Trace**:
   - Read the `error_message`, `stack_trace`, `component_stack`, and `route`.
   - Locate the exact file and line number in the codebase where the exception originated.

3. **Formulate Implementation Plan & Diff**:
   - Generate an Implementation Plan detailing:
     - Root cause of the error.
     - Proposed code fix with exact diff snippets.
     - Verification plan (build/test commands).
   - Update the incident in `system_incidents` with status `PROPOSED_FIX`, `proposed_fix_summary`, and `proposed_fix_diff`.

4. **Obtain User Approval**:
   - Present the proposed fix to the user in the workspace chat or on the `/admin/incidents` dashboard.
   - STOP and wait for explicit user approval before mutating any codebase files.

5. **Execute & Resolve**:
   - Once approved (status set to `APPROVED`), apply the code edits, run verification commands (`bun run build` / `npm run build`), commit changes, and update incident status to `RESOLVED`.
