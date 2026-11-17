# StudentCare: Project overview

## 1. Purpose: helping students get from care to claim

StudentCare is a prototype assistant for NUS students like myself who face questions and issues when it comes to care on campus and university insurance claims. Its purpose is to make the administrative side of seeking care and preparing an insurance claim easier to understand.

A student might ask: “I visited a specialist. What should I do next?” The answer may depend on their student category, the date of care, the kind of visit, and the conditions in the university’s insurance documents. Those details are spread across policy overviews, factsheets, claim instructions and facility information.

The problem is more than finding a paragraph in a PDF. Students need to connect information across documents and turn it into practical steps: where to access care, which administrative route may apply, what paperwork to keep, and how to prepare a claim. Missing a condition or using the wrong claim route can create confusion and extra work.

StudentCare combines the student’s profile and concern with the supplied reference documents, then presents a short, organized answer with sources. Its two entry points are **Help with care** and **Help with claim**.

It does NOT diagnose symptoms, recommend treatment, assess medical urgency, or decide whether an insurer will pay a claim.

## 2. How this differs from asking a generic LLM

A generic LLM can also read uploaded PDFs and produce a good answer. StudentCare’s potential value comes from making that capability part of a focused, repeatable student workflow.

| A general chat workflow | StudentCare’s approach |
| --- | --- |
| The student must explain their university and relevant background each time. | A small profile form captures the student categories used by the references. |
| The student must find and attach the right documents. | The supplied NUS reference set is already available to the model. |
| The answer format depends on the prompt. | The interface expects clear next steps, document conditions and source links. |
| The student must check whether citations actually exist. | The server checks the cited document, page and quoted text automatically. |
| Care access and claims may become separate conversations. | The interface supports moving from care guidance to claim preparation with the same profile. |

This is not a guarantee of better reasoning, so a carefully prompted general model with the same documents could produce similar wording. The main product direction is to consistently reduce the effort needed to find the right information, understand conditions and prepare the next actions.
