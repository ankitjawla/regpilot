// Clearly-labeled FICTIONAL samples for demo purposes. No real PII;
// the PII sample uses obviously fake values (999-99-9999, 555 numbers, example.com).

export type Sample = {
  id: string;
  title: string;
  label: string;
  /** Regulatory framework tag for intake filters. */
  framework: string;
  text: string;
};

export const SAMPLE_FRAMEWORKS = [
  "All",
  "BSA/AML",
  "CCAR",
  "Dodd-Frank",
  "COREP",
  "FINREP",
  "Call Report",
  "Consumer",
  "Demo",
] as const;

export const SAMPLES: Sample[] = [
  {
    id: "occ-bsa-exam",
    title: "OCC BSA/AML Exam Finding",
    label: "FICTIONAL SAMPLE",
    framework: "BSA/AML",
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
    framework: "BSA/AML",
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
    id: "ccar-stress-capital",
    title: "CCAR Severely Adverse Capital Plan",
    label: "FICTIONAL SAMPLE",
    framework: "CCAR",
    text: `FICTIONAL CCAR SUPERVISORY NOTICE — FOR DEMO ONLY

To: Chief Financial Officer and Chief Risk Officer, Meridian Trust Bank (LHCB, fictional)
From: Federal Reserve Board — Large Institution Supervision Coordinating Committee
Date: January 22, 2026
Subject: 2026 Comprehensive Capital Analysis and Review (CCAR) — Severely Adverse Scenario Updates

Meridian Trust Bank is a CCAR participant for the 2026 capital planning cycle. The Board's severely adverse scenario now requires:

1. Peak unemployment of 10.2% and a 40% decline in commercial real estate prices (previously 35%).
2. Explicit modeling of non-interest expense shocks tied to operational-risk loss events totaling 120 bps of risk-weighted assets over nine quarters.
3. Board attestation that the capital plan, including planned distributions, was reviewed by internal audit before submission.

Submission deadline: March 15, 2026 (moved forward from April 5).

Required actions:
1. The CFO owns resubmission of the 2026 CCAR capital plan under the revised severely adverse assumptions by March 15, 2026.
2. The Treasurer must refresh the dividend and repurchase capacity analysis and circulate to ALCO by February 28, 2026.
3. The Chief Risk Officer must update the model-risk inventory for PPNR and credit-loss models by February 15, 2026, and confirm CRE stress overlays with Model Risk Management.
4. The Board Risk Committee must record capital-plan attestation in the March 2026 minutes prior to FRB submission.

Missing the March 15 deadline or material weaknesses in stress capital adequacy may result in a distribution limitation under the capital plan rule.`,
  },
  {
    id: "dodd-frank-living-will",
    title: "Dodd-Frank 165(d) Resolution Plan Findings",
    label: "FICTIONAL SAMPLE",
    framework: "Dodd-Frank",
    text: `FICTIONAL JOINT AGENCY FEEDBACK — FOR DEMO ONLY

Agencies: Federal Reserve Board and Federal Deposit Insurance Corporation
Institution: Meridian Trust Bank Holding Company (fictional covered company)
Date: February 5, 2026
Subject: Dodd-Frank Act §165(d) Resolution Plan — Completeness Feedback (2025 cycle)

Examiners identified deficiencies in the firm's Title I resolution plan (living will) relating to:

1. Shared-services mapping for the core deposit platform was incomplete — three critical vendor contracts lacked resolution-surviving clauses.
2. Payment, clearing, and settlement (PCS) continuity assumptions did not demonstrate access to Fedwire Funds Service under a bridge-bank strategy within T+1.
3. Governance playbooks for the Crisis Management Group omitted escalation triggers tied to liquidity coverage ratio breach below 100%.

Required remediation under Dodd-Frank Act section 165(d) and implementing regulations:
1. Legal and Corporate Secretary must amend critical vendor contracts with resolution-resilient terms by May 31, 2026, and file an updated shared-services inventory with the agencies.
2. Treasury and Operations must run a tabletop proving PCS continuity (Fedwire / CHIPS / ACH) under the preferred strategy and deliver results to the FRB/FDIC by June 30, 2026.
3. The Chief Risk Officer must revise CMG escalation triggers, including LCR and NSFR breach paths, and obtain Board Risk Committee approval by April 30, 2026.
4. Firm must submit a remediation progress letter 45 days after this notice (by March 22, 2026).

Failure to remediate may lead to more frequent plan submissions or restrictions on activities under the Dodd-Frank resolution-plan rule.`,
  },
  {
    id: "corep-own-funds",
    title: "COREP Own Funds / Capital Adequacy Finding",
    label: "FICTIONAL SAMPLE",
    framework: "COREP",
    text: `FICTIONAL EBA/SSM SUPERVISORY NOTE — FOR DEMO ONLY

Institution: Meridian EU Credit Institution S.A. (fictional)
Supervisor: European Central Bank — Joint Supervisory Team
Framework: COREP (Common Reporting) — Own Funds (C 01.00) and Capital Adequacy
Reference date: 31 December 2025 submission
Date: February 12, 2026

Findings on the Q4 2025 COREP own-funds templates:
1. CET1 capital in C 01.00 overstated by €18.4m due to incorrect recognition of interim profits without verified year-end deductions for foreseeable dividends (CRR Article 26(2)).
2. Risk-weighted assets for IRB corporate exposures in C 08.01 omitted a 1.06 scaling factor on certain specialized-lending slots, understating RWA by €92m.
3. Leverage-ratio exposure measure in C 47.00 double-counted cash collateral for SFTs.

Required actions (COREP resubmission and capital adequacy):
1. Finance / Regulatory Reporting must correct C 01.00, C 08.01, and C 47.00 and resubmit via the national competent authority portal by March 31, 2026.
2. The Chief Financial Officer must restate the Q4 CET1 ratio board pack and notify the JST of the corrected ratio within 10 business days of this note.
3. Internal Audit must review the COREP production controls for foreseeable-dividend deductions and deliver a memo to the Audit Committee by April 30, 2026.
4. The Head of Regulatory Reporting will file a root-cause and remediation plan with the SSM by March 15, 2026.

Until resubmission is accepted, distributions should be assessed against the corrected own-funds position under CRR capital requirements.`,
  },
  {
    id: "finrep-credit-quality",
    title: "FINREP Credit Quality / IFRS 9 Notice",
    label: "FICTIONAL SAMPLE",
    framework: "FINREP",
    text: `FICTIONAL FINREP SUPERVISORY QUERY — FOR DEMO ONLY

Institution: Meridian EU Credit Institution S.A. (fictional)
Framework: FINREP (Financial Reporting) — IFRS 9 credit quality templates
Templates in scope: F 18.00 (information on performing and non-performing exposures), F 19.00 (forborne exposures)
Reporting date: 31 December 2025
Date: February 18, 2026

Supervisory query:
1. Stage 2 exposures in F 18.00 increased 22% QoQ without a corresponding rise in ECL coverage; SICR (significant increase in credit risk) triggers for CRE SME portfolios appear inconsistently applied versus the IFRS 9 policy.
2. Forborne performing exposures in F 19.00 under-report cure-period exits — 140 facilities still tagged forborne beyond the 24-month probation window without documented cure tests.
3. Accumulated impairment on POCI assets is inconsistently signed versus FINREP instructions.

Required actions:
1. Credit Risk and Finance must reconcile Stage 2 SICR flags to the IFRS 9 policy and amend F 18.00 for resubmission by April 15, 2026.
2. The Head of Credit Remediation must complete forbearance cure testing for the 140 facilities and update F 19.00 by March 31, 2026.
3. Regulatory Reporting must publish a FINREP data-quality attestation for Q1 2026 templates, reviewed by Internal Audit, before the May 2026 submission.
4. Brief the Board Risk Committee on ECL coverage vs Stage 2 migration at the March 2026 meeting.

Material misstatements in FINREP credit-quality templates may trigger a follow-up on-site inspection of IFRS 9 governance.`,
  },
  {
    id: "call-report-ffiec031",
    title: "Call Report FFIEC 031 Accuracy Finding",
    label: "FICTIONAL SAMPLE",
    framework: "Call Report",
    text: `FICTIONAL OCC / FDIC CALL REPORT FINDING — FOR DEMO ONLY

Institution: Meridian Trust Bank, N.A. (fictional national bank)
Report: Consolidated Reports of Condition and Income (FFIEC 031)
As-of date: December 31, 2025
Date: February 8, 2026
Subject: Call Report Schedule RC-R and RI accuracy — Matters Requiring Attention

Examiners identified reporting errors in the December 31, 2025 Call Report:

1. Schedule RC-R Part II: Risk-weighted assets for HVCRE exposures used the 100% risk weight instead of 150% for three construction facilities totaling $64m, understating RWA.
2. Schedule RI: Provision for credit losses omitted a $4.2m qualitative overlay approved by ALCO in December, understating expense and overstating net income.
3. Schedule RC-C: Past-due 30–89 day loans excluded purchased credit-deteriorated (PCD) loans that should be reported separately per Call Report instructions.

Required actions:
1. The Controller / Regulatory Reporting Officer must file an amended Call Report for December 31, 2025 via the CDR (Central Data Repository) by March 20, 2026.
2. Finance must recalculate RC-R capital ratios with corrected HVCRE risk weights and present to ALCO within 15 business days.
3. Internal Audit must test Call Report preparation controls for RC-R and RI before the March 31, 2026 quarter-end submission and report exceptions to the Audit Committee.
4. Management must submit a corrective action plan to the OCC within 30 days of this memorandum (by March 10, 2026).

Call Report amendments that change capital ratios should be coordinated with the OCC portfolio manager before public disclosure.`,
  },
  {
    id: "fed-capital-planning",
    title: "Federal Reserve Capital Planning Update",
    label: "FICTIONAL SAMPLE",
    framework: "CCAR",
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
    framework: "Consumer",
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
    framework: "Demo",
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
