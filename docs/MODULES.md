# Admin TSLS OS - Modules Overview

This document provides a breakdown of the 40+ modules found in the `src/modules/` directory. The application uses a modular architecture, where each business domain or feature set is self-contained within its own directory.

## Core Portals (Role-Based Dashboards)
These modules act as the primary layout and dashboard for specific user roles.
- **`portal`**: The main Super Admin portal/layout.
- **`teacher-portal`**: The dedicated portal for teachers to manage their academics.
- **`hrd-portal`**: The HR Department's portal for managing employees and recruitment.
- **`bendahara-portal`**: The Finance (Treasurer) portal for managing invoices and payments.
- **`admin-spmb-portal`**: The portal for the admissions team (SPMB).
- **`cbt-portal`**: The Computer-Based Test portal used for exams.
- **`parents`**: A dedicated portal (or future expansion) for parents.

## Academic & Curriculum Management
- **`academic`**: Core academic functions, likely dealing with grading and academic years.
- **`curriculum`**: Management of subjects and curriculum documents.
- **`classes`**: Management of classroom data and class assignments.
- **`students`**: Student master data and profiles.
- **`attendance`**: Student attendance tracking.
- **`student-journals`**: Daily or periodic tracking of student activities, behaviors, and notes.
- **`schedules`**: Management of class schedules and teacher assignments.
- **`substitutes`**: Management of substitute teacher assignments.
- **`quran`**: Specialized module for tracking Quran memorization, targets, and assessments.
- **`paud`**: Specialized module for Early Childhood Education (PAUD) activities and STPPA assessments.
- **`digital-reports`**: Generation and viewing of e-Rapor (Digital Report Cards).
- **`extracurricular`**: Management of extracurricular programs, attendances, and grades.

## Human Resources (HR)
- **`employees`**: Employee master data, roles, and profiles.
- **`teachers`**: Teacher specific data and functions.
- **`leaves`**: Employee leave requests and balances.
- **`recruitment`**: Job vacancies, applications, and applicant tracking.
- **`pkg`**: Penilaian Kinerja Guru (Teacher Performance Assessment) and SKP (Sasaran Kinerja Pegawai) instruments.

## Finance
- **`finance`**: Core finance module handling invoices, transactions, categories, and school expenses.

## Admissions & Exams
- **`admissions`**: Student enrollment management.

## Asset & Document Management
- **`sarpras`**: (Sarana & Prasarana) Asset management, inventory, procurements, and asset loans.
- **`digital-library`**: Management of library books, categories, and loans.
- **`documents`**: Document storage or repository for the school.
- **`mail`**: Mail system for tracking incoming/outgoing letters and dispositions.

## System & Utilities
- **`auth`**: Authentication pages (Login, Register, Reset Password).
- **`dashboard`**: Core dashboard widgets and analytics.
- **`settings`**: System settings and configuration.
- **`master-data`**: Management of generalized master data entities.
- **`audit-logs`**: System audit trails for tracking user actions.
- **`announcements`**: Broadcast announcements to users.
- **`calendar`**: Academic calendar and event management.
- **`communications`**: Messaging or notification system.
- **`tasks`**: Task management or generic to-do tracking.
- **`reports`**: Generic reporting generation across different modules.

---
*Note: This architecture allows for clean separation of concerns and role-based access control, as each module generally registers its own resources in the Refine configuration.*
