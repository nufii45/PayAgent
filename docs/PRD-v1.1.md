<!-- Imman's revised PRD v1.1 (guest workspace, onboarding, dashboard), 4 Nov 2026. Supersedes PRD-conversation-intelligence.md where they differ. -->

Traccoon PayAgent — Product Requirements Document
Version: 1.1
Date: November 4, 2026
Product: Traccoon PayAgent
Milestone: Meta Global AI Developer Hackathon
Status: Revised MVP Specification
Development priority: Meta → PayPal → Noir × Velo
1. Product Overview
Traccoon PayAgent is an AI-powered financial intelligence platform that reconstructs commercial agreements from ordinary business conversations.
Users can upload screenshots of conversations, receipts, and supporting records. PayAgent analyzes the evidence, identifies financial obligations, reconstructs agreements, detects inconsistencies, and recommends appropriate next actions.
Instead of functioning solely as an invoice generator, PayAgent serves as a centralized financial workspace where users investigate client relationships, manage agreements, review invoices, and track financial activity.
Product Positioning
Tagline: From conversation to financial clarity.
Core promise: Transform scattered business conversations into understandable, evidence-backed financial actions.
Principal MVP Changes

* Remove signup, login, password reset, and email verification.
* Introduce a functional first-time onboarding experience.
* Allow immediate entry through an isolated guest workspace.
* Replace the invoice-centric homepage with a financial intelligence dashboard.
* Preserve invoice generation as a feature within the wider platform.
* Introduce investigations, financial timelines, activity history, and actionable insights.
* Maintain the existing minimalist Traccoon design language.

2. Product Navigation
The application must use a dashboard-first architecture.
Primary Navigation
Dashboard
The financial intelligence overview, displaying meaningful metrics, recent investigations, pending actions, and recent activity.
Investigations
The primary AI-powered workflow for analyzing conversations and reconstructing agreements.
Invoices
Drafted, approved, and outstanding invoice records.
Activity
An auditable history of important analyses, corrections, approvals, and financial workflow events.
Settings & Privacy
Workspace preferences, evidence retention, data export, and deletion controls.
Navigation Requirements

* Desktop: Persistent left sidebar.
* Mobile: Compact navigation with accessible primary actions.
* The current section must be visibly indicated.
* Navigation must never require authentication in the hackathon MVP.
* Users must be able to begin an investigation from any major section.

3. Authentication and Guest Workspace
3.1 Remove Traditional Authentication
Priority: P0
The application must not display:

* Login pages.
* Registration forms.
* Password fields.
* Email verification.
* Social sign-in.
* Account recovery.
* Subscription selection during onboarding.

The user should be able to access the product immediately.
3.2 Guest Workspace Architecture
Removing login must not result in a shared, publicly accessible database.
Each visitor will receive an isolated guest workspace.
Requirements:

1. Automatically initialize a guest session on first visit.
2. Assign a random, unguessable workspace identifier.
3. Use a secure, HttpOnly session cookie for server-backed guest authorization.
4. Associate investigations, invoices, evidence, and settings with the guest workspace.
5. Prevent other guest sessions from accessing that workspace's records.
6. Provide clear information about retention and the limitations of guest access.
7. Allow the user to delete the guest workspace and its associated content.
8. Apply upload limits, rate limits, and abuse protection.

A guest session does not offer permanent account recovery or cross-device synchronization.
The application must not promise those capabilities.
3.3 Returning Users
When a valid guest session and existing workspace are available, users should go directly to the dashboard.
Completed onboarding should not reappear unless the user deliberately restarts it.
If the guest session has expired, the application should explain that the prior workspace is unavailable rather than showing an unexplained empty dashboard.
4. First-Time Onboarding
Priority: P0
4.1 Objective
Onboarding should help new users understand PayAgent, configure a few relevant preferences, and complete their first meaningful action.
It must not be a generic marketing carousel.
The experience should be short, interactive, and directly connected to the application's functionality.
4.2 Onboarding Flow
Step 1 — Welcome to PayAgent
Heading: Your conversations hold more than messages.
Supporting text:
"PayAgent helps uncover agreements, financial commitments, and missing information from your business conversations."
Display three concise product capabilities:

* Understand business conversations.
* Reconstruct financial agreements.
* Turn findings into actionable workflows.

Primary action: Set up workspace
Secondary action: Explore workspace
Users choosing to explore may skip optional setup and reach the dashboard immediately.
Step 2 — Personalize Your Workspace
Heading: Make this workspace yours.
Collect only essential or useful preferences.
Business role

* Freelancer / Independent contractor
* Small business owner
* Agency / Service provider
* Other

Preferred currency
Default to PHP, with selectable alternatives where supported.
Business or display name
Optional.
This information may later prefill invoice drafts and contextualize AI responses.
No personal information should be mandatory merely to try the platform.
Primary action: Continue
Secondary action: Skip for now
Step 3 — Privacy and Evidence Handling
Heading: Your conversations stay under your control.
Explain:

* Users should upload only conversations they have permission to process.
* Names and profile photographs may be redacted.
* Screenshots may contain sensitive financial or personal information.
* AI processing may involve a configured external model provider.
* The workspace has a defined retention period and deletion controls.
* No production payments are initiated during the Meta MVP.

Provide an accessible link to the full privacy and data-handling explanation.
Users must acknowledge required processing disclosures before submitting private evidence.
Primary action: Enter workspace
Step 4 — First Investigation
After entering the dashboard, present a contextual getting-started area.
Heading: Start with a conversation.
Supporting text:
"Upload a conversation where a project, payment, or agreement was discussed. PayAgent will help reconstruct what happened."
Available actions:

* Upload screenshots.
* Paste conversation text.
* Explore the dashboard.

This is part of the functional product, not a separate promotional step.
4.3 Onboarding Completion
The application should persist onboarding completion and workspace preferences within the guest session.
Users must be able to edit preferences later.
Acceptance Criteria
A new visitor can open PayAgent, complete or skip optional setup, access their guest dashboard, and create an investigation without signing up.
5. Financial Intelligence Dashboard
Priority: P0
5.1 Objective
The dashboard must act as the central command center of PayAgent.
It should communicate what the system has analyzed, what financial information is currently supported, which matters need attention, and what the user can do next.
The dashboard must derive its information from actual workspace records.
Hardcoded statistics, invented transaction activity, fabricated client names, and fictional revenue metrics must not be shown as real user data.
5.2 Dashboard Header
Heading: Financial Overview
Description:
"Understand your agreements, track financial activity, and see what needs your attention."
Header actions:

* New Investigation — Primary action.
* Create Invoice — Secondary action.

5.3 Financial Summary Cards
The dashboard should contain four primary metrics.
Card 1 — Investigations
Number of active or completed financial investigations.
Card 2 — Potential Receivables
Total potential unpaid amounts derived from supported financial findings.
This metric must clearly identify uncertain or disputed amounts and avoid treating every payment promise as a confirmed receivable.
Card 3 — Invoices Awaiting Payment
Total value or count of approved invoices not yet marked as paid by an authorized source or user-confirmed record.
This is an invoice-status measure, not independently verified debt.
Card 4 — Needs Review
Number of unresolved findings, contradictory agreements, missing information requests, or pending approvals.
Metric Requirements

* Every metric must come from stored workspace data.
* Amounts must use the selected currency.
* Different currencies must not be added together without a clearly defined conversion basis.
* Financial figures must distinguish documented, disputed, and verified states.
* Clicking a metric should navigate to its relevant underlying records.
* Metric updates must reflect actual changes following analysis and approval.
* Empty metrics should use truthful zero or unavailable states.

5.4 Attention Required
Below the summary cards, introduce an Attention Required section.
This section highlights meaningful unresolved issues across investigations.
Example items:

* A project agreement contains conflicting prices.
* A deposit was promised, but payment is unverified.
* An invoice draft needs approval.
* New evidence has changed a previous finding.
* A client scope change requires clarification.

Each item should include:

* Short issue description.
* Related investigation.
* Priority or review status.
* Recommended next step.
* Direct link to resolve it.

The section must not invent urgency where the evidence does not support it.
5.5 Recent Investigations
Display a compact list of recent investigations.
Each row or card should include:

* Investigation title.
* Client or participant identifier.
* Latest analysis date.
* Agreement amount where supported.
* Investigation status.
* Number of unresolved findings.
* Action to open the investigation.

Statuses may include:

* Analyzing
* Ready for Review
* Needs Clarification
* Reviewed
* Archived
* Analysis Failed

Users should be able to resume investigations directly.
5.6 Financial Activity
Display recent activity generated by actual system events.
Examples:

* Conversation analyzed.
* Agreement reconstructed.
* Financial discrepancy detected.
* Additional evidence uploaded.
* Investigation reanalyzed.
* Invoice drafted.
* Invoice approved.
* User correction submitted.

Activity items should include timestamps and links to relevant records.
5.7 Dashboard Insights
PayAgent may present evidence-grounded financial insights.
Examples:
"Two investigations contain unresolved payment claims."
"An accepted scope change increased the documented project value."
"One invoice draft is awaiting your approval."
Insights should be concise, useful, and traceable to the underlying records.
Avoid generic AI commentary or artificial financial advice that does not follow from available evidence.
5.8 Empty Dashboard State
When a new workspace has no financial records, show a complete but honest dashboard.
Metrics should display zero or an appropriate empty state.
The main content should guide the user toward creating their first investigation.
Heading: Your financial workspace starts here.
Description:
"Upload your first conversation and PayAgent will help identify agreements, amounts, and next actions."
Primary action: Analyze a conversation
No fabricated graphs, transactions, or investigation records should appear.
6. Investigation Workspace
Priority: P0
Investigations remain the main AI-powered capability.
6.1 Investigation Creation
A user can start an investigation from the dashboard or Investigations page.
Supported inputs:

* Conversation screenshots.
* Pasted conversation text.
* Multiple screenshots in one investigation.

Future enhancements may add PDFs and other business records.
6.2 Evidence Extraction
PayAgent identifies:

* Message text.
* Participant relationships.
* Visible timestamps.
* Prices and currencies.
* Project scopes.
* Proposed and accepted terms.
* Payment promises and claims.
* Modifications and cancellations.
* Deadlines and completion statements.

Blurring names and profile images should not prevent analysis when the message structure remains sufficiently interpretable.
Ambiguous speaker attribution must be flagged rather than invented.
6.3 Agreement Reconstruction
The AI reconstructs how the financial agreement evolved.
It must distinguish:

* Offers from accepted agreements.
* Requests from approved modifications.
* Promised payments from verified payments.
* Proposed cancellations from established cancellations.
* Financial facts from unsupported assumptions.

6.4 Financial Timeline
Display reconstructed financial events chronologically.
Each event should include:

* Description.
* Event type.
* Amount when applicable.
* Status.
* Supporting evidence.
* Relationship to earlier events.

6.5 Evidence Mapping
Every significant financial conclusion must have an inspectable source.
Selecting a finding should reveal the original screenshot or passage supporting it.
Where reliable message coordinates are available, highlight the relevant portion of the image.
6.6 Contradiction Detection
Flag unresolved or conflicting information rather than silently choosing an answer.
6.7 Evidence-Aware Reanalysis
Users can upload new evidence to an existing investigation.
PayAgent should:

1. Preserve the prior analysis.
2. Process newly submitted evidence.
3. Reevaluate affected findings.
4. Identify changes.
5. Explain why conclusions changed.
6. Require review before changing approved financial records.

