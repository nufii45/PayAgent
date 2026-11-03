<!-- Imman's PRD for the Conversation Intelligence direction, 3 Nov 2026. Supersedes the invoice-first scope in PRD.md for the Meta submission. -->

Product Requirements Document
Traccoon PayAgent — Conversation Intelligence
Version: 1.0
Date: November 3, 2026
Product: Traccoon PayAgent
Initial milestone: Meta Global AI Developer Hackathon
Status: MVP Specification
Priority: High
1. Product Overview
1.1 Product Description
Traccoon PayAgent is an AI-powered financial operations platform that transforms unstructured business conversations into structured, evidence-backed financial records and actionable workflows.
Rather than requiring users to manually create invoices, organize contracts, or reconcile financial agreements, PayAgent analyzes conversations and supporting documents to reconstruct the financial relationship between parties.
Users can upload screenshots of actual conversations from messaging platforms such as Messenger, WhatsApp, Telegram, or other communication applications.
The system analyzes these conversations to identify:

* Agreements and accepted proposals.
* Project scopes and deliverables.
* Negotiated prices and revisions.
* Deposits, installments, and payment commitments.
* Additional charges and scope changes.
* Deadlines and completion claims.
* Contradictory statements.
* Potential outstanding balances.
* Missing or unverified financial evidence.

PayAgent then generates a chronological financial timeline, identifies potential discrepancies, and proposes appropriate actions.
All consequential actions remain subject to user review and approval.
1.2 Product Vision
Turn conversations into financial clarity and financial clarity into action.
PayAgent aims to become an intelligent financial assistant that understands how business agreements develop through ordinary communication.
Its primary differentiator is the ability to reconstruct financial context from fragmented evidence rather than relying exclusively on manually structured data.
1.3 Primary Value Proposition
Traditional invoice software asks:
"What would you like to invoice?"
PayAgent asks:
"What happened between you and your client, what financial obligations emerged, and what should happen next?"
The product connects conversational understanding, financial reasoning, evidence verification, and actionable workflow generation.
2. Problem Statement
Small businesses, freelancers, and independent service providers frequently establish commercial agreements through informal messaging platforms.
These conversations contain important financial information, but that information is often distributed across numerous messages, screenshots, receipts, and revisions.
A client may initially agree to a project price, later request additional work, promise a partial payment, negotiate a revised deadline, or cancel certain deliverables.
Without systematic recordkeeping, it becomes difficult to determine which terms were accepted, which payments were merely promised, and which financial obligations remain unresolved.
Existing Pain Points

1. Fragmented agreements: Financial terms are scattered across unrelated messages.
2. Unrecorded scope changes: Additional work or revised pricing may not be reflected in invoices.
3. Ambiguous payment status: A promise to pay is easily mistaken for confirmation of payment.
4. Manual reconstruction: Users must reread entire conversations to establish what happened.
5. Limited traceability: Conventional invoice generators rarely explain which conversation statements support an amount.
6. Unstructured workflows: Users must manually decide whether to invoice, request clarification, or follow up.

Problem to Solve
Users need a reliable way to reconstruct financial agreements from ordinary conversations without manually organizing every commercial interaction.
The system must recognize that conversations may contain incomplete, contradictory, or uncertain information and must not invent missing financial facts.
3. Target Users
Primary Users
Freelancers and independent contractors
Developers, designers, consultants, and other service providers who negotiate projects, prices, and payment arrangements through messaging applications.
Small business owners
Businesses that conduct customer transactions, negotiate service arrangements, and manage payment commitments through informal communication channels.
Small agencies and service providers
Organizations managing multiple client engagements with changes in pricing, deliverables, and payment schedules.
Secondary Users

* Administrative assistants.
* Bookkeepers.
* Small accounting practices.
* Client relationship managers.

