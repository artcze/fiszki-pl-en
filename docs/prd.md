# Product Requirements Document: Polish-to-English Flashcards MVP

## 1. Product summary

The product is a web application for Polish-speaking users learning English. It helps a signed-in user translate one Polish word, choose the intended English meaning, and save that pair as a personal flashcard.

Each flashcard contains exactly one Polish word and one selected English translation. When a Polish word has multiple meanings, the user may create a separate flashcard for each meaning.

## 2. User problem

Language learners often encounter a Polish word and want to capture the English meaning that fits their context. General dictionaries can return too much information, while manual entry introduces friction. The MVP should make creating a focused, personal vocabulary list quick without pretending that every word has several useful translations.

## 3. Target user

The primary user is a Polish-speaking person learning English who wants to build and maintain a private list of simple Polish-to-English vocabulary cards.

The product UI and user-facing messages should be in Polish. Stored vocabulary consists of a Polish source word and an English translation.

## 4. MVP goals

- Allow users to register, sign in, and sign out.
- Restrict the application area to authenticated users.
- Generate sensible English translations for one Polish word.
- Let the user select and confirm exactly one translation.
- Store and manage the user's private flashcards.
- Enforce ownership so users cannot access one another's flashcards.
- Provide a reliable baseline through automated quality checks, a production build, and an end-to-end test of the main flow.

## 5. Primary user flow

1. The user registers or signs in.
2. The user opens the authenticated application area.
3. The user enters one Polish word.
4. The system requests translations.
5. The system returns between one and three unique English translations.
6. The user selects one result.
7. The user confirms creation.
8. The application saves one flashcard to the authenticated user's account.
9. The new flashcard appears in the user's list.
10. The user can later edit or delete it.

## 6. Functional requirements

### 6.1 Authentication

- A visitor can register with the supported Supabase Auth credentials.
- A registered user can sign in and sign out.
- Protected application routes redirect unauthenticated users to sign in.
- Authentication errors are shown in Polish without leaking sensitive implementation details.

### 6.2 Translation generation

- The user submits exactly one non-empty Polish word.
- The system treats Polish as the source language and English as the target language.
- The result contains one to three unique, non-empty English translations.
- If only one sensible translation exists, the system returns one.
- The system never invents or pads results merely to reach three.
- Repeated or equivalent duplicate results are removed after normalization.
- A failed translation request does not create a flashcard and gives the user a recoverable error message.

### 6.3 Flashcard creation

- The user must select one returned translation before confirmation.
- Confirmation creates exactly one flashcard containing the submitted Polish word and selected English translation.
- The server assigns the authenticated user's identity; the client cannot choose flashcard ownership.
- Selecting several meanings requires separate creation actions and produces separate flashcards.

### 6.4 Flashcard management

- A user can list only their own flashcards.
- A user can edit the Polish word and English translation of their own flashcard.
- A user can delete their own flashcard after an explicit user action.
- A user cannot read, update, or delete another user's flashcards.
- Empty Polish or English values cannot be saved.

## 7. Business rules

- One flashcard represents one Polish-to-English meaning pair.
- A translation response has a maximum of three entries, not a target of three entries.
- Translation suggestions are provisional until the user selects and confirms one.
- Generating translations alone never persists a flashcard.
- Flashcards are private and always owned by the authenticated user.
- Ownership must be enforced by database policy, not only by UI filtering.

## 8. Out of scope

- Audio pronunciation
- Phonetic transcription
- Example sentences
- CEFR levels
- Spaced repetition
- Quizzes
- Learning statistics
- Gamification and streaks
- Bulk word import
- PDF or document import
- Native mobile applications
- Sharing flashcards between users

## 9. Acceptance criteria

The MVP is complete when all of the following are true:

1. A new user can register and then access the authenticated application area.
2. An existing user can sign in and sign out.
3. An unauthenticated visitor cannot access protected flashcard functionality.
4. Submitting one valid Polish word produces one to three unique English translations.
5. A response with one sensible translation remains a one-item response.
6. The user can select one translation and save exactly one flashcard.
7. The saved record contains one Polish word, one English translation, and the authenticated user's ID.
8. The user can list, edit, and delete their flashcards.
9. Database RLS prevents cross-user reads and writes, including requests that bypass the UI.
10. Invalid input and provider failures return clear Polish errors without persisting partial data.
11. At least one automated end-to-end test covers sign-in, translation selection, flashcard creation, listing, editing, and deletion, using a controlled translation-provider response.
12. CI installs dependencies, generates Astro types, runs quality checks and tests, and completes the production build.

## 10. Success criteria for the first release

- The primary flow can be completed without manual database intervention.
- No known ownership-isolation defect exists.
- The end-to-end main-flow test passes consistently.
- Lint/static checks and the production build pass in CI.
- No out-of-scope feature is required to use the core flashcard workflow.

