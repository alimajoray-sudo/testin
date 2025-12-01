# Contract Governance Workflows

This directory contains n8n assets for contract ingestion, schedule tracking, documentation reminders, budget monitoring, variation/claims routing, and compliance checks. Import `contract-governance.json` into n8n to provision the workflow graph. The accompanying TypeScript helper functions in `../src/contractGovernanceNodes.ts` can be dropped into Function nodes or custom nodes for stronger validation.

## Workflow: Contract Governance Suite
- **Entry**: `Manual Start` (replace with Webhook/Queue trigger in production).
- **Validate Contract**: Ensures mandatory metadata exists before continuing. Required fields: `contractId`, `vendor`, `title`, `startDate`, `endDate`, `totalValue`, `currency`, `riskRating`.
- **Normalize Schedule**: Converts `schedule` array into individual items with a derived `risk` flag when `status === 'blocked'`.
- **Generate Reminders**: Builds reminder payloads for documents (`documents` array) that include `name`, `owner`, and `dueDate`. Optional `channel` defaults to `email`.
- **Budget Monitor**: Compares `budget.spent` vs `budget.committed` and emits `variance` plus a status of `overrun` or `on-track`.
- **Process Variation**: Validates `variation` payloads and assigns an `approvalPath` (`executive` when `estimatedImpact > 50000`, otherwise `project`).
- **Compliance Check**: Normalizes `compliance` clauses, defaulting missing statuses to `pending`, and outputs a summary count by status.
- **Escalation Needed? / Email Escalation**: Sends alerts for non-approved variations or other business rules you extend.
- **Assemble Report**: Collates node outputs into a single object for downstream storage or dashboards.

## Input Schema
Payload expected at `items[0].json` when triggering:
```json
{
  "contractId": "C-2024-001",
  "vendor": "ACME Builders",
  "title": "Data Center Expansion",
  "startDate": "2024-06-01",
  "endDate": "2025-06-01",
  "totalValue": 1250000,
  "currency": "USD",
  "riskRating": "medium",
  "schedule": [{ "taskId": "T1", "milestone": "Design", "dueDate": "2024-07-01", "owner": "PM", "status": "in-progress" }],
  "documents": [{ "name": "Insurance Certificate", "owner": "Compliance", "dueDate": "2024-06-15", "channel": "email" }],
  "budget": { "committed": 500000, "spent": 240000, "forecast": 510000, "currency": "USD" },
  "variation": { "requestId": "VO-12", "description": "Scope addition", "estimatedImpact": 75000, "currency": "USD", "status": "submitted" },
  "compliance": [{ "clause": "Safety", "controlOwner": "HSE", "severity": "major" }]
}
```

## Outputs
- **`Normalize Schedule`**: Emits one item per milestone with `risk` flag.
- **`Generate Reminders`**: Emits reminder items suitable for Email/Slack nodes.
- **`Budget Monitor`**: Single object with `variance` and `status` for dashboards.
- **`Process Variation`**: Single object with `approvalPath` and status for routing.
- **`Compliance Check`**: Single object containing normalized checkpoints and a `summary` map.
- **`Assemble Report`**: Aggregated JSON combining all of the above for storage.

## Validation Helpers
Use the exported functions from `src/contractGovernanceNodes.ts` inside Function nodes for deeper validation. Example Function node body:
```ts
import { validateContractMetadata, validateBudget } from '../src/contractGovernanceNodes';

const metaResult = validateContractMetadata(items[0].json as any);
if (!metaResult.ok) throw new Error(metaResult.errors.join('; '));

const budgetResult = validateBudget((items[0].json as any).budget || {});
if (!budgetResult.ok) throw new Error(budgetResult.errors.join('; '));

return items;
```

## Configuration Notes
- Swap the `Manual Start` with queue/webhook triggers for production ingestion.
- Connect `Generate Reminders` to Email/Slack nodes to deliver reminders on `dueDate` or when `risk === 'high'`.
- Extend `Escalation Needed?` rules to include budget overruns (`status === 'overrun'`) or compliance failures.
- Set environment variables for secrets (email SMTP credentials, webhook tokens) in n8n credential records rather than hardcoding.