Initial User Persona
A freelance developer negotiates website development work through Messenger.
The client agrees to an initial contract, requests additional features, and discusses a partial payment.
The developer wants to establish the final agreed scope, identify what remains unverified, and prepare an accurate invoice without manually reconstructing the conversation.
4. Product Goals
4.1 Primary Goals
G1 — Conversation Understanding
Extract relevant financial information from screenshots and pasted conversations.
G2 — Agreement Reconstruction
Understand how a commercial agreement changes over time, including offers, acceptance, modifications, and cancellations.
G3 — Evidence-Based Financial Reasoning
Ensure significant financial conclusions are linked to identifiable supporting evidence.
G4 — Discrepancy Detection
Identify conflicting prices, unresolved promises, questionable payment status, and missing information.
G5 — Actionable Workflows
Generate appropriate draft invoices, clarification requests, and payment follow-up messages.
G6 — User Control
Allow users to inspect, correct, approve, or reject the AI's interpretation before finalizing records or taking external action.
4.2 Non-Goals for the Meta MVP
The initial version will not include:

* Production payment processing.
* Automatic bank transfers.
* Autonomous external communication.
* Full accounting and tax compliance.
* Legal determination of contract enforceability.
* Direct access to users' private messaging accounts.
* Comprehensive bookkeeping or payroll.
* Blockchain payment settlement.
* Automatic confirmation that an externally claimed payment was received.

These capabilities may be explored in later development phases where appropriate.
5. Core Product Experience
5.1 Primary Workflow
The application must support the following user journey:
Step 1 — Create an Investigation
A user starts a new financial investigation from the PayAgent workspace.
The user may enter a brief instruction, such as:
"Analyze these conversations and determine what my client and I agreed on, including any remaining payments."
Step 2 — Upload Evidence
The user uploads conversation screenshots or pastes text from the relevant exchange.
The system accepts multiple screenshots belonging to the same conversation.
Step 3 — Analyze Conversation
The AI identifies messages, speakers, financial entities, commitments, and relevant events.
The application reconstructs the chronological order of the conversation where possible.
Step 4 — Reconstruct Agreement
PayAgent determines which contractual or financial terms appear to have been proposed, accepted, modified, disputed, or cancelled.
Step 5 — Present Findings
The system displays a structured summary, financial timeline, source references, and outstanding uncertainties.
Step 6 — Recommend Actions
The AI identifies reasonable next actions, such as requesting clarification, drafting an invoice, or preparing a payment reminder.
Step 7 — Review and Approve
The user verifies extracted information, corrects mistakes, and explicitly approves any final invoice or externally consequential action.
Step 8 — Save Financial Record
Approved information is stored as a structured record with relevant evidence references and an audit history.
6. Functional Requirements
FR-01 — Evidence Upload and Management
Priority: P0
Users must be able to submit conversation evidence.
Supported Inputs

* PNG screenshots.
* JPEG screenshots.
* WebP screenshots.
* Pasted conversation text.
* Multiple screenshots within one investigation.

PDF support may be added after the primary screenshot workflow is stable.
Requirements

1. Support multiple images within a single investigation.
2. Display previews of uploaded evidence.
3. Allow reordering screenshots when their chronological sequence cannot be established.
4. Preserve each source's original identifier and extraction metadata.
5. Identify potential duplicate or overlapping messages.
6. Permit removal of evidence before analysis.
7. Handle blurred names and profile images without requiring personal identification.
8. Request speaker clarification when the AI cannot reliably distinguish the participants.

Acceptance Criteria
A user can upload several screenshots, arrange them in the intended order, and start a single investigation without manually transcribing the conversation.
FR-02 — Multimodal Conversation Understanding
Priority: P0
PayAgent must analyze uploaded screenshots using an AI pipeline with visual understanding or OCR-assisted interpretation.
Required Extraction

* Message text.
* Speaker assignment where reasonably identifiable.
* Visible timestamps.
* Message sequence.
* Currency amounts.
* Dates and deadlines.
* Project or service descriptions.
* Payment commitments.
* Commercial terms.
* Statements related to work completion.

