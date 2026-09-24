// Clearly-labeled FICTIONAL samples for demo purposes. No real PII;
// the PII sample uses obviously fake values (999-99-9999, 555 numbers, example.com).

export type Sample = {
  id: string;
  title: string;
  label: string;
  text: string;
};

export const SAMPLES: Sample[] = [
  {
    id: "occ-bsa-exam",
    title: "OCC BSA/AML Exam Finding",
    label: "FICTIONAL SAMPLE",
    text: `FICTIONAL EXAMINATION MEMORANDUM — FOR DEMO ONLY

To: Board of Directors, Meridian Trust Bank (fictional institution)
From: Office of the Comptroller of the Currency — Exam Team 12
Date: March 4, 2026
Subject: BSA/AML Examination Finding — SAR Filing Timeliness

During the 2026 BSA/AML examination, examiners identified a Matters Requiring Attention (MRA) related to Suspicious Activity Report (SAR) filing timeliness. Of 40 SARs sampled from Q3–Q4 2025, six (15%) were filed more than 60 calendar days after initial detection, exceeding the FinCEN 30/60-day filing standard.

Root cause: the case management queue in the transaction monitoring system was misconfigured after the August 2025 upgrade, suppressing aging alerts for cases assigned to the New York branch.

Required actions:
1. The BSA Officer must remediate the monitoring system configuration and validate the fix with an independent lookback of all Q3–Q4 2025 alerts by June 30, 2026.
2. Management must file a corrective action plan with the OCC within 45 days of this memorandum (by April 18, 2026).
3. The BSA Officer will provide monthly progress reports to the Board's Compliance Committee until the MRA is cleared.

Failure to remediate may result in a formal enforcement action.`,
  },
  {
    id: "fincen-sar-scenario",
    title: "FinCEN SAR Narrative Scenario",
    label: "FICTIONAL SAMPLE",
    text: `FICTIONAL SAR NARRATIVE — FOR DEMO ONLY

Filing Institution: Harbor Community Bank (fictional)
Activity Period: January 2026
Suspicious Activity: Suspected structuring / funnel account activity

Between January 5 and January 28, 2026, customer business account ending 4419 received 22 cash deposits totaling $198,400, each just under $10,000. Funds were wired within 24 hours to three overseas beneficiaries in amounts of $45,000–$60,000.

Branch staff noted the customer could not explain the business purpose of the wires. A review of account history shows no prior international wire activity.

Recommended internal actions:
1. The BSA Officer should file a SAR with FinCEN no later than 30 days from initial detection (February 20, 2026), with a possible 30-day extension if no suspect is identified.
2. The account should be placed under enhanced monitoring for 90 days.
3. The case must be presented to the SAR Committee at its February meeting for a continue/exit decision on the relationship.`,
  },
  {
    id: "fed-capital-planning",
    title: "Federal Reserve Capital Planning Update",
    label: "FICTIONAL SAMPLE",
    text: `FICTIONAL POLICY SUMMARY — FOR DEMO ONLY

Federal Reserve SR Letter 26-3 (fictional): Updates to Capital Planning Expectations
Effective: Second quarter 2026 planning cycle

The Federal Reserve has updated its expectations for capital planning at firms subject to CCAR:

1. Firms must incorporate a commercial real estate stress scenario with a 35% price decline in the severely adverse scenario, replacing the prior 25% assumption.
2. The capital plan submission deadline moves from April 5 to March 15, 2026.
3. Boards must attest that the firm's capital planning process was reviewed by internal audit before submission — a new governance requirement.

The CFO and Treasurer own the resubmission of the 2026 capital plan under the revised scenarios. The Chief Risk Officer must update the model risk inventory by February 15, 2026, and the Board must record its attestation in the March board minutes.

This is a routine annual update with no enforcement implications, but missing the March 15 deadline would trigger a supervisory finding.`,
  },
  {
    id: "cfpb-complaint-trend",
    title: "CFPB Complaint Trend Notice",
    label: "FICTIONAL SAMPLE",
    text: `FICTIONAL INTERNAL NOTICE — FOR DEMO ONLY

From: Consumer Compliance Department
Date: February 10, 2026
Subject: Rising CFPB complaint volume — fee disclosures

Consumer complaint volume tagged "unexpected fees" rose 40% quarter-over-quarter in Q4 2025 (from 210 to 295 complaints), concentrated in the checking account portfolio. The CFPB's public complaint database shows peer institutions facing scrutiny on the same issue.

The pattern suggests our overdraft and maintenance-fee disclosures may not meet the CFPB's "clear and conspicuous" standard under UDAAP.

Recommended actions:
1. Compliance should complete a UDAAP risk review of all deposit fee disclosures by March 31, 2026.
2. Marketing must pause the current checking-account campaign until disclosures are revised.
3. The Complaint Management Officer will brief senior management on remediation options at the March risk committee meeting.

No regulatory deadline is attached, but proactive remediation materially reduces examination risk.`,
  },
  {
    id: "pii-demo",
    title: "PII Redaction Demo",
    label: "FICTIONAL SAMPLE — CONTAINS FAKE PII",
    text: `FICTIONAL CUSTOMER FILE — FOR DEMO ONLY. All personal data below is fabricated.

Borrower: John Q. Sample
SSN: 999-99-9999
Account: ACCT-00012345
Phone: (555) 010-2030
Email: john.q.sample@example.com

File note: The borrower contacted the branch on February 2, 2026, disputing a $1,250 late fee assessed in January. The branch manager agreed to review the fee under the bank's error-resolution procedures.

Compliance note: retain this dispute record for 24 months per the record-retention schedule. The Compliance Officer should confirm the retention entry by March 1, 2026.

This sample exists to demonstrate automatic PII redaction before any AI processing.`,
  },
];
