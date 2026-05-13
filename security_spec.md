# Security Specification - CourseCraft: Interactive LMS

## Data Invariants
1. A **Project** must always have an `ownerId` that matches the creator's UID.
2. A **Project**'s `createdAt` and `updatedAt` must be server-timestamped.
3. Only the owner can update or delete their project.
4. Anyone (or at least signed-in users) can view a public project (implied, though we might want to restrict this).
5. **Scores** are recorded upon completion of an interactive element.
6. A **Score** must contain a reference to a `projectId`.
7. Users can only see their own scores. Project owners can see scores for their projects (ABAC).

## The "Dirty Dozen" Payloads (Attacks)

1. **Identity Spoofing**: Attempt to create a project with another person's `ownerId`.
2. **Ghost Field Injection**: Attempt to add `isAdmin: true` to a project document.
3. **Temporal Hijacking**: Attempt to set `createdAt` to a date in the past.
4. **Relational Orphan**: Create a score for a project ID that does not exist.
5. **Update Gap**: Attempt to change `ownerId` of an existing project.
6. **Denial of Wallet**: Attempt to inject 1MB of text into the project `name`.
7. **Privilege Escalation**: Non-owner trying to update the project's `scenes`.
8. **Score Tampering**: Attempt to submit a score with `correctPairs > totalPairs`.
9. **ID Poisoning**: Attempt to create a project with an ID containing illegal characters.
10. **PII Leakage**: Attempt to read all scores in a collection without being the owner or the user.
11. **State Shortcutting**: Skipping the project creation and trying to update a non-existent document.
12. **Recursive Cost Attack**: Forcing the rules to do excessive `get()` calls in a `list` query.

## Test Runner (Conceptual)
The `firestore.rules.test.ts` will verify these denials.

(Detailed test implementation would go here if we had a test runner environment).
