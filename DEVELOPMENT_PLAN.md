# StudentCare development plan

This plan kept on updating as Codex wrote the code.

## Current architecture revision

The user requested full-document model-written guidance, replacing the initial rule-ID-only prototype. The implementation now sends all extracted PDF pages and source metadata on each Gemini request. Curated rules remain optional context, not an output catalog. 

## Implemented flow

1. Validate the profile/request, consent, origin and body size; apply a demo rate limit.
2. Handle explicit immediate help and medical advice boundaries without an LLM.
3. Pass unknown profile facts and unknown case types to Gemini as unknowns, allowing targeted questions and supported conditional guidance.
4. Supply the entire page-addressable corpus (ten PDFs, 32 pages), hashed manifest and optional rules as JSON text context.
5. Use JSON MIME output with the answer-format schema in the prompt (no provider-enforced schema, following a reproduced HTTP 400 rejection). Request model-written overview, care access, next steps, conditional document checklist, questions and limitations in structured JSON. Every substantive item includes exact quoted evidence with source ID and physical page.
6. Validate response shape, page existence, quoted passage presence and checklist conditions. Never display arbitrary uncited policy prose.
7. Render clear sections, source excerpts/PDF links and interactive checklist progress. Store personal state only in tab memory; edits invalidate results.

## Scope boundaries

No database, accounts, persistent health records, reimbursement guarantee, live panel directory or clinical triage. UHC remains the project-configured prototype panel option, not verified insurer membership. No personal upload handling in this iteration.

Stretch: only after grounded-answer review, add consented transient PDF/image presence/legibility checks with strict file/page limits and deletion behavior. Never certify authenticity, interpret clinical results or approve claims.