Speaker Handling
When names and profile images are blurred, the application should use neutral participant identifiers such as Participant A and Participant B.
If message positioning and visible context are insufficient to determine the participants, the system must request user clarification.
Speaker identity must never be invented.
Extraction Requirements
Every extracted message must reference its source screenshot or pasted-text segment.
For image evidence, the system should retain message-level location information when available to enable source highlighting.
Acceptance Criteria
The application can extract financially relevant statements from a multi-screenshot conversation and present them in a reviewable structured format.
FR-03 — Agreement Reconstruction Engine
Priority: P0
The system must recognize the development of commercial agreements throughout a conversation.
Supported Agreement Events

* Initial offer.
* Counteroffer.
* Acceptance.
* Rejection.
* Price modification.
* Additional scope request.
* Scope approval.
* Cancellation or withdrawal.
* Deposit request.
* Payment promise.
* Payment claim.
* Work completion claim.
* Deadline modification.

Interpretation Rules
The AI must distinguish between statements that carry different levels of financial significance.
Examples:
"Can you add another dashboard?" is a request, not an accepted paid modification.
"I can add it for ₱3,000" is a proposal, not necessarily an agreement.
"Yes, please proceed for ₱3,000" provides evidence of acceptance.
"I'll send the deposit tomorrow" is a payment promise, not proof of payment.
"I've paid already" is a payment claim, not independent verification.
A new statement may supersede an earlier agreement, but the system must preserve the original event in its historical record.
Acceptance Criteria
Given a conversation containing an initial agreement and a subsequent accepted price modification, PayAgent correctly identifies the revised amount and links both amounts to their supporting messages.
FR-04 — Financial Evidence Engine
Priority: P0
PayAgent must maintain a structured relationship between financial conclusions and their supporting evidence.
Core Requirement
Every material financial finding must have at least one of these classifications:

* Supported by identifiable conversation evidence.
* Supported by a user-provided document or receipt.
* Manually entered or confirmed by the user.
* Inferred, with clearly stated uncertainty.
* Unresolved due to insufficient or contradictory information.

Evidence References
A finding should include:

* Source evidence ID.
* Relevant message or passage.
* Associated participant, if known.
* Visible timestamp, if available.
* Financial interpretation.
* Evidence classification.
* Uncertainty explanation where applicable.

Interaction Requirement
Users must be able to select a finding and inspect its original source.
For screenshots, the interface should display the image with the corresponding message highlighted whenever accurate coordinates are available.
If precise highlighting fails, the application must still display the correct source screenshot and extracted passage.
Acceptance Criteria
Selecting a financial amount in the analysis reveals the evidence that supports it.
If the application cannot provide adequate evidence, the amount must not be presented as an established contractual fact.
FR-05 — Financial Timeline
Priority: P0
PayAgent must present the reconstructed agreement as a chronological sequence of meaningful business events.
Timeline Events
Each timeline item should include:

* Event title.
* Event type.
* Financial amount where applicable.
* Date or sequence position.
* Agreement status.
* Supporting evidence.
* Relationship to previous events.

Example

1. Initial website agreement — ₱15,000.
2. Client promises a ₱5,000 deposit.
3. Client requests an additional dashboard.
4. Additional dashboard approved for ₱3,000.
5. Revised project value — ₱18,000.
6. Final payment status remains unverified.

Requirements
The timeline should distinguish confirmed agreement terms from unsupported assumptions.
Changes must not overwrite historical events.
Instead, revised terms should be linked to the preceding event and marked as amended, superseded, disputed, or cancelled where supported.
Acceptance Criteria
The user can understand how the agreement evolved without rereading the entire conversation.
FR-06 — Contradiction and Uncertainty Detection
Priority: P0
The system must proactively identify inconsistent financial information.
Examples

