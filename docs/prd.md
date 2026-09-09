# Product Requirements Document: Secure Assessment Gateway

## 1. Executive Summary
The **Secure Assessment Gateway** is a high-integrity, multiple-choice examination platform designed for closed educational or corporate environments. It prioritizes security, anti-cheat mechanisms, and streamlined administrative workflows through AI-assisted content generation and a "Zero-Trust" data architecture.

## 2. User Personas
### 2.1. System Administrator
- **Goals**: Create secure assessments, manage the user roster, and audit student performance and integrity.
- **Needs**: Stable authoring tools, AI-powered question suggestions, and full control over user identities.

### 2.2. Student
- **Goals**: Complete assigned assessments within time limits and review past performance.
- **Needs**: A distraction-free, reliable exam interface and immediate feedback on attempt status.

## 3. Core Features

### 3.1. Secure Authentication & Role Management
- **Role-Based Access Control (RBAC)**: Distinct dashboards for Admins and Students.
- **System Roster**: Admin-only tool to provision users and edit any profile element (Username, Role).
- **Private Registration**: Controlled identity creation to maintain a closed system.

### 3.2. Administrator Dashboard
- **System Overview**: High-level metrics showing active exams, total users, and integrity alerts.
- **Assessment Vault**: Centralized management (view/delete) of all published exams.
- **Exam Builder**: 
    - Manual authoring of MCQ questions.
    - AI-powered "Idea Lab" to generate questions based on topics.
    - Configurable time limits and passing scores.
- **Audit Logs**: Real-time tracking of exam attempts and "Integrity Status" markers.

### 3.3. Student Portal
- **Session Portal**: View available assessments with clear time-limit badges.
- **Performance History**: Review past scores and integrity standing.
- **Session Security**: Visual indicators of active focus-tracking.

### 3.4. High-Integrity Exam Interface
- **Secure Proctoring**: Automatic full-screen request and tab-focus tracking.
- **Anti-Cheat Logic**: Sessions are flagged if the user minimizes the window or switches tabs.
- **Zero-Trust Grading**: Answer keys are stored in restricted collections; grading logic is separated from the client-side view.
- **Timed Sessions**: Real-time countdown timer with automatic submission on expiration.

## 4. Technical Architecture
- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS.
- **UI Components**: Shadcn UI (Radix Primitives), Lucide Icons.
- **Backend-as-a-Service**: Firebase (Firestore, Authentication, Hosting).
- **AI Integration**: Genkit with Google Gemini 2.5 Flash for question generation.
- **Theming**: Dark and Light mode support via `next-themes`.

## 5. Security Strategy: "The Split-Collection Model"
To prevent client-side answer peeking, the system uses two parallel sub-collections:
1. `/exams/{id}/questions`: Publicly readable prompts and options.
2. `/exams/{id}/answers`: Admin-only restricted collection containing the correct indices.

## 6. UI/UX Guidelines
- **Color Palette**: Indigo (#2617CF) for primary actions, Sky Blue (#28BBFF) for accents.
- **Animations**: Smooth "reveal-up" transitions for dashboard elements.
- **Responsiveness**: Mobile-first design ensuring compatibility across devices.

## 7. Roadmap & Future Enhancements
- **Automated Grading Service**: Server-side cloud function to calculate final scores.
- **Rich Media Questions**: Support for image and video-based prompts.
- **Advanced Proctoring**: Webcam identity verification and browser lockdown API integration.
