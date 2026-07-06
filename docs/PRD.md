# Product Requirements Document (PRD)

## 1. Project Overview
**Admin TSLS OS** (Tunas Sejati Leadership School Operating System) is a comprehensive web-based administrative panel designed to manage all operations of an educational institution. It provides specialized portals and modules tailored for different stakeholders, ranging from academic grading and curriculum management to HR, finance, and asset management.

## 2. Target Audience
The system serves multiple user roles, each with specific permissions and customized dashboards:
- **Super Administrator**: Full system access to configure settings, manage master data, and oversee all operations.
- **HR (Human Resources)**: Manages employees, recruitment, leave requests, and performance assessments (SKP/PKG).
- **Teachers (Guru)**: Accesses academic modules to grade students, manage classes, record attendance, track student journals, and view their teaching schedules.
- **Finance (Bendahara)**: Handles student invoices, school expenses, payment transactions, and financial reporting.
- **Admissions (SPMB)**: Manages student enrollment, CBT (Computer-Based Test) exams for recruitment/admissions, and applicant data.
- **Students / Parents**: (Through specific portals or future expansions) Access academic records, library, and extracurricular progress.

## 3. Core Capabilities & Domains

### 3.1. Academic & Curriculum
- **Master Data**: Subjects, classes, curriculum documents.
- **Grading (e-Rapor)**: Academic grades, report cards, and student academic history.
- **Student Journals**: Tracking daily student activities and behaviors.
- **Schedules**: Teacher and student schedules, substitute teacher assignments.
- **Specialized Academics**: Quran memorization/progress tracking, PAUD (early childhood) activities and STPPA assessments.

### 3.2. Extracurricular & Activities
- Management of extracurricular programs.
- Tracking members (internal and external students).
- Attendance and grading for extracurricular activities.

### 3.3. Human Resources & Recruitment
- **Employee Management**: Profiles, roles, schedules, and PKG/SKP performance instruments.
- **Leave Requests**: Managing employee leave balances and requests.
- **Recruitment**: Managing job vacancies, applicants, and CBT exams for screening.

### 3.4. Finance (Bendahara)
- Invoicing for students (tuition, fees).
- Tracking payment transactions.
- Recording school expenses and managing finance categories.

### 3.5. Asset & Document Management
- **Sarpras**: Managing school assets, procurements, and asset loans.
- **Digital Library**: Books, categories, and potentially loans/reading history.
- **Mail System**: Tracking incoming/outgoing letters and mail dispositions.

## 4. Technical Requirements
- **Frontend**: React, TypeScript, Vite.
- **Styling**: TailwindCSS.
- **Framework**: Refine (React-based framework for data-intensive applications).
- **Backend & Database**: Supabase (PostgreSQL, Authentication, Row Level Security).
- **Deployment**: Configured for Netlify/Vercel.

## 5. Security & Access Control
- **Authentication**: Powered by Supabase Auth (Email/Password).
- **Authorization**: Role-Based Access Control (RBAC) enforced via Supabase Row Level Security (RLS) policies and frontend route guards.