* Different project prices mentioned without a clear final agreement.
* Deposits promised but not independently confirmed.
* Additional work requested without an accepted price.
* Conflicting deadlines.
* Cancelled work still appearing in a proposed invoice.
* Ambiguous statements concerning refunds or remaining balances.

Expected Behavior
When a discrepancy is detected, PayAgent should:

1. Identify the conflicting statements.
2. Show the relevant supporting evidence.
3. Explain why the information cannot be safely reconciled.
4. Avoid silently choosing an unsupported interpretation.
5. Ask a targeted clarification question or recommend an appropriate next action.

Acceptance Criteria
The system identifies a conflicting price revision and prevents the disputed amount from being represented as an approved invoice line without user resolution.
FR-07 — Evidence-Aware Reanalysis
Priority: P0 — Signature Feature
This is the central demonstration feature for the Meta hackathon.
Users must be able to add new evidence to an existing investigation and request reanalysis.
The application should evaluate how the additional information changes its existing conclusions.
Example Scenario
Initial evidence establishes:

* Website project: ₱15,000.
* Additional dashboard: ₱3,000.
* Total agreed project value: ₱18,000.

A new screenshot states:
"Let's cancel the additional dashboard. Don't work on that part anymore."
The system must reassess the additional scope and determine whether the new message supports cancellation.
If the earlier agreement has been validly superseded according to the available conversation evidence, the current reconstructed project amount may be revised to ₱15,000.
If the work had already been completed or its payment terms remain disputed, PayAgent must preserve that ambiguity rather than automatically eliminating the charge.
Difference View
The system should communicate the changes between analysis versions.
Examples:

* Previous finding: Dashboard add-on accepted.
* New evidence: Dashboard add-on cancellation requested.
* Current finding: Cancellation status requires review.
* Financial impact: ₱3,000 potentially affected.

Requirements

1. Preserve the prior analysis version.
2. Incorporate new evidence into the event history.
3. Reevaluate affected conclusions.
4. Identify added, modified, or superseded findings.
5. Explain the evidence responsible for each material change.
6. Preserve user-approved records unless the user explicitly authorizes their revision.

Acceptance Criteria
Adding contradictory or superseding evidence produces a visibly updated analysis, with an explanation of what changed and why.
The system must not fabricate a timeline change merely to make the demonstration appear more impressive.
FR-08 — Financial Summary
Priority: P0
The application should generate a concise summary of the reconstructed financial relationship.
Summary Fields

* Client or participant identifier.
* Project or service description.
* Original proposed amount.
* Current supported agreed amount.
* Approved additional charges.
* Documented payment claims.
* Independently verified payments, if any.
* Potential outstanding balance.
* Unresolved discrepancies.
* Recommended next action.

Critical Financial Distinction
The system must distinguish:
Promised payment: Someone stated that they intend to pay.
Claimed payment: Someone stated that a payment was made.
Documented payment: A receipt or similar record has been provided.
Verified payment: An authorized payment provider or trusted transaction record confirms the transaction.
These categories must not be treated as interchangeable.
A balance calculated using unverified payment claims must be labeled accordingly.
Acceptance Criteria
Financial summaries must make it clear which amounts are established, conditional, disputed, or unverified.
FR-09 — AI-Generated Next Actions
Priority: P0
After completing an investigation, PayAgent must propose useful financial or administrative actions.
Initial Supported Actions
Draft Invoice
Generate an invoice using supported financial terms and user-approved information.
Prepare Clarification Request
Draft a message requesting confirmation of unclear pricing, deliverables, or payment arrangements.
Prepare Payment Follow-up
Generate a professional reminder using the documented context and applicable payment status.
Save Agreement Summary
Create a structured internal summary of accepted terms, outstanding uncertainties, and supporting evidence.
Action Requirements
Every proposed action must clearly indicate:

* What the action does.
* Which information it uses.
* What remains unverified.
* Whether user approval is required.

