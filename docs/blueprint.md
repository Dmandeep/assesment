# **App Name**: Secure Assessment Gateway

## Core Features:

- Secure User Authentication: Role-based login for administrators and students via Supabase, with public registration disabled for a closed system.
- Exam Creation & Management: Admin tool for creating and managing multiple-choice exams, including questions, options, time limits, and passing scores.
- Timed MCQ Exam Interface: Distraction-free student interface for taking time-bound multiple-choice exams, featuring a prominent real-time countdown timer and automatic progress saving.
- Anti-Cheat & Focus Mode: Integrates mechanisms to detect and flag suspicious student behavior, such as tab switching, window minimization, and disabling browser functionalities (e.g., context menu, copy/paste).
- Secure Submission & Server-Side Grading: Ensures exam result integrity through client-side encryption and server-side grading via Supabase RPC, preventing answer exposure.
- Performance Overview Dashboards: Provides dedicated dashboards for students to review past exam results and for administrators to access assessment analytics and integrity statuses.
- AI-Powered Question Idea Generator Tool: An AI tool to assist administrators by suggesting diverse question ideas and variations based on provided topics and difficulty levels, enhancing exam diversity.

## Style Guidelines:

- Light Mode Primary: A deep and vibrant indigo (#2617CF), embodying security and advanced technology for active elements and branding.
- Light Mode Background: A subtle cool-toned white (#F2F0F8), providing a clean, minimalist canvas with reduced eye strain.
- Light Mode Accent: A bright, clear sky blue (#28BBFF), used for highlights and positive feedback, analogous to the primary color for harmony.
- Light Mode Text: A professional deep charcoal (#2D3748) for primary text, ensuring high readability against the light background.
- Dark Mode Primary: A 'glowing' electric indigo (#B4ACFF), serving as a vibrant focal point against the dark interface.
- Dark Mode Background: A deep space-inspired blue-black (#0F172A) to provide an immersive and low-distraction environment.
- Dark Mode Accent: A luminous sky blue (#7ED0FF), maintaining contrast and indicating interactivity within the dark scheme.
- Dark Mode Text: A soft off-white (#E2E8F0) for optimal readability and reduced eye strain in dark settings.
- 'Inter', a modern sans-serif, chosen for its high legibility and objective feel to minimize cognitive load.
- Use simple, clean, stroke-based icons that align with the minimalist aesthetic and improve signal-to-noise ratio.
- Strict semantic HTML5 is utilized to ensure accessibility, maintain a clear visual hierarchy, and support a mobile-first responsive design across all devices.
- Incorporate smooth transitions (all 0.3s ease) for all interactive elements to enhance perceived performance.
- Implement graceful scroll reveals for content such as exam cards and dashboard metrics, utilizing fade-in and slide-up animations.
- Ensure distinct hover and active states for buttons (subtle lift, scale down) and clear focus rings with label transitions for input fields.
- Animate user flow, including smooth fade-ins for authentication cards and graceful DOM insertion animations for dynamic content in the admin dashboard.
- Design a real-time countdown timer that is visually prominent but avoids anxiety, with subtle pulsing animations only as time nears expiration.