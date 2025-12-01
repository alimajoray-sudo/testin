export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'AUD' | 'CAD' | 'SGD' | 'NZD';

export interface ContractMetadata {
  contractId: string;
  vendor: string;
  title: string;
  startDate: string;
  endDate: string;
  totalValue: number;
  currency: CurrencyCode;
  riskRating: 'low' | 'medium' | 'high';
}

export interface ScheduleEntry {
  taskId: string;
  milestone: string;
  dueDate: string;
  owner: string;
  status: 'not-started' | 'in-progress' | 'blocked' | 'done';
}

export interface DocumentReminder {
  documentName: string;
  owner: string;
  dueDate: string;
  channel: 'email' | 'slack';
  notes?: string;
}

export interface BudgetSnapshot {
  contractId: string;
  period: string;
  committed: number;
  spent: number;
  forecast: number;
  currency: CurrencyCode;
}

export interface VariationOrder {
  requestId: string;
  contractId: string;
  description: string;
  estimatedImpact: number;
  currency: CurrencyCode;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
}

export interface ComplianceCheckpoint {
  clause: string;
  controlOwner: string;
  evidenceUrl?: string;
  severity: 'info' | 'minor' | 'major';
  status: 'pending' | 'collected' | 'failed';
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

function isNonEmpty(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function validateContractMetadata(input: Partial<ContractMetadata>): ValidationResult {
  const errors: string[] = [];
  if (!isNonEmpty(input.contractId)) errors.push('contractId is required');
  if (!isNonEmpty(input.vendor)) errors.push('vendor is required');
  if (!isNonEmpty(input.title)) errors.push('title is required');
  if (!isNonEmpty(input.startDate) || !isIsoDate(input.startDate!)) errors.push('startDate must be YYYY-MM-DD');
  if (!isNonEmpty(input.endDate) || !isIsoDate(input.endDate!)) errors.push('endDate must be YYYY-MM-DD');
  if (typeof input.totalValue !== 'number' || input.totalValue <= 0) errors.push('totalValue must be > 0');
  if (!input.currency) errors.push('currency is required');
  if (!input.riskRating) errors.push('riskRating is required');
  return { ok: errors.length === 0, errors };
}

export function validateSchedule(entries: Partial<ScheduleEntry>[]): ValidationResult {
  const errors: string[] = [];
  entries.forEach((entry, index) => {
    if (!isNonEmpty(entry.taskId)) errors.push(`taskId missing at index ${index}`);
    if (!isNonEmpty(entry.milestone)) errors.push(`milestone missing at index ${index}`);
    if (!isNonEmpty(entry.dueDate) || !isIsoDate(entry.dueDate!)) errors.push(`dueDate invalid at index ${index}`);
    if (!isNonEmpty(entry.owner)) errors.push(`owner missing at index ${index}`);
  });
  return { ok: errors.length === 0, errors };
}

export function validateBudget(snapshot: Partial<BudgetSnapshot>): ValidationResult {
  const errors: string[] = [];
  if (!isNonEmpty(snapshot.contractId)) errors.push('contractId is required');
  if (!isNonEmpty(snapshot.period)) errors.push('period is required');
  if (typeof snapshot.committed !== 'number') errors.push('committed must be a number');
  if (typeof snapshot.spent !== 'number') errors.push('spent must be a number');
  if (typeof snapshot.forecast !== 'number') errors.push('forecast must be a number');
  if (!snapshot.currency) errors.push('currency is required');
  if (typeof snapshot.spent === 'number' && typeof snapshot.committed === 'number' && snapshot.spent > snapshot.committed) {
    errors.push('spent cannot exceed committed without a variation order');
  }
  return { ok: errors.length === 0, errors };
}

export function validateVariation(order: Partial<VariationOrder>): ValidationResult {
  const errors: string[] = [];
  if (!isNonEmpty(order.requestId)) errors.push('requestId is required');
  if (!isNonEmpty(order.contractId)) errors.push('contractId is required');
  if (!isNonEmpty(order.description)) errors.push('description is required');
  if (typeof order.estimatedImpact !== 'number') errors.push('estimatedImpact must be numeric');
  if (!order.currency) errors.push('currency is required');
  if (!order.status) errors.push('status is required');
  return { ok: errors.length === 0, errors };
}

export function validateCompliance(checkpoints: Partial<ComplianceCheckpoint>[]): ValidationResult {
  const errors: string[] = [];
  checkpoints.forEach((checkpoint, index) => {
    if (!isNonEmpty(checkpoint.clause)) errors.push(`clause missing at index ${index}`);
    if (!isNonEmpty(checkpoint.controlOwner)) errors.push(`controlOwner missing at index ${index}`);
    if (!checkpoint.severity) errors.push(`severity missing at index ${index}`);
    if (!checkpoint.status) errors.push(`status missing at index ${index}`);
  });
  return { ok: errors.length === 0, errors };
}

export function summarizeBudget(snapshot: BudgetSnapshot): string {
  const variance = snapshot.spent - snapshot.committed;
  const forecastDelta = snapshot.forecast - snapshot.committed;
  return `Period ${snapshot.period}: committed ${snapshot.committed} ${snapshot.currency}, spent ${snapshot.spent}, variance ${variance}, forecast delta ${forecastDelta}`;
}

export function scheduleLag(entries: ScheduleEntry[], referenceDate: string): ScheduleEntry[] {
  return entries.filter((entry) => {
    if (!isIsoDate(referenceDate) || !isIsoDate(entry.dueDate)) return false;
    return entry.status !== 'done' && entry.dueDate < referenceDate;
  });
}

export function complianceSummary(checkpoints: ComplianceCheckpoint[]): Record<string, number> {
  return checkpoints.reduce((acc, checkpoint) => {
    const key = `${checkpoint.severity}:${checkpoint.status}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}
