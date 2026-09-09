# Secure Assessment Gateway: Application Blueprint Prompt

This document serves as a comprehensive prompt to recreate or version the **Secure Assessment Gateway**, a high-integrity examination platform.

## 1. Core Concept & Vision
Build a "Zero-Trust" multiple-choice examination platform where security and academic integrity are paramount. The system must support two distinct roles: **Administrators** (proctors/creators) and **Students** (examinees).

## 2. Technical Stack
- **Framework**: Next.js 15 (App Router) with React 19.
- **Styling**: Tailwind CSS with ShadCN UI components. Theme: Indigo primary (#2617CF) and Sky Blue accents.
- **Backend**: Firebase (Authentication and Firestore).
- **AI Engine**: Genkit with Google Gemini 2.5 Flash.
- **Features**: Real-time data syncing, serverless architecture, and proctored UI.

## 3. Data Architecture (Zero-Trust Model)
Implement a split-collection strategy to prevent client-side "peeking" at answers:
- `/exams/{examId}/questions`: Publicly accessible (question text and options).
- `/exams/{examId}/answers`: Admin-only access (contains `correctOptionIndex`).
- `/users/{userId}/results`: Stores attempts, score, and proctoring integrity markers.

## 4. Key Features & Workflows

### 4.1 Administrator Dashboard
- **Identity Roster**: Provision student accounts, edit usernames, and audit roles.
- **Exam Builder**: 
    - **Bulk Import**: Support CSV uploads (headers: questionText, option1...option4, correctIndex).
    - **AI Attachments**: Use Gemini to parse PDF, DOCX, or Images into structured questions.
    - **Idea Lab**: AI-powered prompt to generate question variations by topic.
- **Audit Logs**: 
    - Real-time list of all student attempts.
    - Filters for **Outcome** (Pass/Fail based on score vs. threshold), **Integrity Status** (Clean/Flagged), and **Search**.
    - Bulk grading tool to compute scores across all pending results.

### 4.2 Student Portal
- **Identity Management**: Students can update their display name (username).
- **Session Portal**: Searchable list of published assessments with time-limit badges.
- **History**: Review past scores and performance breakdowns.

### 4.3 High-Integrity Exam Interface
- **Fullscreen Protocol**: Mandatory fullscreen request on start.
- **Tab-Focus Tracking**: Detect and flag "Integrity Status" if the user switches tabs or minimizes the window.
- **Navigation**: Support bidirectional movement (Next/Previous) with real-time response syncing to Firestore.
- **Auto-Submit**: Automatic finalization of session when the countdown reaches zero.

## 5. Security Rules Logic
- Students can only read their own profile and results.
- Students can read exam metadata and questions but **never** the `/answers` collection.
- Admins have full CRUD across all collections.
- Use a dedicated `/admin_roles/` collection to verify administrative claims.

## 6. UI/UX Requirements
- **Transitions**: Use "reveal-up" animations for dashboard cards.
- **Feedback**: Extensive use of Toasts for errors and success messages.
- **Loading States**: Robust pre-hydration loading shells to prevent SVG mismatches.