Acceptance Criteria
The system generates an appropriate action without inventing missing financial terms.
No email, payment request, or external message is sent automatically during the Meta MVP.
FR-10 — Invoice Generation
Priority: P0
The existing invoice-generation functionality will become a tool within the broader investigation workflow.
Requirements

1. Create invoice drafts from supported agreement terms.
2. Prefill client, service, amount, and relevant dates where available.
3. Allow editing before approval.
4. Explicitly flag missing or disputed fields.
5. Prevent unverified assumptions from silently entering final financial records.
6. Link invoice line items back to their supporting evidence.
7. Save the approved invoice and maintain its relationship to the original investigation.

Acceptance Criteria
A user can turn a reconstructed agreement into an accurate, editable, evidence-backed invoice draft.
FR-11 — Human Review and Corrections
Priority: P0
Users must retain control over how the application's findings become financial records.
Requirements
Users should be able to:

* Correct an extracted amount.
* Correct speaker attribution.
* Reorder screenshots.
* Confirm or reject an interpreted agreement.
* Mark a finding as unresolved.
* Review changes resulting from newly added evidence.
* Approve or reject a proposed invoice.
* Request reanalysis after correcting information.

Corrections must be recorded separately from the original evidence.
The application must not alter source text to match a user's preferred interpretation.
Acceptance Criteria
A user correction updates the relevant analysis while retaining an accurate record of its origin.
7. User Interface and Design Requirements
7.1 Design Philosophy
PayAgent should maintain the existing Traccoon visual language.
The application should feel like a professional financial intelligence workspace rather than a generic chatbot or traditional accounting dashboard.
Visual Characteristics

* Minimalist, warm neutral background.
* Dark charcoal typography.
* Subtle card borders.
* Restrained accent colors.
* Generous spacing.
* Clear information hierarchy.
* Soft corner radii.
* Limited decorative elements.
* Intentional, meaningful use of color.

Visual emphasis should communicate the reliability and status of information rather than simply decorating the interface.
7.2 Information Architecture
The primary navigation should include:
Workspace
Entry point for creating investigations, uploading evidence, and reviewing recent activity.
Investigations
Collection of ongoing or completed conversation analyses.
Invoices
Existing invoice records and approved drafts.
Activity
History of important user approvals, corrections, and workflow events.
Payment-specific sections may be introduced in later phases.
7.3 Workspace Screen
Replace the existing invoice-focused landing experience with a broader financial analysis interface.
Primary Heading
"Your Financial Workspace"
Supporting Description
"Turn conversations and business records into clear financial actions."
Main Interaction
A prominent prompt area allowing the user to:

* Describe what they want to investigate.
* Paste conversation text.
* Upload multiple screenshots.
* Begin analysis.

Secondary Content
Display recent investigations, pending clarifications, and invoices when records exist.
Do not populate the product with fabricated transaction results.
An empty workspace should clearly explain the application's capabilities.
7.4 Investigation Detail Screen
The investigation detail should use a structured layout.
Main Content

* Investigation summary.
* Financial timeline.
* Detected contradictions.
* Agreement reconstruction.
* Suggested actions.

Evidence Panel

* Uploaded screenshots.
* Extracted message references.
* Source highlights.
* Evidence navigation.

On desktop, the evidence panel may appear beside the investigation results.
On mobile, evidence should remain accessible through expandable sections or a dedicated view.
7.5 Analysis States
The interface must support:

* Empty investigation.
* Evidence uploaded.
* Analysis in progress.
* Analysis completed.
* Partial extraction failure.
* Missing information.
* Conflicting evidence.
* User review required.
* Invoice approved.
* Reanalysis completed.

Loading states must indicate genuine processing rather than imply actions that have not occurred.
7.6 Privacy and Environment Indicators
The application should not display a global "Test data only" banner simply because the original MVP used example invoices.
Users must be able to analyze genuine, authorized conversation evidence.
However, the interface must accurately distinguish:

