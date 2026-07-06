# Database Schema Overview

Admin TSLS OS uses Supabase (PostgreSQL) for its backend. This document outlines the high-level schema by grouping the core tables by their functional domain.

*Note: For the exact column definitions, foreign keys, and Row Level Security (RLS) policies, please refer to the SQL files located in the `supabase/` directory of the repository.*

## 1. Authentication & Users
The system leverages Supabase Auth (`auth.users`) for identity management. Custom data and roles are stored in the `public` schema.
- **`public.roles`**: Defines system roles (super_admin, teacher, hr, finance, etc.).
- **`public.user_roles`**: Maps users to their roles.
- **`public.employees`**: (If separated) Master data for staff.

## 2. Academic & Curriculum
- **`subjects`**: List of academic subjects.
- **`curriculum_documents`**: Files and documents associated with curriculum standards.
- **`academic_grades`**: Detailed grading entries for students.
- **`academic_report_cards`**: The Master e-Rapor summarizing a student's grades for a semester.
- **`student_academic_history`**: Historical records of student academic performance.

## 3. Student Tracking
- **`student_journals`**: Daily or periodic logs of student behaviors and activities.
- **`paud_activities`** & **`paud_stppa_assessments`**: Activity tracking and STPPA assessments for Early Childhood Education.
- **`quran_records`**, **`quran_targets`**, **`quran_assessments`**: Tracking for Quran memorization (Tahfidz) and reading progress.

## 4. Extracurriculars
- **`extracurriculars`**: Master list of extracurricular programs.
- **`external_students`**: Registration for non-TSLS students participating in programs.
- **`extracurricular_members`**: Link between students and programs.
- **`extracurricular_attendances`**: Attendance records for activities.
- **`extracurricular_grades`**: Performance grades for extracurricular activities.

## 5. Human Resources (HR)
- **`employee_schedules`**: Working shifts and schedules for staff.
- **`leave_requests`**: Employee leave requests and approval workflows.
- **`pkg_competencies`**, **`pkg_indicators`**, **`pkg_assessments`**: Tables for Penilaian Kinerja Guru (Teacher Performance Assessment).

## 6. Recruitment & CBT System
- **`recruitment_vacancies`**: Job postings.
- **`recruitment_applicants`**: Job applications submitted.
- **`cbt_banks`** & **`cbt_questions`**: Question banks for Computer-Based Tests.
- **`cbt_exams`** & **`cbt_exam_banks`**: Exam sessions and their associated question banks.
- **`cbt_participants`**: Users assigned to take an exam.
- **`cbt_answers`**: Responses submitted by participants.

## 7. Finance
- **`finance_categories`**: Chart of accounts / categorization for finance.
- **`student_invoices`**: Bills issued to students (tuition, fees).
- **`payment_transactions`**: Logs of payments made against invoices.
- **`school_expenses`**: Recording of institutional outgoings.

## 8. Asset & Facility Management (Sarpras)
- **`assets`**: Master list of school inventory.
- **`asset_loans`**: Tracking borrowed assets.
- **`procurements`**: Requests and tracking for new asset purchases.

## 9. Document & Mail Management
- **`digital_library_categories`** & **`digital_library_books`**: Catalog for the school's digital library.
- **`mail_records`**: Tracking incoming and outgoing official letters.
- **`mail_dispositions`**: The routing and actioning of letters within the organization.
