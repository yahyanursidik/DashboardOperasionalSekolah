import { Refine, Authenticated } from "@refinedev/core";
import { BrowserRouter, Route, Routes, Outlet } from "react-router-dom";
import routerBindings, { CatchAllNavigate, NavigateToResource } from "@refinedev/react-router-v6";
import { authProvider } from "../lib/supabase/auth-provider";
import { dataProvider } from "./providers/dataProvider";
import { LoginPage } from "../modules/auth/LoginPage";
import { AdminLayout } from "../components/layout/AdminLayout";
import { AuthLayout } from "../components/layout/AuthLayout";

import { Toaster } from "sonner";
import { NetworkDetector } from "../components/common/NetworkDetector";

import { accessControlProvider } from "./providers/accessControlProvider";
import { auditLogProvider } from "./providers/auditLogProvider";
import { UnitProvider } from "./providers/UnitProvider";
import { AcademicYearProvider } from "./providers/AcademicYearProvider";
import { ThemeProvider } from "./providers/ThemeProvider";
import { SettingsProvider } from "./providers/SettingsProvider";

import { StudentsList, StudentCreate, StudentEdit, StudentShow } from "../modules/students";
import { TeachersList, TeacherCreate, TeacherEdit, TeacherShow } from "../modules/teachers";
import { ClassesList, ClassCreate, ClassEdit, ClassShow } from "../modules/classes";
import { ParentsList, ParentCreate, ParentEdit, ParentShow } from "../modules/parents";
import { TasksList, TaskCreate, TaskEdit, TaskShow } from "../modules/tasks";
import { AttendanceSelector, AttendanceInput, AttendanceReports } from "../modules/attendance";
import { DocumentsList, DocumentTypesList, DocumentCreate, DocumentShow } from "../modules/documents";
import { AnnouncementsList, AnnouncementCreate, AnnouncementEdit, AnnouncementShow } from "../modules/announcements";
import { AuditLogsList } from "../modules/audit-logs";
import { ReportsDashboard, StudentReport, AttendanceReport, DocumentReport, TaskReport, ReportEmployeeAttendance, ReportLeaves, VisualAnalytics } from "../modules/reports";

import { EmployeesList, EmployeeCreate, EmployeeEdit } from "../modules/employees";
import { EmployeeAttendanceList } from "../modules/attendance/pages/employee-attendance";
import { SchedulesList, ScheduleCreate, ScheduleEdit } from "../modules/schedules";
import { LeavesList, LeaveCreate, LeaveShow } from "../modules/leaves";
import { SubstitutesList, SubstituteCreate, SubstituteEdit } from "../modules/substitutes";
import { DashboardPage } from "../modules/dashboard";
import { MasterDataDashboard } from "../modules/master-data";
import { SettingsPage } from "../modules/settings";
import { StudentMassPromotion } from "../modules/students/pages/mass-promotion";
import { CommunicationsPage } from "../modules/communications";
import { StudentJournalsList, StudentJournalCreate, StudentJournalEdit } from "../modules/student-journals/pages";
import { FinanceDashboard, InvoicesList, PaymentVerifications, SchoolExpenses, FinanceCategories, SpmbFeesConfig } from "../modules/finance/pages";
import { CurriculumDashboard } from "../modules/curriculum/dashboard";
import { SubjectsList, SubjectCreate, SubjectEdit } from "../modules/curriculum/subjects";
import { CurriculumDocumentsList, CurriculumDocumentCreate } from "../modules/curriculum/documents";
import { MailDashboard, IncomingMailList, OutgoingMailList, DispositionsList, IncomingMailCreate, OutgoingMailCreate } from "../modules/mail";
import { RecruitmentDashboard, VacanciesList, ApplicantsList, ApplicantShow, VacancyCreate, ApplicantCreate } from "../modules/recruitment";
import { AdmissionsDashboard, AdmissionsSettings, AdmissionsReports, ApplicantsList as AdmissionsApplicantsList, ApplicantShow as AdmissionsApplicantShow } from "../modules/admissions/pages";
import { AcademicDashboard, Gradebook, ReportCards, ReportPrint } from "../modules/academic";
import { SarprasDashboard, AssetsList, AssetLoansList, ProcurementsList } from "../modules/sarpras";
import { AcademicCalendar } from "../modules/calendar";
import { 
  QuranRecordsList, QuranRecordForm, 
  QuranTargetsList, QuranTargetForm,
  QuranAssessmentsList, QuranAssessmentForm
} from "../modules/quran";