* AI findings from verified financial records.
* Draft actions from executed actions.
* Sandbox payments from live transactions.
* Testnet transactions from mainnet transfers.

Future integrations must display their actual payment environment.
8. AI System Requirements
8.1 Model Integration
The Meta MVP must use an eligible Meta model for a meaningful component of the conversation analysis or financial reasoning pipeline.
The exact model and inference endpoint must be selected based on current hackathon eligibility, available access, supported input modalities, and implementation feasibility.
8.2 Proposed AI Pipeline
Stage A — Evidence Processing
Receive images or text, normalize inputs, and preserve source identifiers.
Stage B — Message Extraction
Identify text, message boundaries, timestamps, and participant relationships.
Stage C — Event Extraction
Convert conversational statements into structured financial events.
Stage D — Agreement Reconstruction
Determine relationships between offers, acceptance, modifications, and cancellations.
Stage E — Financial Validation
Apply deterministic rules for arithmetic, status classification, required fields, and consistency checks.
Stage F — Evidence Mapping
Connect findings to their supporting source passages.
Stage G — Action Planning
Propose reviewable financial and administrative actions.
8.3 Structured Output
The analysis pipeline should produce schema-validated results.
Illustrative entities include:
Message

* Message ID.
* Evidence source ID.
* Speaker identifier.
* Text.
* Timestamp, if available.
* Source location.

Agreement Event

* Event ID.
* Event type.
* Associated participants.
* Amount and currency, when supported.
* Status.
* Supporting message IDs.
* Related preceding event IDs.

Financial Finding

* Finding ID.
* Description.
* Amount, when applicable.
* Evidence references.
* Verification classification.
* Uncertainty explanation.
* Review status.

Proposed Action

* Action ID.
* Action type.
* Required information.
* Related findings.
* Approval requirement.
* Current execution status.

The model's output must be validated before it is stored or used to generate financial records.
8.4 AI Reliability Requirements
PayAgent must:

1. Avoid inventing amounts, dates, names, or payment confirmations.
2. Distinguish explicit statements from interpretations.
3. Link material conclusions to available evidence.
4. State uncertainty rather than forcing a conclusion.
5. Recalculate financial amounts using deterministic application logic.
6. Treat uploaded conversation content as evidence, not system instructions.
7. Prevent prompt-injection content inside screenshots from overriding application rules.
8. Avoid taking payment or communication actions without authorization.
9. Disclose extraction failures that affect analysis quality.

Model-generated confidence alone is not proof of correctness.
9. Data Architecture
9.1 Primary Entities
Investigation
Represents one business case or reconstructed financial relationship.
Evidence Source
Stores references to uploaded screenshots, pasted conversation content, or supporting documents.
Extracted Message
Represents an individual message and its source metadata.
Agreement Event
Represents a financially significant event reconstructed from the conversation.
Analysis Version
Stores the findings generated from a specific evidence set and the model or pipeline version used.
Financial Finding
Represents an interpreted agreement, payment claim, financial obligation, or discrepancy.
Proposed Action
Represents an invoice, clarification request, reminder, or other suggested workflow.
Invoice
Stores a user-approved or draft invoice linked to the investigation.
Audit Event
Records important changes, corrections, approvals, and execution attempts.
9.2 Data Relationships
One investigation may contain multiple evidence sources.
An evidence source may contain multiple extracted messages.
An agreement event may reference multiple messages.
A finding may reference multiple events and evidence sources.
An investigation may have multiple analysis versions.
An approved invoice must retain its relationship to the analysis and evidence used when it was approved.
10. Privacy, Security, and User Trust
Because conversation screenshots may contain private or commercially sensitive information, privacy must be considered from the beginning.
Core Requirements