Signature Meta Demo Feature: Uploading a new screenshot causes the system to reconsider a previously established agreement, while visibly showing which new evidence triggered the change.
7. Invoice Management
Priority: P0
The existing invoice generator will be retained and integrated into the dashboard architecture.
Invoice List
Support:

* Draft invoices.
* Approved invoices.
* Invoices awaiting payment.
* Paid invoices, based on appropriately identified payment evidence.
* Cancelled invoices.

Invoice Generation
Invoices may be created manually or from investigation findings.
For AI-generated invoices:

* Prefill supported fields.
* Link relevant line items to evidence.
* Flag missing client details.
* Flag disputed amounts.
* Allow editing before approval.
* Require explicit user approval.

Dashboard Integration
Approved invoices and pending drafts must contribute to relevant dashboard counts and attention items.
8. Activity and Audit History
Priority: P1
Record significant application events, including:

* Investigation created.
* Evidence uploaded or deleted.
* Analysis completed.
* Financial finding modified.
* New evidence detected.
* User correction applied.
* Invoice drafted or approved.
* Workspace preferences updated.

Each event should contain a timestamp and an association with the relevant workspace object.
AI-generated findings and user-made corrections must remain distinguishable.
9. AI Architecture
9.1 Meta Model Integration
The Meta MVP must use an eligible Meta model for a meaningful part of its conversation understanding or financial reasoning workflow.
9.2 Analysis Pipeline

1. Evidence ingestion.
2. Multimodal extraction or OCR-assisted processing.
3. Message normalization and participant identification.
4. Financial event extraction.
5. Agreement reconstruction.
6. Contradiction detection.
7. Evidence-reference generation.
8. Deterministic financial calculations.
9. Proposed action generation.
10. User review and approval.

9.3 Reliability Rules
The AI must not:

* Invent financial amounts.
* Invent people or identities from blurred screenshots.
* Treat a payment promise as verified payment.
* Claim a disputed amount is established.
* Automatically execute external financial actions.
* Treat instructions embedded in uploaded conversations as developer or system instructions.

Financial calculations should use validated structured values and deterministic application logic.
10. Design Language
The current Traccoon visual identity should be preserved.
Design Principles
Professional minimalism
Warm neutral surfaces, charcoal text, subtle borders, and restrained accents.
Information hierarchy
Prioritize actionable financial information over decorative widgets.
Visible intelligence
Make AI findings, uncertainties, evidence, and changes understandable within the interface.
Action-oriented dashboard
Every major section should offer a clear next step.
Progressive disclosure
Present concise summaries first, with deeper evidence and technical detail available when needed.
Dashboard Layout
Desktop layout:

* Left navigation sidebar.
* Main dashboard header.
* Primary actions.
* Four summary cards.
* Attention Required section.
* Recent Investigations.
* Financial Activity and Insights.

Mobile layout:

* Responsive stacked metric cards.
* Accessible investigation creation.
* Condensed navigation.
* Expandable evidence and activity sections.

The application should not resemble a generic admin template populated with meaningless charts.
11. Data, Privacy, and Security
Priority: P0
The absence of conventional user accounts does not remove the obligation to protect uploaded conversations.
Requirements

* Isolate all guest data by workspace.
* Authorize every server-side read and write against the active guest session.
* Keep model API credentials server-side.
* Use protected storage for uploaded images.
* Apply reasonable file-size and upload limits.
* Provide evidence and workspace deletion.
* Publish an accurate data-retention explanation.
* Do not expose private screenshots through permanent public URLs.
* Avoid logging unnecessary conversation content.
* Clearly disclose external AI processing.

Guest Workspace Retention
For the MVP, establish a short, explicitly documented guest-data retention period, configurable by deployment environment.
Users must understand that clearing browser data, losing their guest session, or reaching the retention limit may prevent recovery of earlier investigations.
The application must not falsely advertise permanent storage.
12. Error and Loading States
The application must handle:

