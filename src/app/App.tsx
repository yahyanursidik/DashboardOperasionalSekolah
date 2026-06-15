import { Refine, Authenticated } from "@refinedev/core";
import { BrowserRouter, Route, Routes, Outlet } from "react-router-dom";
import routerBindings, { CatchAllNavigate, NavigateToResource } from "@refinedev/react-router-v6";
import { authProvider } from "../lib/supabase/auth-provider";
import { dataProvider } from "./providers/dataProvider";
import { LoginPage } from "../modules/auth/LoginPage";
import { AdminLayout } from "../components/layout/AdminLayout";
import { AuthLayout } from "../components/layout/AuthLayout";


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
import { ReportsDashboard, StudentReport, AttendanceReport, DocumentReport, TaskReport, ReportEmployeeAttendance, ReportLeaves } from "../modules/reports";

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
import { FinanceDashboard, InvoicesList, PaymentVerifications, SchoolExpenses, FinanceCategories } from "../modules/finance/pages";
import { CurriculumDashboard } from "../modules/curriculum/dashboard";
import { SubjectsList, SubjectCreate, SubjectEdit } from "../modules/curriculum/subjects";
import { CurriculumDocumentsList, CurriculumDocumentCreate } from "../modules/curriculum/documents";
import { MailDashboard, IncomingMailList, OutgoingMailList, DispositionsList, IncomingMailCreate, OutgoingMailCreate } from "../modules/mail";

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
            meta: { canDelete: true },
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
                  <Route path="students" element={<StudentReport />} />
                  <Route path="attendance" element={<AttendanceReport />} />
                  <Route path="documents" element={<DocumentReport />} />
                  <Route path="tasks" element={<TaskReport />} />
                  <Route path="employee-attendance" element={<ReportEmployeeAttendance />} />
                  <Route path="leaves" element={<ReportLeaves />} />
                </Route>

                <Route path="/student-journals">
                  <Route index element={<StudentJournalsList />} />
                  <Route path="create" element={<StudentJournalCreate />} />
                  <Route path="edit/:id" element={<StudentJournalEdit />} />
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
                </Route>

                <Route path="/mail">
                  <Route index element={<MailDashboard />} />
                  <Route path="incoming" element={<IncomingMailList />} />
                  <Route path="incoming/create" element={<IncomingMailCreate />} />
                  <Route path="outgoing" element={<OutgoingMailList />} />
                  <Route path="outgoing/create" element={<OutgoingMailCreate />} />
                  <Route path="dispositions" element={<DispositionsList />} />
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
            </Routes>
          </UnitProvider>
        </AcademicYearProvider>
      </Refine>
      </SettingsProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