* Accept evidence only from users authorized to provide it.
* Encourage redaction of unnecessary names, profile pictures, account details, and contact information.
* Do not attempt to reverse blurred or redacted identifiers.
* Preserve private source content only as required for the investigation.
* Use authenticated access controls for persistent investigations.
* Keep AI provider credentials and storage secrets server-side.
* Restrict evidence access to authorized users.
* Provide investigation and evidence deletion functionality.
* Disclose the use of external AI processing services where applicable.
* Define and enforce a clear retention policy.
* Never log uploaded conversation content or credentials in unnecessary application logs.
* Never claim that data is not retained or used for training unless that claim is supported by the actual provider configuration and storage implementation.

Payment Safety
The Meta MVP must not initiate production payments.
Future PayPal or blockchain integrations will require separate authorization, execution, and verification controls.
11. Error Handling
Unsupported or Unreadable Screenshot
The system should identify which evidence could not be processed and allow replacement.
Ambiguous Speaker Attribution
Ask the user to identify the speakers instead of inventing identities.
Missing Agreement Information
Generate a clarification request rather than assuming a price or deadline.
Conflicting Financial Evidence
Present the conflicting statements and mark the affected finding for review.
Incomplete Payment Evidence
Distinguish payment promises and claims from verified receipts.
Model or Provider Failure
Provide a recoverable error and preserve uploaded evidence where safely possible.
Failed Reanalysis
Retain the previous completed analysis and avoid replacing it with an incomplete result.
12. Performance and Quality Requirements
Performance Targets
The MVP should aim to:

* Provide immediate feedback when files are selected.
* Display processing progress for longer analyses.
* Complete a typical small investigation without requiring a page refresh.
* Preserve investigation state through recoverable failures.
* Avoid duplicate actions if analysis or approval is retried.

Actual latency targets should be established through testing with the selected model and hosting provider.
Quality Targets
For the defined demonstration test set:

* All generated financial amounts must be traceable to evidence or explicit user input.
* The system must not knowingly treat promised payments as verified.
* Accepted scope changes must be distinguishable from unaccepted proposals.
* New evidence must trigger a meaningful reassessment of affected findings.
* Unsupported financial conclusions must be flagged.
* Arithmetic calculations must be consistent with the structured records.

Evaluation should report observable performance rather than assert an unmeasured accuracy percentage.
13. Meta Hackathon Demonstration
13.1 Demonstration Objective
Show that PayAgent can reason over fragmented visual conversations, reconstruct a changing financial agreement, and explain how new evidence affects its conclusions.
13.2 Demonstration Sequence
Scene 1 — Introduce the problem
A freelancer has several screenshots of a client conversation and is unsure about the final agreed amount.
Scene 2 — Upload conversation evidence
The user uploads screenshots containing an initial project agreement, a promised deposit, and an additional scope request.
Scene 3 — Generate the financial timeline
PayAgent extracts the conversation, reconstructs the agreement, and identifies the original project amount plus accepted modifications.
Scene 4 — Inspect supporting evidence
The user selects a financial finding and views the message that supports it.
Scene 5 — Introduce contradictory evidence
The user uploads another screenshot indicating that the additional work may have been cancelled.
Scene 6 — Reanalyze
PayAgent identifies the new statement, reassesses the affected agreement event, and displays the differences between analysis versions.
Scene 7 — Generate a safe next action
Instead of blindly creating an invoice, the agent either prepares a supported invoice draft or asks for clarification if the final amount remains ambiguous.
Scene 8 — User approval
The user reviews the result and approves the appropriate action.
13.3 Signature Moment
The defining product interaction is:
New evidence changes the AI's understanding of a financial agreement, and the application demonstrates precisely why its conclusion changed.
This should be implemented as a real, repeatable workflow—not a hardcoded presentation.
13.4 Demonstration Data
The demonstration may use staged conversations written specifically for the project, provided they are accurately presented as staged examples.
Real conversation screenshots may also be used where the user has the necessary permission and identifying information has been appropriately protected.
14. Development Priorities
P0 — Required for Meta MVP

