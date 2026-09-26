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

  // ---------------------------------------------------------------------------
  // Complex multi-obligation samples — denser examiner-style inputs for triage,
  // obligation extraction, memo drafting, grounding, and playbook attachment.
  // ---------------------------------------------------------------------------

  {
    id: "ccar-cre-liquidity-overlay",
    title: "CCAR CRE Stress Overlay and Distribution Limits",
    label: "FICTIONAL SAMPLE — COMPLEX",
    framework: "CCAR",
    text: `FICTIONAL FEDERAL RESERVE SUPERVISORY LETTER — FOR DEMO ONLY

To: Board of Directors; Chief Financial Officer; Chief Risk Officer; Treasurer
Institution: Meridian Trust Bank Holding Company (Large Holding Company, fictional)
From: Federal Reserve Board — Large Institution Supervision Coordinating Committee (LISCC)
Date: January 28, 2026
Reference: 2026 Comprehensive Capital Analysis and Review (CCAR) — Commercial Real Estate Stress Overlay, Liquidity Interaction, and Planned Distributions
Confidential Supervisory Information — handle per SR 97-25 / SR 13-13 analogues (fictional policy references)

I. Purpose and Scope

This letter conveys horizontal and firm-specific feedback on Meridian Trust Bank Holding Company's 2026 CCAR capital plan relative to the Board's severely adverse scenario and the firm's internal idiosyncratic CRE and wholesale funding overlays. It is not an enforcement action. It does, however, identify Matters Requiring Attention (MRAs) and Matters Requiring Immediate Attention (MRIAs) that must be remediated before the firm may rely on the submitted capital plan for planned common dividends and share repurchases in the second half of 2026.

The review covered: (a) PPNR and credit-loss modeling for CRE and C&I; (b) the interaction of projected CET1, Tier 1 leverage, and supplementary leverage ratios with the firm's internal capital targets; (c) liquidity coverage and contingency funding under the same severely adverse path; and (d) governance evidence that the Board Risk Committee and Audit Committee reviewed material model changes before attestation.

II. Findings — Capital Adequacy under Revised CRE Assumptions

1. Severely adverse national CRE price path. The Board's public severely adverse scenario embeds a peak-to-trough decline of approximately 40% in commercial real estate prices and unemployment peaking at 10.2%. Meridian's firm-specific overlay applied only a 28% CRE decline to the office and retail cohorts that comprise 34% of the CRE book. Examiners could not locate a documented rationale tying the 28% firm overlay to loss experience, appraisal lags, or refinance walls through 2027. Management asserted in the January 8, 2026 capital-plan walkthrough that "historical severity for our geography has been milder than the national path," but the supporting regional index series in Appendix C ends in 2019 and does not reflect post-pandemic office vacancy. Absent stronger evidence, examiners treat the 28% overlay as insufficiently conservative relative to the Board scenario.

2. Income-producing CRE and construction risk weights in stress. The nine-quarter stress path shows construction and land-development balances declining only 6% while criticized CRE rises from 4.1% to 11.8% of the CRE portfolio. Charge-off timing appears back-loaded into quarters 7–9 without a clear linkage to maturity walls disclosed in the Q3 2025 10-Q analogue. The resulting post-stress CET1 trough of 7.4% sits 40 basis points above the firm's internal management buffer but would breach that buffer if CRE losses were accelerated by two quarters.

3. Operational-risk and non-interest expense shocks. The plan includes a flat 80 bps-of-RWA operational-risk loss add-on. Horizontal peers commonly stress 100–140 bps when litigation and cyber scenarios are combined. Meridian's model inventory lists the operational-risk module as "limited change" since 2024 despite a material increase in third-party technology spend. Model Risk Management (MRM) signed the module on December 12, 2025, with a condition to refresh loss data by March 2026; that condition remains open.

III. Findings — Liquidity Interaction with Capital Distributions

Examiners reviewed the CCAR-linked liquidity package for consistency with the capital plan's distribution assumptions. Under the combined market and idiosyncratic deposit-outflow path, projected LCR troughs at 108% in quarter 3 while the firm simultaneously models $1.1 billion of common dividends and $400 million of buybacks across quarters 3–5. Contingency funding capacity from FHLB advances is assumed available at pre-stress haircuts. That assumption may be optimistic if pledged CRE collateral valuations track the stress path. Treasury materials state that "wholesale funding markets are expected to remain orderly for Category III firms of our profile," which is a forward-looking claim not directly supported by the severely adverse scenario narrative.

IV. Governance and Attestation Gaps

Board Risk Committee minutes from December 2025 and January 2026 record discussion of the capital plan but do not evidence challenge of the 28% CRE overlay or of distribution capacity under an LCR floor of 110%. Internal Audit's capital-planning review (report IA-2026-04) was issued in draft on January 19, 2026, and had not been finalized when the Board Chair signed the capital-plan attestation on January 21, 2026. The capital plan rule and supervisory expectations generally contemplate that internal audit review precede attestation; the sequencing here is a governance deficiency.

V. Required Actions and Deadlines

1. CRE overlay remediation (MRIA). The Chief Risk Officer and Head of Credit Risk must resubmit the firm-specific CRE stress overlay with quantitative support against national and regional indices through at least Q4 2025, or adopt the Board's 40% severely adverse CRE path without downward adjustment. Deliverable due February 20, 2026. If the firm retains any overlay below 40%, the Board Risk Committee must minute explicit acceptance of residual model risk.

2. Capital plan resubmission (MRA). The CFO must resubmit the 2026 CCAR capital plan, including refreshed PPNR, credit-loss, and operational-risk modules, by March 15, 2026. Planned distributions in quarters 3–5 must be re-sized so that post-stress CET1 remains at or above the internal management buffer under the revised CRE path, and so that projected LCR does not fall below 110% in any stressed quarter while distributions are assumed.

3. Model-risk inventory (MRA). MRM must close the open condition on the operational-risk module and update the model-risk inventory for PPNR and CRE credit-loss models by February 28, 2026, with Independent Risk Management concurrence.

4. Liquidity–capital consistency memo (MRA). The Treasurer and CFO must jointly deliver a memo to ALCO and the Board Risk Committee by February 25, 2026, reconciling distribution capacity, FHLB contingency assumptions, and LCR/NSFR troughs under the same severely adverse path used for CCAR.

5. Governance re-attestation (MRA). Internal Audit must finalize IA-2026-04 before any re-attestation. The Board Risk Committee must re-attest the revised capital plan in March 2026 minutes prior to FRB submission. Corporate Secretary owns minute quality.

6. Progress reporting. The CFO will provide biweekly written status to the LISCC central point of contact until the March 15, 2026 resubmission is acknowledged as complete.

VI. Supervisory Consequences

Failure to meet the March 15, 2026 resubmission deadline, or a revised plan that remains deficient on CRE severity or distribution–liquidity consistency, may result in an objection or conditional non-objection limiting capital distributions under the capital plan rule. This letter should be shared with the Audit Committee and with internal audit. All figures and institution identifiers in this sample are fictional and intended solely for RegPilot demonstration of multi-obligation CCAR triage, grounding, and playbook attachment.`,
  },
  {
    id: "dodd-frank-volcker-metrics",
    title: "Dodd-Frank Volcker Metrics and Covered Fund Findings",
    label: "FICTIONAL SAMPLE — COMPLEX",
    framework: "Dodd-Frank",
    text: `FICTIONAL INTERAGENCY EXAMINATION MEMORANDUM — FOR DEMO ONLY

Agencies: Office of the Comptroller of the Currency; Federal Reserve Board; Federal Deposit Insurance Corporation; Securities and Exchange Commission (coordination copy)
Institution: Meridian Trust Bank, N.A., and Meridian Markets LLC (fictional banking entity and affiliated broker-dealer)
Date: February 11, 2026
Subject: Dodd-Frank Act §619 (Volcker Rule) — Trading Desk Metrics, Covered Fund Exposures, and Compliance Program Deficiencies
Examination cycle: 2025–2026 continuous monitoring / horizontal metrics review
Classification: Confidential Supervisory Information — FICTIONAL

I. Executive Summary

Examiners identified material weaknesses in Meridian's Volcker Rule compliance program spanning (1) RENTD (reasonably expected near-term demand) documentation for three fixed-income market-making desks; (2) quantitative trading metrics escalation under the firms' metrics reporting framework; (3) covered fund sponsorship and seeding activity in two private credit vehicles; and (4) CEO and Board-level annual attestation processes. The memorandum sets forth required remediation with concrete deadlines. Soft or aspirational language in management's responses is noted where it lacks contemporaneous evidential support.

II. Background

Meridian Markets LLC operates twelve Volcker trading desks. Five desks are designated market-making; four are underwriting; three are risk-mitigating hedging. Aggregate average trading assets over the review period were approximately $18.4 billion. The banking entity relies on the market-making exemption and the underwriting exemption, and on the covered fund exclusions for loan securitizations and wholly owned subsidiaries. Internal policy Volcker-POL-2024-07 states that desk-level RENTD analyses are refreshed "at least annually or upon material market change." Examiners found that three desks last refreshed RENTD in March 2024 despite significant rate-volatility regime changes in 2025.

III. Trading Desk Findings

A. Rates Market-Making Desk (Desk RM-01)
Inventory aging exceeded internal 15-day soft limits on 41 of 63 business days in Q4 2025 for certain off-the-run Treasury and agency positions. Desk commentary repeatedly described positions as "customer facilitation inventory consistent with RENTD," yet customer inquiry logs for the same CUSIPs show no matched inquiries within five business days for 28% of aged notionals. Comprehensive Profit and Loss Attribution (P&L attribution) showed a rising share of inventory P&L unexplained by customer-facing spreads. Metrics tickets were opened but closed as "within desk tolerance" without Compliance challenge.

B. Credit Market-Making Desk (Desk CM-04)
The desk's VaR and Stress VaR limits were increased 35% in August 2025 after a limit-breach cluster. The limit change memo asserts that "peer capacity and client franchise growth justify the increase," but does not quantify client demand or compare to RENTD capacity. Examiner sampling of 25 large trades found seven principal transactions with affiliated covered funds that were booked as market-making without demonstrable intermediation intent contemporaneous with the trade.

C. Equity Derivatives Hedging Desk (Desk EH-02)
Risk-mitigating hedges related to customer swaption packages were not always linked to identifiable underlying positions in the hedge documentation system. Seven of thirty sampled hedges lacked a documented correlation analysis. Management stated that "traders understand the economic hedge intuitively," which is insufficient under the rule's documentation expectations for the hedging exemption.

IV. Covered Fund Findings

1. Meridian Private Credit Fund I (fictional). The banking entity seeded $95 million (approximately 8% of fund NAV at peak) and provided an advisory affiliate. Seeding exceeded the 3% per-fund ownership limit for more than one year after the seeding period that management claimed ended December 2024. Legal's memo dated January 9, 2026, argues an "extended seeding period due to slower third-party fundraising," without citing a regulatory provision that automatically extends the permitted seeding window. Examiners view the position as a potential impermissible covered fund investment unless promptly reduced.

2. Meridian CLO Equity Residual Vehicle (fictional). Sponsorship indicators (name sharing, seeding, and selection of assets) are present. The vehicle was not included in the Q3 2025 covered fund inventory submitted to Compliance. Asset Management asserted the vehicle "functions like a loan securitization exclusion," but residual equity retention and active discretionary substitution rights appear inconsistent with a clean exclusion without further legal analysis.

V. Metrics, Escalation, and Attestation

Firm-wide Volcker metrics (inventory turnover, customer-facing trade ratio, and limit-breach counts) for Q3–Q4 2025 showed deteriorating customer-facing ratios on RM-01 and CM-04. Escalation to the Volcker Working Group occurred late (average 27 days after metric breach) versus the 10-business-day internal SLA. The 2025 CEO attestation was signed December 15, 2025, relying on a Compliance certification that itself noted "open remediation items without material impact." Examiners disagree that the covered fund seeding overrun is non-material.

VI. Required Remediation

1. RENTD refresh (immediate). Head of Markets and Chief Compliance Officer (Volcker) must complete refreshed RENTD analyses for desks RM-01, CM-04, and EH-02 by March 31, 2026, including quantitative demand evidence and inventory aging tolerances tied to customer inquiry data. Board Risk Committee acknowledgment due at the April 2026 meeting.

2. Metrics program (MRA). Compliance must revise escalation SLAs, implement automated metric-breach workflows, and back-test Q4 2025 breaches with documented challenge evidence by April 30, 2026. Monthly metrics packs must go to the Volcker Working Group within 10 business days of month-end.

3. Covered fund reduction (MRIA). CFO and General Counsel must reduce Meridian Private Credit Fund I seeding to at or below 3% of fund NAV (and comply with aggregate Tier 1 capital limits) by May 15, 2026, or obtain a documented supervisory nonsuitability determination pathway if seeking an alternative resolution. Provide a weekly ownership waterfall to the agencies until compliant.

4. CLO residual legal memo (MRA). Legal must deliver a reasoned exclusion analysis for the CLO Equity Residual Vehicle, or add the vehicle to the covered fund inventory and treat exposures under the rule, by April 15, 2026. Asset Management may not increase residual retention until Legal's conclusion is accepted by Compliance.

5. Desk EH-02 hedge documentation (MRA). Desk head must remediate hedge linkage and correlation documentation for all open hedges within 45 days of this memorandum (by March 28, 2026), with Internal Audit validation sampling by May 31, 2026.

6. Re-attestation (MRA). CEO and Board must re-issue Volcker compliance attestations covering the remediated program within 30 days after MRIA closure on the seeding overrun, and no later than June 30, 2026.

7. Progress letter. Submit a remediation progress letter to the OCC central point of contact within 45 days of this memorandum (by March 28, 2026), and quarterly thereafter until all MRAs/MRIAs are cleared.

VII. Ambiguous Management Claims Requiring Grounding

Management has asserted that (a) "no desk engages in prohibited proprietary trading as a business strategy," (b) "customer franchise growth fully explains limit increases," and (c) "seeding extensions are market-standard for private credit." These statements should be treated as claims requiring source support in any examiner memo; they are not established facts in the examination record.

VIII. Closing

Absent timely remediation, agencies may consider additional supervisory actions, including restrictions on market-making desk mandates or covered fund activities. This fictional memorandum is designed to exercise RegPilot obligation extraction across Volcker metrics, covered funds, attestations, and Dodd-Frank playbook steps.`,
  },
  {
    id: "corep-finrep-reconciliation",
    title: "COREP–FINREP Reconciliation and Resubmission Package",
    label: "FICTIONAL SAMPLE — COMPLEX",
    framework: "COREP",
    text: `FICTIONAL ECB / SSM JOINT SUPERVISORY TEAM NOTE — FOR DEMO ONLY

Institution: Meridian EU Credit Institution S.A. (fictional significant institution)
Supervisor: European Central Bank — Joint Supervisory Team (JST)
Copy: National Competent Authority — fictional Member State supervisor
Date: February 20, 2026
Reference period: 31 December 2025 COREP and FINREP submissions
Subject: Cross-framework inconsistencies between COREP own funds / RWA and FINREP IFRS 9 credit quality; required resubmission and governance uplift
Framework tags: COREP (C 01.00, C 08.01, C 09.01, C 47.00); FINREP (F 18.00, F 19.00, F 20.04)

I. Context

On 12 February 2026 the JST issued preliminary findings on COREP own-funds accuracy. Subsequent horizontal analytics comparing COREP credit risk RWA to FINREP Stage allocation and non-performing exposure (NPE) stocks identified additional cross-template inconsistencies that were not visible from COREP alone. This note consolidates requirements. Management's January 2026 board pack states that "regulatory reporting quality is satisfactory and peer-aligned," a qualitative claim not supported by the error rates below.

II. Cross-Framework Findings

1. CET1 and foreseeable dividends (COREP C 01.00 / CRR Article 26(2)). Interim profits of €42.6m were recognized in CET1 without a verified deduction for foreseeable dividends. The proposed dividend of €0.18 per share implies an approximate €24.1m distribution. Finance argued dividend foreseeability was "not yet sufficiently certain" as of the reporting reference date; however, the December Board minutes record an intention to maintain the prior payout ratio. Examiners expect either deduction or a documented determination consistent with ECB guidance on foreseeable dividends.

2. IRB corporate RWA scaling (COREP C 08.01). Specialized lending slots omitted the 1.06 IRB scaling factor on €1.1bn of exposures, understating RWA by approximately €92m as previously noted, with an incremental €18m understatement identified in the shipping portfolio after FINREP cross-checks.

3. NPE and Stage 3 alignment (FINREP F 18.00 vs COREP credit risk). Stage 3 gross carrying amount in F 18.00 exceeds defaulted exposures feeding COREP credit risk templates by €67m. Approximately €41m relates to purchased or originated credit-impaired (POCI) assets with inconsistent default flags; €26m relates to curing facilities still reported as non-performing in FINREP while already returned to performing risk weights in COREP. The two frameworks need not be identical in all cases, but differences of this magnitude require a documented reconciliation bridge that Meridian could not produce within five business days.

4. Forbearance probation (FINREP F 19.00). 140 facilities remain tagged forborne performing beyond the 24-month probation window without completed cure tests. ECL coverage on these facilities is 40 bps below the Stage 2 portfolio average, which may indicate optimistic SICR application.

5. Leverage ratio exposure (COREP C 47.00). Cash collateral on SFTs was double-counted in the exposure measure (~€310m). Correcting this improves the leverage ratio, but the firm must not net the benefit against unrelated CET1 overstatements when communicating ratios externally.

6. FINREP F 20.04 collateral and guarantees. Collateral values for CRE-backed Stage 2 exposures appear to use Q2 2025 appraisals without haircuts reflecting the bank's own IFRS 9 downside scenario. Credit Risk stated appraisals are "generally current enough for reporting," which is soft language without a measurable staleness policy.

III. Capital and Disclosure Interaction

Correcting C 01.00 (dividend deduction) and C 08.01 (RWA) moves reported fully loaded CET1 from 13.1% to an estimated 12.6% before management buffers. The firm published a preliminary unaudited CET1 of 13.1% in its January trading update. Any public correction must be coordinated with the JST and the NCA. Distributions and AT1 coupons should be assessed against the corrected position.

IV. Required Actions

1. Integrated reconciliation bridge (MRIA). Head of Regulatory Reporting must produce a COREP–FINREP reconciliation bridge for NPE / defaulted exposures, Stage 3, and RWA, including POCI and curing populations, by March 20, 2026. Internal Audit must independently validate the bridge before Audit Committee review on April 8, 2026.

2. COREP resubmission. Finance / Regulatory Reporting must correct and resubmit C 01.00, C 08.01, C 09.01 (as needed), and C 47.00 via the NCA portal by March 31, 2026. Notify the JST of the corrected CET1 and leverage ratios within 10 business days of this note (by March 6, 2026).

3. FINREP amendments. Credit Risk and Finance must amend F 18.00 and F 19.00 for SICR consistency and forbearance cure testing, and resubmit by April 15, 2026. Complete cure testing for the 140 aged forborne facilities by March 31, 2026.

4. Foreseeable dividend policy. CFO must adopt a written foreseeable-dividend recognition procedure aligned with CRR Article 26(2) and ECB guidance by March 15, 2026, and apply it to the Q1 2026 COREP cycle.

5. Collateral valuation policy (FINREP). Update appraisal staleness and haircut rules for F 20.04 CRE collateral by April 30, 2026; apply to Q1 2026 reporting.

6. External communication controls. Investor Relations and CFO must clear any CET1 restatement language with Legal, Compliance, and the JST before release. Draft talking points due March 10, 2026.

7. Root-cause plan. File a root-cause and remediation plan covering COREP production controls and FINREP–COREP reconciliation with the SSM by March 15, 2026. Monthly progress reports to the Board Risk Committee until both resubmissions are accepted.

V. Supervisory Outlook

Material unresolved inconsistencies may trigger an on-site inspection focused on IFRS 9 governance and COREP production controls. Until resubmissions are accepted, the JST expects prudence on distributions relative to the corrected own-funds path. This fictional package intentionally mixes COREP and FINREP obligations so RegPilot can attach either playbook and test cross-framework grounding.`,
  },
  {
    id: "call-report-schedules-liquidity",
    title: "Call Report Multi-Schedule Accuracy and Liquidity MRA",
    label: "FICTIONAL SAMPLE — COMPLEX",
    framework: "Call Report",
    text: `FICTIONAL OCC / FDIC INTERAGENCY CALL REPORT MEMORANDUM — FOR DEMO ONLY

Institution: Meridian Trust Bank, N.A. (fictional national bank)
Charter: National bank supervised by the OCC; deposit insurance FDIC
Report: Consolidated Reports of Condition and Income (FFIEC 031)
As-of date under review: December 31, 2025
Memorandum date: February 14, 2026
Subject: Matters Requiring Attention — Schedules RC-R, RI, RC-C, RC-E, RC-O, and RC-L; amended filing and control remediation
Distribution: Board Audit Committee; CFO; Controller; Chief Risk Officer; Treasurer

I. Examination Scope

Examiners tested the December 31, 2025 Call Report against the general ledger, the allowance committee package, the HVCRE credit file sample, deposit core extracts, and the liquidity risk report used for internal LCR monitoring. The bank files FFIEC 031 quarterly via the Central Data Repository (CDR). Management represented that "Call Report preparation controls operated effectively throughout 2025," yet exception rates in the schedules below contradict that assertion.

II. Schedule Findings

A. Schedule RC-R Part II — Risk-Weighted Assets
Three construction facilities totaling $64 million were risk-weighted at 100% rather than the 150% HVCRE weight. Two additional ADC facilities ($22 million) lacked documented conformance to HVCRE exemption criteria (LTV, borrower contributed capital, and as-is appraised value tests) but were treated as exempt. Correcting known items increases RWA by approximately $54 million and reduces the CET1 capital ratio by an estimated 12 basis points relative to the filed report.

B. Schedule RI — Income Statement
Provision for credit losses omitted a $4.2 million qualitative overlay approved by ALCO on December 18, 2025. Net interest income incorrectly included $1.1 million of loan fees that should have been deferred under ASC 310-20 / Regulation guidance analogues used in Call Report instructions. As filed, net income is overstated.

C. Schedule RC-C — Loans and Lease Financing Receivables
Past-due 30–89 day loans excluded purchased credit-deteriorated (PCD) loans that instructions require to be reported with appropriate PCD breakouts. Examiner sampling also found $8.7 million of loans 90+ days past due still reported as current due to a servicing-system status code mapping error after the October 2025 conversion.

D. Schedule RC-E — Deposit Liabilities
Brokered deposit identification underreported $120 million of listing-service deposits that meet the brokered definition used for Call Report and Section 29 purposes. The bank's internal liquidity dashboard still flags these balances as "core-like retail," which is an optimistic characterization not aligned with the Call Report classification.

E. Schedule RC-O — Other Data for Deposit Insurance Assessments
Unsecured interbank liabilities and reciprocal deposit reporting contained classification inconsistencies versus the deposit data feeding RC-E. Assessment base implications appear modest but require amendment for accuracy.

F. Schedule RC-L — Derivatives and Off-Balance-Sheet Items
Notional amounts for interest-rate swaps cleared through a central counterparty were reported gross of compression cycles that had already reduced legal notional by $3.4 billion as of December 31. While RWA impact may be limited after CCR measurements, Call Report notional accuracy remains required.

III. Liquidity and Governance Observations

The December liquidity risk report used for ALCO cited a month-end LCR of 118% and stated that "deposit stability remains strong across channels." That statement partially depends on treating the $120 million listing-service deposits as stable retail funding. If reclassified consistently with brokered treatment for internal stress, the modeled 30-day outflow rate rises and LCR would trough near 112% under the bank's idiosyncratic scenario. Examiners are not concluding an LCR rule breach; they are concluding that Call Report classifications and internal liquidity assumptions are not reconciled.

Internal Audit last performed a targeted Call Report review in 2023. The 2025 SOX narrative for regulatory reporting cites management review controls but does not test HVCRE coding or brokered deposit determination.

IV. Required Actions

1. Amended Call Report (primary). Controller / Regulatory Reporting Officer must file an amended FFIEC 031 for December 31, 2025 via CDR by March 20, 2026, correcting RC-R, RI, RC-C, RC-E, RC-O, and RC-L items noted above. Coordinate with the OCC portfolio manager before any public capital-ratio disclosure that changes as a result.

2. Capital ratio recalculation. Finance must recalculate RC-R ratios with corrected HVCRE weights and present results to ALCO within 15 business days of this memorandum (by March 7, 2026).

3. Brokered deposit and liquidity reconciliation (MRA). Treasury and Deposit Operations must inventory listing-service and reciprocal deposits, align RC-E / RC-O reporting, and reconcile internal LCR assumptions to Call Report classifications by April 15, 2026. Brief ALCO and Board Risk Committee in April 2026.

4. Past-due mapping fix. Credit Operations must remediate the servicing-system past-due status mapping and complete a lookback on 90+ PD reporting for Q3–Q4 2025 by March 31, 2026.

5. Control testing. Internal Audit must test Call Report preparation controls for RC-R, RI, RC-C, and RC-E before the March 31, 2026 quarter-end submission and report exceptions to the Audit Committee by May 15, 2026.

6. Corrective action plan. Management must submit a written corrective action plan to the OCC within 30 days of this memorandum (by March 16, 2026), including owners, milestones, and evidence standards for each MRA.

7. Training. Regulatory Reporting must deliver HVCRE and brokered-deposit training to credit and deposit operations staff by April 30, 2026, with attendance logged.

V. Claims Requiring Evidentiary Support

Treat the following management statements as ungrounded until supported: (1) "controls operated effectively throughout 2025"; (2) "deposit stability remains strong across channels"; (3) listing-service deposits are "core-like retail." Examiner memos should cite schedule evidence rather than these characterizations.

VI. Closing

Call Report amendments that change capital ratios or assessment base figures should be sequenced with legal and investor-relations review. This fictional multi-schedule finding is intended to stress RegPilot's obligation extraction, grounding against soft claims, and Call Report playbook attachment.`,
  },
  {
    id: "bsa-ofac-sanctions-program",
    title: "BSA/AML and OFAC Sanctions Program Examination",
    label: "FICTIONAL SAMPLE — COMPLEX",
    framework: "BSA/AML",
    text: `FICTIONAL OCC BSA/AML AND OFAC EXAMINATION REPORT EXTRACT — FOR DEMO ONLY

To: Board of Directors and BSA Officer, Harbor Community Bank (fictional)
From: Office of the Comptroller of the Currency — BSA/AML Examination Team 7 (with OFAC compliance coverage)
Date: March 6, 2026
Subject: 2026 BSA/AML Examination — SAR Timeliness, CDD/EDD, Independent Testing, and OFAC Sanctions Program Deficiencies
Institution profile: Community bank, ~$9.2B assets (fictional); moderate international remittance activity through correspondent relationships

I. Overall Assessment

The BSA/AML program is rated less than satisfactory for this cycle. Examiners identified one MRIA and multiple MRAs spanning suspicious activity reporting, customer due diligence, transaction monitoring model validation, and OFAC screening. Management's enterprise risk assessment concludes that "residual BSA and sanctions risk is low after planned system upgrades," which overstates the current control environment given open findings below. This extract is fictional and contains no real customer PII.

II. Suspicious Activity Reporting

Of 55 SARs sampled from July–December 2025, nine (16%) were filed more than 60 calendar days after initial detection, and four of those nine exceeded 90 days. FinCEN's 30-day standard (with a limited 30-day extension when no suspect is identified) was not met. Root causes include: (a) transaction monitoring alert aging suppressed after the August 2025 case-management upgrade for New York and Miami queues; (b) backlog in the financial intelligence unit (FIU) following staff turnover; and (c) inconsistent documented "detection date" definitions between Alert Disposition Procedures and SAR SOP.

Structuring typology: Harbor's internal SAR committee reviewed a January 2026 funnel-account case (22 cash deposits totaling $198,400 under $10,000 with rapid overseas wires) but deferred exit decision pending "relationship profitability analysis." Examiners note that profitability is not a substitute for risk-based exit criteria when suspicion is elevated.

III. CDD, EDD, and Beneficial Ownership

EDD files for 25 high-risk customers showed: 8 files with outdated beneficial ownership certifications (older than the bank's 2-year refresh standard); 5 money-services-business relationships without current state licensing verification; and 3 PEPs where adverse-media refresh exceeded 18 months. CDD risk ratings for the remittance portfolio were last model-tuned in 2023 despite a 2025 product expansion into two additional corridors. Management asserted corridors are "comparable in risk to existing flows," without a documented typology refresh.

IV. Independent Testing and Model Risk

The 2025 independent BSA audit (outsourced) was rated satisfactory but did not sample OFAC potential matches or test lookback completeness after the August upgrade. Transaction monitoring above-the-line testing identified blind spots for funnel accounts and for rapid movement of funds through newly opened business accounts. Model Risk Management has not validated the monitoring scenarios since 2024; the vendor's 2025 release notes list rule changes that Harbor has not yet user-accepted.

V. OFAC Sanctions Program

OFAC screening is performed at onboarding and on batch files nightly. Gaps:

1. Real-time SWIFT payment screening failed over for 14 hours on November 12, 2025; payments released via manual workaround without 100% retrospective screening evidence. Two wires were screened only against a partial list refresh.

2. Name-matching thresholds were loosened in September 2025 to reduce false positives. Compliance approved the change based on "industry practice," but did not retain a false-negative challenge sample. Examiner seeded-name testing after the change showed weaker detection of transposed transliterations for two high-risk jurisdictions.

3. Blocked property and rejected transaction reporting logs are incomplete for Q4 2025; three rejected transactions lack contemporaneous OFAC decision memos.

4. Correspondent bank due diligence files omit periodic OFAC questionnaire updates for one nested correspondent used by remittance partners.

VI. Board Oversight

Board Compliance Committee packs summarize SAR counts but lack aging metrics, OFAC fail-over incidents, and independent testing exceptions. Minutes from October 2025 quote management saying the monitoring upgrade "eliminated backlog risk." That claim was incorrect as of the examination date.

VII. Required Actions

1. MRIA — Monitoring and SAR clock. BSA Officer must remediate case-management aging configuration, redefine detection-date standards, and complete an independent lookback of all alerts from July 1, 2025 through February 28, 2026 by June 30, 2026. File any additional SARs identified in the lookback within FinCEN timelines from the lookback determination date. Provide monthly SAR aging reports to the Board Compliance Committee until the MRIA is cleared.

2. Corrective action plan to OCC. Management must file a corrective action plan within 45 days of this report (by April 20, 2026), with owners and milestones for each MRA/MRIA.

3. CDD/EDD refresh (MRA). Complete beneficial ownership and EDD refreshes for all exceptions noted above by May 31, 2026. Re-rate remittance corridors with documented typology analysis before any further corridor expansion; next expansion freeze remains in place until Compliance sign-off.

4. Model validation (MRA). MRM must validate transaction monitoring scenarios (including vendor 2025 changes) by July 31, 2026, with FIU above-the-line testing results attached.

5. OFAC fail-over and thresholding (MRIA component). Chief Compliance Officer must: (a) complete a full retrospective screen of the November 12, 2025 fail-over window and document results by April 15, 2026; (b) restore or re-justify matching thresholds with false-negative testing by May 15, 2026; (c) remediate blocked/rejected transaction documentation for Q4 2025 by April 30, 2026; (d) update nested correspondent OFAC due diligence by June 15, 2026.

6. Independent testing expansion (MRA). Engage independent testing to cover OFAC and lookback validation in the 2026 audit plan; scope letter due May 1, 2026.

7. Governance reporting (MRA). Redesign Board Compliance Committee metrics to include SAR aging, OFAC incidents, alert backlog, and model validation status by the May 2026 meeting.

8. Relationship decision — funnel account. SAR Committee must reach a continue/exit decision on the January 2026 structuring case at its March meeting, documenting risk rationale independent of short-term profitability.

VIII. Soft Language and Grounding Notes

For memo drafting and grounding tests, treat as claims needing support: "residual BSA and sanctions risk is low"; corridors are "comparable in risk"; threshold changes reflect "industry practice"; the upgrade "eliminated backlog risk." Cite sampling results and dates above rather than management characterizations.

IX. Potential Consequences

Failure to remediate the MRIA on SAR timeliness and OFAC fail-over evidence may result in a formal enforcement action, civil money penalty referral, or restrictions on remittance products. This fictional examination extract is intended to exercise RegPilot across BSA/AML and sanctions obligations, confidence-sensitive claims, and the BSA/AML playbook.`,
  },
  {
    id: "finrep-ecl-governance",
    title: "FINREP ECL Governance and Stage Migration Review",
    label: "FICTIONAL SAMPLE — COMPLEX",
    framework: "FINREP",
    text: `FICTIONAL SSM SUPERVISORY REVIEW — FOR DEMO ONLY

Institution: Meridian EU Credit Institution S.A. (fictional)
Framework: FINREP — IFRS 9 expected credit loss governance and credit-quality templates
Templates: F 18.00, F 19.00, F 12.01, F 20.04
Reporting reference date: 31 December 2025
Review date: February 25, 2026
Subject: Stage migration, ECL coverage, forbearance, and Board Risk reporting quality

I. Purpose

This review follows the February 18, 2026 FINREP supervisory query and expands into governance of IFRS 9 overlays, macroeconomic scenarios, and the credibility of Board Risk Committee reporting. It deliberately includes both hard remediation deadlines and qualitative assertions that require grounding when used in examiner memoranda.

II. Portfolio and Template Observations

Stage 2 exposures in F 18.00 increased 22% quarter-over-quarter, concentrated in CRE SME and leveraged finance. ECL coverage on Stage 2 CRE SME declined 15 basis points despite the migration, because collective overlays were released in December citing "stabilizing arrears." Arrears stabilization is visible in 30-day delinquency but not in 60–90 day buckets, which continued to rise. The release memo asserts that "forward-looking indicators no longer support the prior overlay," without showing the indicator dashboard referenced.

Forborne exposures in F 19.00: 140 facilities remain beyond the 24-month probation window. Cure testing worksheets were blank for 61 of those facilities. Performing forborne ECL appears optimistic relative to peer SSM horizontal benchmarks the JST shared in the January workshop (fictional peer range).

POCI accumulated impairment signing in F 18.00 remains inconsistent for two acquired portfolios. F 12.01 movements in allowances do not fully bridge to the general ledger IFRS 9 subledger for December, with a €7.3m reconciling item labeled "timing."

Collateral and guarantees in F 20.04 for Stage 2 CRE rely on appraisals with median age of 11 months. Downside IFRS 9 scenario CRE price cuts of 18% are not applied as reporting haircuts; Credit Risk argues FINREP "does not require scenario-consistent collateral," which is a contested reading relative to the bank's own data-quality standards.

III. Governance and Model Use

The IFRS 9 Model Committee approved December overlays in a 35-minute meeting. Challenge was limited. Independent Model Validation's 2025 report rated the SICR framework "adequate with recommendations," including a recommendation—still open—to recalibrate CRE SME thresholds after product expansion. Board Risk packs show Stage migration charts but omit coverage-vs-migration analysis and forbearance aging.

Management's year-end disclosure draft states that "ECL methodologies remained substantially unchanged and coverage is prudent." Examiners consider "prudent" unsupported given Stage 2 coverage decline coincident with migration.

IV. Link to COREP (Informational)

Defaulted exposure stocks implied by FINREP Stage 3 exceed COREP defaulted exposures by €67m (see related COREP–FINREP note). Even where this review remains FINREP-tagged, obligation owners should coordinate with Regulatory Reporting on the reconciliation bridge due March 20, 2026, under the companion COREP letter.

V. Required Actions

1. SICR and Stage 2 coverage (MRA). Credit Risk and Finance must reconcile Stage 2 SICR flags to policy, reassess the December overlay release with indicator evidence, and amend F 18.00 for resubmission by April 15, 2026. If overlays remain released, Board Risk must minute acceptance of reduced coverage.

2. Forbearance cure testing (MRA). Head of Credit Remediation must complete cure testing for all 140 aged forborne facilities and update F 19.00 by March 31, 2026. Facilities failing cure tests must be re-aged or re-staged per policy within 15 business days thereafter.

3. POCI and allowance bridge (MRA). Financial Control must correct POCI impairment presentation and eliminate the €7.3m "timing" plug between F 12.01 and the IFRS 9 subledger by April 15, 2026, with Internal Audit spot checks.

4. Collateral data quality (MRA). Publish appraisal staleness limits and haircut methodology for F 20.04 by April 30, 2026; apply in Q1 2026 FINREP.

5. Model validation closure. Close the open CRE SME SICR recalibration recommendation by June 30, 2026, or document risk acceptance by the Chief Risk Officer with Board Risk visibility.

6. Board reporting upgrade. For the March and April 2026 Board Risk Committee meetings, include ECL coverage versus Stage migration, forbearance aging, and overlay inventory. CRO owns content; Corporate Secretary owns minutes.

7. FINREP data-quality attestation. Regulatory Reporting must publish a FINREP data-quality attestation for Q1 2026 templates, reviewed by Internal Audit, before the May 2026 submission.

8. Progress updates. Biweekly status to the JST until April 15, 2026 resubmission is accepted.

VI. Grounding Caution

Do not elevate the following to established fact without citations: "stabilizing arrears" as a full portfolio phenomenon; "forward-looking indicators no longer support the prior overlay"; "ECL methodologies remained substantially unchanged and coverage is prudent"; FINREP "does not require scenario-consistent collateral." Prefer template deltas, committee dates, and open validation items.

VII. Closing

Material misstatements or weak IFRS 9 governance may lead to on-site follow-up. This fictional FINREP-focused review complements the COREP–FINREP reconciliation sample and is intended to drive multiple concrete obligations through RegPilot's triage, memo, grounding, and FINREP playbook paths.`,
  },
];