import {
  PaudActivitiesList, PaudActivityForm,
  StppaAssessmentsList, StppaAssessmentForm
} from "../modules/paud";

import { PortalLayout } from "../modules/portal/portal-layout";
import { PortalLogin } from "../modules/portal/portal-login";
import { PortalDashboard } from "../modules/portal/portal-dashboard";
import { PortalFinance } from "../modules/portal/portal-finance";
import { PortalAcademic } from "../modules/portal/portal-academic";
import { PortalJournals } from "../modules/portal/portal-journals";
import { PortalQuran } from "../modules/portal/portal-quran";
import { PortalPaud } from "../modules/portal/portal-paud";
import { SpmbLayout, SpmbDashboard, SpmbForm, SpmbDocuments, SpmbAnnouncement, SpmbLogin, SpmbRegister, SpmbChecklist, SpmbPayment } from "../modules/admissions/portal";

import { TeacherLayout } from "../modules/teacher-portal/teacher-layout";
import { TeacherLogin } from "../modules/teacher-portal/teacher-login";
import { TeacherDashboard } from "../modules/teacher-portal/teacher-dashboard";
import { TeacherClasses } from "../modules/teacher-portal/teacher-classes";
import { TeacherJournals } from "../modules/teacher-portal/teacher-journals";
import { TeacherLeaves } from "../modules/teacher-portal/teacher-leaves";
import { TeacherQuran } from "../modules/teacher-portal/teacher-quran";
import { TeacherPaud } from "../modules/teacher-portal/teacher-paud";