* Multi-image conversation upload.
* Visual or OCR-assisted message extraction.
* Structured financial event extraction.
* Agreement reconstruction.
* Evidence-linked findings.
* Chronological financial timeline.
* Contradiction detection.
* Evidence-aware reanalysis.
* Invoice draft generation.
* User review and approval.
* Functional Meta model integration.

P1 — Strong Enhancements

* More precise screenshot highlighting.
* Advanced source comparison.
* Saved analysis history.
* Financial summary dashboard.
* Improved screenshot ordering and overlap detection.
* PDF document support.
* Richer action-planning interface.

P2 — Future Enhancements

* Direct messaging platform integrations.
* Email-based agreement analysis.
* Automated document collection.
* Multi-client financial intelligence.
* Recurring payment monitoring.
* Advanced accounting integrations.
* Organization collaboration.
* Commercial billing and subscriptions.

15. Future Integration Roadmap
Phase 2 — PayPal AI Hackathon
Extend approved financial actions into PayPal Sandbox payment workflows.
Planned additions:

* Approved invoice-to-payment conversion.
* PayPal Sandbox checkout or payment request creation.
* Payment status verification.
* Webhook handling.
* Transaction-to-invoice reconciliation.
* Duplicate-payment prevention.
* AI-assisted payment follow-up recommendations.

The conversation intelligence engine remains responsible for interpreting business context, while PayPal acts as the payment infrastructure.
Phase 3 — Noir × Velo Hackathon
Introduce a separate blockchain payment adapter for supported Stellar Testnet workflows.
Planned additions:

* Velo SDK integration.
* Applicable Noir agent and payment contract interactions.
* Spending authorization controls.
* Testnet escrow workflows.
* Transaction verification.
* Blockchain payment history.
* Agent payment approval and audit trails.

These integrations must remain separate from the core evidence and agreement reconstruction engine.
16. Success Metrics
Product Success

* Users can complete an investigation using only uploaded conversation evidence and minimal clarification.
* Users can inspect the source of significant financial findings.
* The system detects meaningful changes in agreement terms.
* Users can generate an appropriate invoice or clarification request.
* Human corrections and approvals remain traceable.

Technical Success

* Real model inference is used in the analysis workflow.
* Extraction and interpretation are schema-validated.
* Financial calculations are deterministic.
* Reanalysis preserves historical findings.
* Failed operations can be recovered without corrupting approved records.
* Source references remain valid throughout the investigation.

Hackathon Success
The Meta MVP demonstrates a compelling end-to-end workflow that:

1. Accepts messy, unstructured visual input.
2. Produces meaningful financial reasoning.
3. Presents inspectable evidence.
4. Handles contradictory information.
5. Adapts to new context.
6. Produces a useful, user-approved result.

17. Definition of Done
The Meta MVP is complete when a user can:

1. Create an investigation.
2. Upload multiple conversation screenshots.
3. Run the analysis using an eligible Meta model.
4. Review extracted financial information.
5. Inspect a chronological agreement timeline.
6. Select findings and view their supporting sources.
7. Identify contradictory or unverified information.
8. Upload additional evidence.
9. Observe a grounded reanalysis and change summary.
10. Generate and approve an invoice or clarification action.

All ten steps must operate through the actual application workflow.
A visually polished but nonfunctional interface does not satisfy the MVP requirements.
18. Final Product Positioning
Product: Traccoon PayAgent
Category: AI Financial Intelligence and Workflow Automation
Tagline: From conversation to financial clarity.
One-Sentence Description:
Traccoon PayAgent transforms fragmented business conversations into evidence-backed financial agreements, detects discrepancies, and helps users take the right financial actions.
Long-Term Vision:
To create an intelligent financial operations platform that connects everyday business communication, structured agreements, invoicing, payment execution, and reconciliation through trustworthy, human-supervised AI.
Core Product Principle:
Every financial conclusion should be explainable, every important amount should be traceable, and every consequential action should remain under human control.