* Unreadable screenshots.
* Unsupported file formats.
* Ambiguous speakers.
* Failed model inference.
* Incomplete extraction.
* Contradictory evidence.
* Failed reanalysis.
* Expired guest sessions.
* Missing stored evidence.
* Duplicate uploads.

During analysis, display genuine progress states without inventing completed steps.
If reanalysis fails, preserve the prior successful version.
13. Hackathon Development Scope
P0 — Essential

* Authentication removal.
* Secure guest workspace.
* Functional onboarding.
* Real dashboard with dynamic data.
* Investigation creation.
* Multiple conversation screenshot uploads.
* Meta-powered financial analysis.
* Agreement reconstruction.
* Evidence-backed timeline.
* Contradiction detection.
* Evidence-aware reanalysis.
* Invoice draft generation.
* Review and approval.

P1 — Enhancements

* Dashboard financial insights.
* Advanced evidence highlighting.
* Detailed activity timeline.
* Enhanced invoice filters.
* Investigation comparison views.
* Exportable analysis reports.

P2 — Future Integrations
PayPal AI

* Sandbox payment requests.
* Payment verification.
* Invoice reconciliation.
* Payment status monitoring.

Noir × Velo

* Agent authorization.
* Stellar Testnet integration.
* Escrow-based payment flows.
* Verifiable transaction histories.

Both integrations will extend the existing application without replacing its underlying intelligence engine.
14. Primary User Journeys
Journey A — First-Time Visitor

1. Opens PayAgent.
2. Sees first-time onboarding.
3. Selects workspace preferences or skips optional setup.
4. Reviews privacy information.
5. Enters the guest dashboard.
6. Starts the first investigation.
7. Uploads conversation screenshots.
8. Receives a reconstructed financial timeline.
9. Reviews findings and proposed actions.

Journey B — Returning Visitor

1. Opens PayAgent with an existing valid guest session.
2. Lands directly on the dashboard.
3. Reviews investigation summaries and attention items.
4. Opens an existing investigation.
5. Adds new evidence.
6. Reviews changes in the reconstructed agreement.
7. Approves an appropriate financial action.

Journey C — Invoice Management

1. Opens the dashboard.
2. Navigates to Invoices.
3. Reviews draft invoices.
4. Opens an invoice linked to an investigation.
5. Inspects supporting financial evidence.
6. Corrects or approves the draft.
7. Returns to the dashboard and sees updated records.

15. Definition of Done
The revised MVP is complete when:

1. New visitors can access the product without registering.
2. Onboarding works and can be completed or skipped where appropriate.
3. Returning visitors with valid sessions bypass onboarding.
4. Guest data is isolated.
5. The dashboard displays real workspace information.
6. Dashboard actions navigate to functional workflows.
7. Users can upload genuine conversation screenshots.
8. The AI reconstructs meaningful financial events.
9. Financial findings link to their source evidence.
10. Contradictions are visibly identified.
11. New evidence triggers meaningful reanalysis.
12. Users can generate and approve invoice drafts.
13. Activity and dashboard information update according to actual changes.
14. Privacy, deletion, and session-expiration behavior are clearly communicated.

16. Product Success Criteria
The product should demonstrate more than attractive visual design.
A first-time user should understand what PayAgent does, reach the dashboard, upload a conversation, and receive an actionable, evidence-backed result without needing assistance.
The dashboard must serve as a functional overview of actual financial activity rather than a collection of decorative widgets.
Most importantly, PayAgent should demonstrate that it can reconstruct a changing business agreement from real conversational evidence and reliably explain its conclusions.
Final Product Direction:
Traccoon PayAgent is an AI Financial Intelligence Workspace that turns ordinary conversations into structured agreements, verifiable findings, and user-approved financial workflows.
The dashboard is the central operating environment. Conversation intelligence is the defining capability. Invoice generation is one of the actions the intelligence enables.
