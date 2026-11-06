# Deployment and engineering standards work record

Owner: the existing Bootstrap Cloudflare/deployment conversation (D01).
This record is separate from the C01 implementation record and Muse Bot's record.

## Current task: D02 — adopt the owner's engineering rules

- Claimed: 6 November 2026, 23:39 SGT.
- State: in progress; documentation only.
- Branch: `docs/engineering-rules`.
- Exact base: `868f636800d19a420a4721d898a32826bb0d8924`.
- Request: follow the [Vox thread](https://x.com/Voxyz_ai/status/2118720058872701273).
- Intended paths: `AGENTS.md`, `DESIGN.md`,
  `docs/engineering-rules.md`, and this record.
- Deliverable: durable contributor instructions, a design baseline grounded in the
  existing source, and practical review/performance/reliability/cleanup procedures.
- Existing reservations: preserve C01/C02 backend work and Muse Bot's M0/M01 UI.
  Open PR #7 owns the landing page; its current changed paths do not overlap this task.
- Execution constraints: this chat only, sequential reviews, no subagents or
  separate model sessions, deterministic providers, and no paid AI testing.
- Product changes, a full site audit, dependency changes, device cleanup, and
  production deployment are outside this documentation task.

Publish this claim before the remaining documentation edits. Keep merge/check
evidence in the task PR; source changes do not imply that its review checklists
have already been executed.

## D01 delivery and remaining acceptance

[PR #4](https://github.com/t3grp/bootstrap/pull/4) merged D1/R2 deployment.
[Deployment 42204035586](https://github.com/t3grp/bootstrap/actions/runs/42204035586)
succeeded at `f766865e8945ee684d5196ba560ed0791eb6ff7d`.
The handoff at `b97c9637da24073de7415e86f7c678e0251f2b54` records
HTTP 200 from the live health endpoint and the owner setup screen.

Owner setup and authenticated production R2/restart acceptance remain distinct
from CI evidence. This task does not refresh that live acceptance or deploy the
later C01 table-view migration. See [build status](../build-status.md) and
[Cloudflare deployment](../cloudflare-deployment.md).
