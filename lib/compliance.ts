export type ComplianceCategory =
  | "RISK"
  | "MISSING_DOCUMENT"
  | "COMPLIANCE_REFERENCE"
  | "RECOMMENDATION"
  | "COMPLIANT";

export type ComplianceRiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "ADVISORY" | "COMPLIANT";

const RISK_PENALTY: Record<ComplianceRiskLevel, number> = {
  CRITICAL: 15,
  HIGH: 8,
  MEDIUM: 4,
  ADVISORY: 1,
  COMPLIANT: 0,
};

// Starts at 100 and subtracts a fixed penalty per finding by risk level —
// simple and legible over a weighted/ML score, since the audience for this
// number is a compliance officer who needs to see the mechanism.
export function computeComplianceScore(
  findings: { riskLevel: string }[]
): number {
  const penalty = findings.reduce((sum, f) => {
    return sum + (RISK_PENALTY[f.riskLevel as ComplianceRiskLevel] ?? 0);
  }, 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}