import { BendaharaLayout, BendaharaLogin } from "../modules/bendahara-portal";

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <SettingsProvider>
          <Refine
        authProvider={authProvider}
        dataProvider={dataProvider}
        accessControlProvider={accessControlProvider}
        auditLogProvider={auditLogProvider}
        routerProvider={routerBindings}
        resources={[
          {
            name: "students",
            list: "/students",
            create: "/students/create",
            edit: "/students/edit/:id",
            show: "/students/show/:id",
            meta: {
              canDelete: true,
            },
          },
          {
            name: "parents",
            list: "/parents",
            create: "/parents/create",
            edit: "/parents/edit/:id",
            show: "/parents/show/:id",
            meta: {
              canDelete: true,
            },
          },
          {
            name: "student_journals",
            list: "/student-journals",
            create: "/student-journals/create",
            edit: "/student-journals/edit/:id",
            show: "/student-journals/show/:id",
            meta: {
              canDelete: true,
            },
          },
          {
            name: "quran_records",
            list: "/quran",
            create: "/quran/create",
            edit: "/quran/edit/:id",
            show: "/quran/show/:id",
            meta: {
              canDelete: true,
            },
          },
          {
            name: "quran_targets",
            list: "/quran-targets",
            create: "/quran-targets/create",
            edit: "/quran-targets/edit/:id",
            meta: {
              canDelete: true,
            },
          },
          {
            name: "quran_assessments",
            list: "/quran-assessments",
            create: "/quran-assessments/create",
            edit: "/quran-assessments/edit/:id",
            meta: {
              canDelete: true,
            },
          },
          {
            name: "paud_activities",
            list: "/paud-activities",
            create: "/paud-activities/create",
            edit: "/paud-activities/edit/:id",
            meta: {
              canDelete: true,
            },
          },
          {
            name: "paud_stppa_assessments",
            list: "/stppa-assessments",
            create: "/stppa-assessments/create",
            edit: "/stppa-assessments/edit/:id",
            meta: {
              canDelete: true,
            },
          },
          {
            name: "student_invoices",
            list: "/finance/invoices",
            meta: { label: "Tagihan Siswa" }
          },
          {
            name: "payment_transactions",
            list: "/finance/verifications",
            meta: { label: "Verifikasi Transfer" }
          },
          {
            name: "school_expenses",
            list: "/finance/expenses",
            meta: { label: "Buku Kas Keluar" }
          },
          {
            name: "finance_categories",
            list: "/finance/categories",
            meta: { label: "Kategori Keuangan" }
          },
          {
            name: "teachers",
            list: "/teachers",
            create: "/teachers/create",
            edit: "/teachers/edit/:id",
            show: "/teachers/show/:id",
            meta: {
              canDelete: true,
            },
          },
          {
            name: "classes",
            list: "/classes",
            create: "/classes/create",
            edit: "/classes/edit/:id",
            show: "/classes/show/:id",
            meta: {
              canDelete: true,
            },
          },
          {
            name: "admin_tasks",
            list: "/tasks",
            create: "/tasks/create",
            edit: "/tasks/edit/:id",
            show: "/tasks/show/:id",
            meta: {
              canDelete: true,
            },
          },
          {
            name: "attendance_records",
            list: "/attendance",
            meta: { canDelete: false },
          },
          {
            name: "document_types",
            list: "/document-types",
            meta: { canDelete: true },
          },
          {
            name: "documents",
            list: "/documents",
            create: "/documents/create",
            show: "/documents/show/:id",
            meta: { canDelete: true },
          },
          {
            name: "announcements",
            list: "/announcements",
            create: "/announcements/create",
            edit: "/announcements/edit/:id",
            show: "/announcements/show/:id",
            meta: { canDelete: true },
          },
          {
            name: "audit_logs",
            list: "/audit-logs",
            meta: { canDelete: false },
          },
          {
            name: "reports",
            list: "/reports",
            meta: { canDelete: false },
          },
          {
            name: "student_academic_history",
            meta: { canDelete: true },
          },
          {
            name: "employees",
            list: "/employees",
            create: "/employees/create",
            edit: "/employees/edit/:id",
            meta: { canDelete: true },
          },
          {
            name: "employee_attendance",
            list: "/employee-attendance",
            meta: { canDelete: false },
          },
          {
            name: "employee_schedules",
            list: "/schedules",
            create: "/schedules/create",
            edit: "/schedules/edit/:id",
            meta: { canDelete: true },
          },
          {
            name: "leave_requests",
            list: "/leaves",
            create: "/leaves/create",
            show: "/leaves/show/:id",
            meta: { canDelete: true },
          },
          {
            name: "substitutes",
            list: "/substitutes",
            create: "/substitutes/create",
            edit: "/substitutes/edit/:id",
          },
          {
            name: "subjects",
            list: "/curriculum/subjects",
            create: "/curriculum/subjects/create",
            edit: "/curriculum/subjects/edit/:id",
          },
          {
            name: "curriculum_documents",
            list: "/curriculum/documents",
            create: "/curriculum/documents/create",
          },
          {
            name: "units",
            meta: { canDelete: true },
          },
          {
            name: "academic_years",
            meta: { canDelete: true },
          },
          {
            name: "semesters",
            meta: { canDelete: true },
          },
          {
            name: "mail_records",
            list: "/mail",
            create: "/mail/incoming/create",
            meta: { canDelete: true },
          },
          {
            name: "mail_dispositions",
            meta: { canDelete: true },
          },
          {
            name: "recruitment_vacancies",
            list: "/recruitment/vacancies",
            create: "/recruitment/vacancies/create",
            meta: { canDelete: true },
          },
          {
            name: "recruitment_applicants",
            list: "/recruitment/applicants",
            create: "/recruitment/applicants/create",
            show: "/recruitment/applicants/show/:id",
            meta: { canDelete: true },
          },
          {
            name: "admissions",
            list: "/admissions",
            meta: { label: "SPMB" }
          },
          {
            name: "admissions_applicants",
            list: "/admissions/applicants",
            show: "/admissions/applicants/:id",
            meta: { label: "Data Pendaftar", parent: "admissions" }
          },
          {
            name: "academic_grades",
            list: "/academic/gradebook",
            meta: { canDelete: false },
          },
          {
            name: "academic_report_cards",
            list: "/academic/reports",
            meta: { canDelete: false },
          },
          {
            name: "assets",
            list: "/sarpras/assets",
            meta: { canDelete: true },
          },
          {
            name: "asset_loans",
            list: "/sarpras/asset-loans",
            meta: { canDelete: true },
          },
          {
            name: "procurements",
            list: "/sarpras/procurements",
            meta: { canDelete: true },
          },
        ]}
        options={{
          syncWithLocation: true,
          warnWhenUnsavedChanges: true,
        }}
      >
        <AcademicYearProvider>
          <UnitProvider>
            <Routes>
              <Route
                element={
                  <Authenticated
                    key="authenticated-inner"
                    fallback={<CatchAllNavigate to="/login" />}
                  >
                    <AdminLayout />
                  </Authenticated>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="/master-data" element={<MasterDataDashboard />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/communications" element={<CommunicationsPage />} />
                
                <Route path="/students">
                <Route index element={<StudentsList />} />
                <Route path="create" element={<StudentCreate />} />
                <Route path="edit/:id" element={<StudentEdit />} />
                <Route path="show/:id" element={<StudentShow />} />
                <Route path="mass-promotion" element={<StudentMassPromotion />} />
              </Route>

              <Route path="/parents">
                <Route index element={<ParentsList />} />
                <Route path="create" element={<ParentCreate />} />
                <Route path="edit/:id" element={<ParentEdit />} />
                <Route path="show/:id" element={<ParentShow />} />
              </Route>

              <Route path="/teachers">
                  <Route index element={<TeachersList />} />
                  <Route path="create" element={<TeacherCreate />} />
                  <Route path="edit/:id" element={<TeacherEdit />} />
                  <Route path="show/:id" element={<TeacherShow />} />
                </Route>

                <Route path="classes">
                  <Route index element={<ClassesList />} />
                  <Route path="create" element={<ClassCreate />} />
                  <Route path="edit/:id" element={<ClassEdit />} />
                  <Route path="show/:id" element={<ClassShow />} />
                </Route>

                <Route path="tasks">
                  <Route index element={<TasksList />} />
                  <Route path="create" element={<TaskCreate />} />
                  <Route path="edit/:id" element={<TaskEdit />} />
                  <Route path="show/:id" element={<TaskShow />} />
                </Route>

                <Route path="attendance">
                  <Route index element={<AttendanceSelector />} />
                  <Route path="class/:classId" element={<AttendanceInput />} />
                  <Route path="employees" element={<EmployeeAttendanceList />} />
                  <Route path="reports" element={<AttendanceReports />} />
                </Route>

                <Route path="employees">
                  <Route index element={<EmployeesList />} />
                  <Route path="create" element={<EmployeeCreate />} />
                  <Route path="edit/:id" element={<EmployeeEdit />} />
                </Route>

                <Route path="schedules">
                  <Route index element={<SchedulesList />} />
                  <Route path="create" element={<ScheduleCreate />} />
                  <Route path="edit/:id" element={<ScheduleEdit />} />
                </Route>

                <Route path="leaves">
                  <Route index element={<LeavesList />} />
                  <Route path="create" element={<LeaveCreate />} />
                  <Route path="show/:id" element={<LeaveShow />} />
                </Route>

                <Route path="substitutes">
                  <Route index element={<SubstitutesList />} />
                  <Route path="create" element={<SubstituteCreate />} />
                  <Route path="edit/:id" element={<SubstituteEdit />} />
                </Route>

                <Route path="document-types">
                  <Route index element={<DocumentTypesList />} />
                </Route>

                <Route path="documents">
                  <Route index element={<DocumentsList />} />
                  <Route path="create" element={<DocumentCreate />} />
                  <Route path="show/:id" element={<DocumentShow />} />
                </Route>

                <Route path="announcements">
                  <Route index element={<AnnouncementsList />} />
                  <Route path="create" element={<AnnouncementCreate />} />
                  <Route path="edit/:id" element={<AnnouncementEdit />} />
                  <Route path="show/:id" element={<AnnouncementShow />} />
                </Route>

                <Route path="audit-logs">
                  <Route index element={<AuditLogsList />} />
                </Route>

                <Route path="reports">
                  <Route index element={<ReportsDashboard />} />
                  <Route path="analytics" element={<VisualAnalytics />} />
                  <Route path="students" element={<StudentReport />} />
                  <Route path="attendance" element={<AttendanceReport />} />
                  <Route path="documents" element={<DocumentReport />} />
                  <Route path="tasks" element={<TaskReport />} />
                  <Route path="employee-attendance" element={<ReportEmployeeAttendance />} />
                <Route path="leaves" element={<ReportLeaves />} />
              </Route>

              <Route path="/calendar">
                <Route index element={<AcademicCalendar />} />
              </Route>

              <Route path="/student-journals">
                  <Route index element={<StudentJournalsList />} />
                  <Route path="create" element={<StudentJournalCreate />} />
                  <Route path="edit/:id" element={<StudentJournalEdit />} />
                </Route>

                <Route path="/quran">
                  <Route index element={<QuranRecordsList />} />
                  <Route path="create" element={<QuranRecordForm />} />
                  <Route path="edit/:id" element={<QuranRecordForm />} />
                </Route>
                <Route path="/quran-targets">
                  <Route index element={<QuranTargetsList />} />
                  <Route path="create" element={<QuranTargetForm />} />
                  <Route path="edit/:id" element={<QuranTargetForm />} />
                </Route>
                <Route path="/quran-assessments">
                  <Route index element={<QuranAssessmentsList />} />
                  <Route path="create" element={<QuranAssessmentForm />} />
                  <Route path="edit/:id" element={<QuranAssessmentForm />} />
                </Route>

                <Route path="/paud-activities">
                  <Route index element={<PaudActivitiesList />} />
                  <Route path="create" element={<PaudActivityForm />} />
                  <Route path="edit/:id" element={<PaudActivityForm />} />
                </Route>
                <Route path="/stppa-assessments">
                  <Route index element={<StppaAssessmentsList />} />
                  <Route path="create" element={<StppaAssessmentForm />} />
                  <Route path="edit/:id" element={<StppaAssessmentForm />} />
                </Route>

                <Route path="/curriculum">
                  <Route index element={<CurriculumDashboard />} />
                  <Route path="subjects">
                    <Route index element={<SubjectsList />} />
                    <Route path="create" element={<SubjectCreate />} />
                    <Route path="edit/:id" element={<SubjectEdit />} />
                  </Route>
                  <Route path="documents">
                    <Route index element={<CurriculumDocumentsList />} />
                    <Route path="create" element={<CurriculumDocumentCreate />} />
                  </Route>
                </Route>

                <Route path="/finance">
                  <Route index element={<FinanceDashboard />} />
                  <Route path="invoices" element={<InvoicesList />} />
                  <Route path="verifications" element={<PaymentVerifications />} />
                  <Route path="expenses" element={<SchoolExpenses />} />
                  <Route path="categories" element={<FinanceCategories />} />
                  <Route path="spmb-fees" element={<SpmbFeesConfig />} />
                </Route>

                <Route path="/mail">
                  <Route index element={<MailDashboard />} />
                  <Route path="incoming" element={<IncomingMailList />} />
                  <Route path="incoming/create" element={<IncomingMailCreate />} />
                  <Route path="outgoing" element={<OutgoingMailList />} />
                  <Route path="outgoing/create" element={<OutgoingMailCreate />} />
                  <Route path="dispositions" element={<DispositionsList />} />
                </Route>

                <Route path="/recruitment">
                  <Route index element={<RecruitmentDashboard />} />
                  <Route path="vacancies" element={<VacanciesList />} />
                  <Route path="vacancies/create" element={<VacancyCreate />} />
                  <Route path="applicants" element={<ApplicantsList />} />
                  <Route path="applicants/create" element={<ApplicantCreate />} />
                  <Route path="applicants/show/:id" element={<ApplicantShow />} />
                </Route>

                <Route path="/admissions">
                  <Route index element={<AdmissionsDashboard />} />
                  <Route path="settings" element={<AdmissionsSettings />} />
                  <Route path="reports" element={<AdmissionsReports />} />
                  <Route path="applicants" element={<AdmissionsApplicantsList />} />
                  <Route path="applicants/:id" element={<AdmissionsApplicantShow />} />
                </Route>

                <Route path="/academic">
                  <Route index element={<AcademicDashboard />} />
                  <Route path="gradebook" element={<Gradebook />} />
                  <Route path="reports" element={<ReportCards />} />
                  <Route path="report-print" element={<ReportPrint />} />
                </Route>

                <Route path="/sarpras">
                  <Route index element={<SarprasDashboard />} />
                  <Route path="assets" element={<AssetsList />} />
                  <Route path="asset-loans" element={<AssetLoansList />} />
                  <Route path="procurements" element={<ProcurementsList />} />
                </Route>

              </Route>
              <Route
                element={
                  <Authenticated key="authenticated-outer" fallback={<Outlet />}>
                    <NavigateToResource />
                  </Authenticated>
                }
              >
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<LoginPage />} />
                </Route>
              </Route>
              
              <Route path="/portal/login" element={<PortalLogin />} />
              <Route path="/portal" element={<PortalLayout />}>
                <Route index element={<PortalDashboard />} />
                <Route path="finance" element={<PortalFinance />} />
                <Route path="academic" element={<PortalAcademic />} />
                <Route path="quran" element={<PortalQuran />} />
                <Route path="paud" element={<PortalPaud />} />
                <Route path="journals" element={<PortalJournals />} />
              </Route>

              <Route path="/spmb" element={<SpmbLayout />}>
                <Route index element={<SpmbDashboard />} />
                <Route path="login" element={<SpmbLogin />} />
                <Route path="register" element={<SpmbRegister />} />
                <Route path="form" element={<SpmbForm />} />
                <Route path="documents" element={<SpmbDocuments />} />
                <Route path="checklist" element={<SpmbChecklist />} />
                <Route path="payment" element={<SpmbPayment />} />
                <Route path="announcement" element={<SpmbAnnouncement />} />
              </Route>

              <Route path="/teacher/login" element={<TeacherLogin />} />
              <Route path="/teacher" element={<TeacherLayout />}>
                <Route index element={<TeacherDashboard />} />
                <Route path="classes" element={<TeacherClasses />} />
                <Route path="quran" element={<TeacherQuran />} />
                <Route path="paud" element={<TeacherPaud />} />
                <Route path="journals" element={<TeacherJournals />} />
                <Route path="leaves" element={<TeacherLeaves />} />
              </Route>

              <Route path="/bendahara/login" element={<BendaharaLogin />} />
              <Route path="/bendahara" element={<BendaharaLayout />}>
                <Route index element={<FinanceDashboard />} />
                <Route path="invoices" element={<InvoicesList />} />
                <Route path="verifications" element={<PaymentVerifications />} />
                <Route path="expenses" element={<SchoolExpenses />} />
                <Route path="students" element={<StudentsList />} />
                <Route path="categories" element={<FinanceCategories />} />
              </Route>

            </Routes>
          </UnitProvider>
        </AcademicYearProvider>
      </Refine>
      </SettingsProvider>
      </ThemeProvider>
      <Toaster position="top-center" richColors closeButton />
      <NetworkDetector />
    </BrowserRouter>
  );
}
