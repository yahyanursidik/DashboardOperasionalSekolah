import { Refine, Authenticated } from "@/lib/refine-compat";
import { Suspense } from "react";
import { BrowserRouter, Route, Routes, Outlet, Navigate } from "react-router";
import { lazyPage } from "./lazy-page";
import { PageLoader } from "../components/common/PageLoader";
import routerBindings, { CatchAllNavigate, NavigateToResource } from "@refinedev/react-router";
import { authProvider } from "../lib/supabase/auth-provider";
import { dataProvider } from "./providers/dataProvider";
import { LoginPage } from "../modules/auth/LoginPage";
import { AdminLayout } from "../components/layout/AdminLayout";
import { AuthLayout } from "../components/layout/AuthLayout";

import { Toaster } from "sonner";
import { NetworkDetector } from "../components/common/NetworkDetector";
import { NotFoundPage } from "../components/common/NotFoundPage";

import { accessControlProvider } from "./providers/accessControlProvider";
import { auditLogProvider } from "./providers/auditLogProvider";
import { UnitProvider } from "./providers/UnitProvider";
import { AcademicYearProvider } from "./providers/AcademicYearProvider";
import { ThemeProvider } from "./providers/ThemeProvider";
import { SettingsProvider } from "./providers/SettingsProvider";

const StudentsList = lazyPage(() => import("../modules/students"), "StudentsList");
const StudentCreate = lazyPage(() => import("../modules/students"), "StudentCreate");
const StudentEdit = lazyPage(() => import("../modules/students"), "StudentEdit");
const StudentShow = lazyPage(() => import("../modules/students"), "StudentShow");
const TeachersList = lazyPage(() => import("../modules/teachers"), "TeachersList");
const TeacherCreate = lazyPage(() => import("../modules/teachers"), "TeacherCreate");
const TeacherEdit = lazyPage(() => import("../modules/teachers"), "TeacherEdit");
const TeacherShow = lazyPage(() => import("../modules/teachers"), "TeacherShow");
const ClassesList = lazyPage(() => import("../modules/classes"), "ClassesList");
const ClassCreate = lazyPage(() => import("../modules/classes"), "ClassCreate");
const ClassEdit = lazyPage(() => import("../modules/classes"), "ClassEdit");
const ClassShow = lazyPage(() => import("../modules/classes"), "ClassShow");
const ParentsList = lazyPage(() => import("../modules/parents"), "ParentsList");
const ParentCreate = lazyPage(() => import("../modules/parents"), "ParentCreate");
const ParentEdit = lazyPage(() => import("../modules/parents"), "ParentEdit");
const ParentShow = lazyPage(() => import("../modules/parents"), "ParentShow");
const ParentPortalRequestsAdmin = lazyPage(() => import("../modules/parents"), "ParentPortalRequestsAdmin");
const TasksList = lazyPage(() => import("../modules/tasks"), "TasksList");
const TaskCreate = lazyPage(() => import("../modules/tasks"), "TaskCreate");
const TaskEdit = lazyPage(() => import("../modules/tasks"), "TaskEdit");
const TaskShow = lazyPage(() => import("../modules/tasks"), "TaskShow");
const AttendanceSelector = lazyPage(() => import("../modules/attendance"), "AttendanceSelector");
const AttendanceInput = lazyPage(() => import("../modules/attendance"), "AttendanceInput");
const AttendanceReports = lazyPage(() => import("../modules/attendance"), "AttendanceReports");
const DocumentsList = lazyPage(() => import("../modules/documents"), "DocumentsList");
const DocumentTypesList = lazyPage(() => import("../modules/documents"), "DocumentTypesList");
const DocumentCreate = lazyPage(() => import("../modules/documents"), "DocumentCreate");
const DocumentShow = lazyPage(() => import("../modules/documents"), "DocumentShow");
const DocumentGovernance = lazyPage(() => import("../modules/documents"), "DocumentGovernance");
const AnnouncementsList = lazyPage(() => import("../modules/announcements"), "AnnouncementsList");
const AnnouncementCreate = lazyPage(() => import("../modules/announcements"), "AnnouncementCreate");
const AnnouncementEdit = lazyPage(() => import("../modules/announcements"), "AnnouncementEdit");
const AnnouncementShow = lazyPage(() => import("../modules/announcements"), "AnnouncementShow");
const AuditLogsList = lazyPage(() => import("../modules/audit-logs"), "AuditLogsList");
const ReportsDashboard = lazyPage(() => import("../modules/reports"), "ReportsDashboard");
const StudentReport = lazyPage(() => import("../modules/reports"), "StudentReport");
const AttendanceReport = lazyPage(() => import("../modules/reports"), "AttendanceReport");
const DocumentReport = lazyPage(() => import("../modules/reports"), "DocumentReport");
const TaskReport = lazyPage(() => import("../modules/reports"), "TaskReport");
const ReportEmployeeAttendance = lazyPage(() => import("../modules/reports"), "ReportEmployeeAttendance");
const ReportLeaves = lazyPage(() => import("../modules/reports"), "ReportLeaves");
const VisualAnalytics = lazyPage(() => import("../modules/reports"), "VisualAnalytics");
const ReportExportHistory = lazyPage(() => import("../modules/reports"), "ReportExportHistory");

const EmployeesList = lazyPage(() => import("../modules/employees"), "EmployeesList");
const EmployeeCreate = lazyPage(() => import("../modules/employees"), "EmployeeCreate");
const EmployeeEdit = lazyPage(() => import("../modules/employees"), "EmployeeEdit");
const EmployeeShow = lazyPage(() => import("../modules/employees"), "EmployeeShow");
const EmployeeAttendanceList = lazyPage(() => import("../modules/attendance/pages/employee-attendance"), "EmployeeAttendanceList");
const AttendanceSettings = lazyPage(() => import("../modules/attendance/pages/attendance-settings"), "AttendanceSettings");
const AttendanceReviews = lazyPage(() => import("../modules/attendance/pages/attendance-reviews"), "AttendanceReviews");
const AttendanceEvents = lazyPage(() => import("../modules/attendance/pages/attendance-events"), "AttendanceEvents");
const AttendanceOvertime = lazyPage(() => import("../modules/attendance/pages/attendance-overtime"), "AttendanceOvertime");
const StaffOperationalReportsAdmin = lazyPage(() => import("../modules/attendance/pages/staff-operational-reports"), "StaffOperationalReportsAdmin");
const SchedulesList = lazyPage(() => import("../modules/schedules"), "SchedulesList");
const ScheduleCreate = lazyPage(() => import("../modules/schedules"), "ScheduleCreate");
const ScheduleEdit = lazyPage(() => import("../modules/schedules"), "ScheduleEdit");
const UnitSchedulePatterns = lazyPage(() => import("../modules/schedules"), "UnitSchedulePatterns");
const LeavesList = lazyPage(() => import("../modules/leaves"), "LeavesList");
const LeaveCreate = lazyPage(() => import("../modules/leaves"), "LeaveCreate");
const LeaveShow = lazyPage(() => import("../modules/leaves"), "LeaveShow");
const SubstitutesList = lazyPage(() => import("../modules/substitutes"), "SubstitutesList");
const SubstituteCreate = lazyPage(() => import("../modules/substitutes"), "SubstituteCreate");
const SubstituteEdit = lazyPage(() => import("../modules/substitutes"), "SubstituteEdit");
const DashboardPage = lazyPage(() => import("../modules/dashboard"), "DashboardPage");
const MasterDataDashboard = lazyPage(() => import("../modules/master-data"), "MasterDataDashboard");
const ExtracurricularDashboard = lazyPage(() => import("../modules/extracurricular"), "ExtracurricularDashboard");
const ProgramsList = lazyPage(() => import("../modules/extracurricular"), "ProgramsList");
const MembersList = lazyPage(() => import("../modules/extracurricular"), "MembersList");
const AttendanceList = lazyPage(() => import("../modules/extracurricular"), "AttendanceList");
const GradesList = lazyPage(() => import("../modules/extracurricular"), "GradesList");
const ExtracurricularPortalLayout = lazyPage(() => import("../modules/extracurricular/portal"), "ExtracurricularPortalLayout");
const ExtracurricularPortalDashboard = lazyPage(() => import("../modules/extracurricular/portal"), "ExtracurricularPortalDashboard");
const ExtracurricularPortalLogin = lazyPage(() => import("../modules/extracurricular/portal"), "ExtracurricularPortalLogin");
const ExtracurricularPortalRegister = lazyPage(() => import("../modules/extracurricular/portal"), "ExtracurricularPortalRegister");
const ExtracurricularPortalPrograms = lazyPage(() => import("../modules/extracurricular/portal"), "ExtracurricularPortalPrograms");
const ExtracurricularPortalProfile = lazyPage(() => import("../modules/extracurricular/portal"), "ExtracurricularPortalProfile");
const SettingsPage = lazyPage(() => import("../modules/settings"), "SettingsPage");
const StudentMassPromotion = lazyPage(() => import("../modules/students/pages/mass-promotion"), "StudentMassPromotion");
const CommunicationsPage = lazyPage(() => import("../modules/communications"), "CommunicationsPage");
const StudentCbtPage = lazyPage(() => import("../modules/academic/cbt/student-cbt"), "StudentCbtPage");
const DapodikPage = lazyPage(() => import("../modules/dapodik/pages/dapodik"), "DapodikPage");
const CounselingPage = lazyPage(() => import("../modules/counseling/pages/counseling"), "CounselingPage");
const TeacherConduct = lazyPage(() => import("../modules/teacher-portal/teacher-conduct"), "TeacherConduct");
const PortalConduct = lazyPage(() => import("../modules/portal/portal-conduct"), "PortalConduct");
const EmailLogPage = lazyPage(() => import("../modules/communications"), "EmailLogPage");
const StudentJournalsList = lazyPage(() => import("../modules/student-journals/pages"), "StudentJournalsList");
const StudentJournalCreate = lazyPage(() => import("../modules/student-journals/pages"), "StudentJournalCreate");
const StudentJournalEdit = lazyPage(() => import("../modules/student-journals/pages"), "StudentJournalEdit");
const FinanceDashboard = lazyPage(() => import("../modules/finance/pages"), "FinanceDashboard");
const InvoicesList = lazyPage(() => import("../modules/finance/pages"), "InvoicesList");
const PaymentVerifications = lazyPage(() => import("../modules/finance/pages"), "PaymentVerifications");
const SchoolExpenses = lazyPage(() => import("../modules/finance/pages"), "SchoolExpenses");
const FinanceCategories = lazyPage(() => import("../modules/finance/pages"), "FinanceCategories");
const SpmbFeesConfig = lazyPage(() => import("../modules/finance/pages"), "SpmbFeesConfig");
const FinanceSettings = lazyPage(() => import("../modules/finance/pages"), "FinanceSettings");
const FinanceCashbook = lazyPage(() => import("../modules/finance/pages"), "FinanceCashbook");
const FinanceBudgets = lazyPage(() => import("../modules/finance/pages"), "FinanceBudgets");
const FinanceAccounting = lazyPage(() => import("../modules/finance/pages"), "FinanceAccounting");
const FinanceReports = lazyPage(() => import("../modules/finance/pages"), "FinanceReports");
const FinanceTariffs = lazyPage(() => import("../modules/finance/pages"), "FinanceTariffs");
const FinanceReceipts = lazyPage(() => import("../modules/finance/pages"), "FinanceReceipts");
const CurriculumDashboard = lazyPage(() => import("../modules/curriculum/dashboard"), "CurriculumDashboard");
const HblAdminPage = lazyPage(() => import("../modules/hbl"), "HblAdminPage");
const CurriculumQualityControl = lazyPage(() => import("../modules/curriculum/quality-control"), "CurriculumQualityControl");
const SubjectsList = lazyPage(() => import("../modules/curriculum/subjects"), "SubjectsList");
const SubjectCreate = lazyPage(() => import("../modules/curriculum/subjects"), "SubjectCreate");
const SubjectEdit = lazyPage(() => import("../modules/curriculum/subjects"), "SubjectEdit");
const SubjectShow = lazyPage(() => import("../modules/curriculum/subjects"), "SubjectShow");
const SubjectTeacherDirectory = lazyPage(() => import("../modules/curriculum/subjects"), "SubjectTeacherDirectory");
const SubjectCurriculumCreate = lazyPage(() => import("../modules/curriculum/subject-curriculums"), "SubjectCurriculumCreate");
const SubjectCurriculumEdit = lazyPage(() => import("../modules/curriculum/subject-curriculums"), "SubjectCurriculumEdit");
const PaudThemeList = lazyPage(() => import("../modules/curriculum/paud-curriculums/list"), "PaudThemeList");
const PaudThemeCreate = lazyPage(() => import("../modules/curriculum/paud-curriculums/create"), "PaudThemeCreate");
const PaudThemeEdit = lazyPage(() => import("../modules/curriculum/paud-curriculums/edit"), "PaudThemeEdit");
const PaudThemeShow = lazyPage(() => import("../modules/curriculum/paud-curriculums/show"), "PaudThemeShow");
const CurriculumDocumentsList = lazyPage(() => import("../modules/curriculum/documents"), "CurriculumDocumentsList");
const CurriculumDocumentCreate = lazyPage(() => import("../modules/curriculum/documents"), "CurriculumDocumentCreate");
const MailDashboard = lazyPage(() => import("../modules/mail"), "MailDashboard");
const IncomingMailList = lazyPage(() => import("../modules/mail"), "IncomingMailList");
const OutgoingMailList = lazyPage(() => import("../modules/mail"), "OutgoingMailList");
const DispositionsList = lazyPage(() => import("../modules/mail"), "DispositionsList");
const IncomingMailCreate = lazyPage(() => import("../modules/mail"), "IncomingMailCreate");
const OutgoingMailCreate = lazyPage(() => import("../modules/mail"), "OutgoingMailCreate");
const MailShow = lazyPage(() => import("../modules/mail"), "MailShow");
const RecruitmentDashboard = lazyPage(() => import("../modules/recruitment"), "RecruitmentDashboard");
const VacanciesList = lazyPage(() => import("../modules/recruitment"), "VacanciesList");
const ApplicantsList = lazyPage(() => import("../modules/recruitment"), "ApplicantsList");
const ApplicantShow = lazyPage(() => import("../modules/recruitment"), "ApplicantShow");
const VacancyCreate = lazyPage(() => import("../modules/recruitment"), "VacancyCreate");
const VacancyEdit = lazyPage(() => import("../modules/recruitment"), "VacancyEdit");
const ApplicantCreate = lazyPage(() => import("../modules/recruitment"), "ApplicantCreate");
const CbtBanksList = lazyPage(() => import("../modules/recruitment/cbt/CbtBanksList"), "CbtBanksList");
const CbtQuestionsManager = lazyPage(() => import("../modules/recruitment/cbt/CbtQuestionsManager"), "CbtQuestionsManager");
const CbtExamsList = lazyPage(() => import("../modules/recruitment/cbt/CbtExamsList"), "CbtExamsList");
const CbtExamBanksManager = lazyPage(() => import("../modules/recruitment/cbt/CbtExamBanksManager"), "CbtExamBanksManager");
const CbtAttemptsList = lazyPage(() => import("../modules/recruitment/cbt/CbtAttemptsList"), "CbtAttemptsList");
const CbtAttemptShow = lazyPage(() => import("../modules/recruitment/cbt/CbtAttemptShow"), "CbtAttemptShow");
const AdmissionsDashboard = lazyPage(() => import("../modules/admissions/pages"), "AdmissionsDashboard");
const AdmissionsSettings = lazyPage(() => import("../modules/admissions/pages"), "AdmissionsSettings");
const AdmissionsReports = lazyPage(() => import("../modules/admissions/pages"), "AdmissionsReports");
const AdmissionsApplicantsList = lazyPage(() => import("../modules/admissions/pages"), "ApplicantsList");
const AdmissionsApplicantShow = lazyPage(() => import("../modules/admissions/pages"), "ApplicantShow");
const AdmissionCrm = lazyPage(() => import("../modules/admissions/pages"), "AdmissionCrm");
const AdmissionLeadShow = lazyPage(() => import("../modules/admissions/pages"), "AdmissionLeadShow");
const AcademicDashboard = lazyPage(() => import("../modules/academic"), "AcademicDashboard");
const Gradebook = lazyPage(() => import("../modules/academic"), "Gradebook");
const ReportCards = lazyPage(() => import("../modules/academic"), "ReportCards");
const ReportPrint = lazyPage(() => import("../modules/academic"), "ReportPrint");
const SarprasDashboard = lazyPage(() => import("../modules/sarpras"), "SarprasDashboard");
const AssetLoansList = lazyPage(() => import("../modules/sarpras"), "AssetLoansList");
const ProcurementsList = lazyPage(() => import("../modules/sarpras"), "ProcurementsList");
const UnifiedAssetsDashboard = lazyPage(() => import("../modules/sarpras"), "UnifiedAssetsDashboard");
const RoomsList = lazyPage(() => import("../modules/sarpras"), "RoomsList");
const RoomSchedulesList = lazyPage(() => import("../modules/sarpras"), "RoomSchedulesList");
const MaintenanceList = lazyPage(() => import("../modules/sarpras"), "MaintenanceList");
const StocktakesList = lazyPage(() => import("../modules/sarpras"), "StocktakesList");
const AcademicCalendar = lazyPage(() => import("../modules/calendar"), "AcademicCalendar");
const PkgList = lazyPage(() => import("../modules/pkg"), "PkgList");
const PkgCreate = lazyPage(() => import("../modules/pkg"), "PkgCreate");
const PkgShow = lazyPage(() => import("../modules/pkg"), "PkgShow");
const PkgHistory = lazyPage(() => import("../modules/pkg"), "PkgHistory");
const PkgSettings = lazyPage(() => import("../modules/pkg"), "PkgSettings");
const QuranRecordsList = lazyPage(() => import("../modules/quran"), "QuranRecordsList");
const QuranRecordForm = lazyPage(() => import("../modules/quran"), "QuranRecordForm");
const QuranTargetsList = lazyPage(() => import("../modules/quran"), "QuranTargetsList");
const QuranTargetForm = lazyPage(() => import("../modules/quran"), "QuranTargetForm");
const QuranAssessmentsList = lazyPage(() => import("../modules/quran"), "QuranAssessmentsList");
const QuranAssessmentForm = lazyPage(() => import("../modules/quran"), "QuranAssessmentForm");
const HalaqohsList = lazyPage(() => import("../modules/quran"), "HalaqohsList");
const HalaqohForm = lazyPage(() => import("../modules/quran"), "HalaqohForm");
const HalaqohShow = lazyPage(() => import("../modules/quran"), "HalaqohShow");
const TahfidzTargetsList = lazyPage(() => import("../modules/quran"), "TahfidzTargetsList");
const TahfidzTargetForm = lazyPage(() => import("../modules/quran"), "TahfidzTargetForm");
const TahfidzReportDashboard = lazyPage(() => import("../modules/quran"), "TahfidzReportDashboard");
const TahsinHalaqohsList = lazyPage(() => import("../modules/quran"), "TahsinHalaqohsList");
const TahsinHalaqohForm = lazyPage(() => import("../modules/quran"), "TahsinHalaqohForm");
const TahsinHalaqohShow = lazyPage(() => import("../modules/quran"), "TahsinHalaqohShow");
const TahsinTargetsList = lazyPage(() => import("../modules/quran"), "TahsinTargetsList");
const TahsinTargetForm = lazyPage(() => import("../modules/quran"), "TahsinTargetForm");
const TahsinRecordsList = lazyPage(() => import("../modules/quran"), "TahsinRecordsList");
const TahsinAssessmentsList = lazyPage(() => import("../modules/quran"), "TahsinAssessmentsList");
const TahsinReportDashboard = lazyPage(() => import("../modules/quran"), "TahsinReportDashboard");
const TahsinRecordForm = lazyPage(() => import("../modules/quran"), "TahsinRecordForm");
const TahsinAssessmentForm = lazyPage(() => import("../modules/quran"), "TahsinAssessmentForm");

const PaudDashboard = lazyPage(() => import("../modules/paud"), "PaudDashboard");
const PaudActivitiesList = lazyPage(() => import("../modules/paud"), "PaudActivitiesList");
const PaudActivityForm = lazyPage(() => import("../modules/paud"), "PaudActivityForm");
const StppaAssessmentsList = lazyPage(() => import("../modules/paud"), "StppaAssessmentsList");
const StppaAssessmentForm = lazyPage(() => import("../modules/paud"), "StppaAssessmentForm");

const PortalLayout = lazyPage(() => import("../modules/portal/portal-layout"), "PortalLayout");
const PortalLogin = lazyPage(() => import("../modules/portal/portal-login"), "PortalLogin");
const PortalDashboard = lazyPage(() => import("../modules/portal/portal-dashboard"), "PortalDashboard");
const PortalExtracurricular = lazyPage(() => import("../modules/portal/portal-extracurricular"), "PortalExtracurricular");
const PortalFinance = lazyPage(() => import("../modules/portal/portal-finance"), "PortalFinance");
const PortalAcademic = lazyPage(() => import("../modules/portal/portal-academic"), "PortalAcademic");
const PortalJournals = lazyPage(() => import("../modules/portal/portal-journals"), "PortalJournals");
const PortalQuran = lazyPage(() => import("../modules/portal/portal-quran"), "PortalQuran");
const PortalPaud = lazyPage(() => import("../modules/portal/portal-paud"), "PortalPaud");
const PortalAnnouncements = lazyPage(() => import("../modules/portal/portal-announcements"), "PortalAnnouncements");
const PrintInvoice = lazyPage(() => import("../modules/finance/pages/print-invoice"), "PrintInvoice");
const SpmbLayout = lazyPage(() => import("../modules/admissions/portal"), "SpmbLayout");
const SpmbDashboard = lazyPage(() => import("../modules/admissions/portal"), "SpmbDashboard");
const SpmbForm = lazyPage(() => import("../modules/admissions/portal"), "SpmbForm");
const SpmbDocuments = lazyPage(() => import("../modules/admissions/portal"), "SpmbDocuments");
const SpmbAnnouncement = lazyPage(() => import("../modules/admissions/portal"), "SpmbAnnouncement");
const SpmbLogin = lazyPage(() => import("../modules/admissions/portal"), "SpmbLogin");
const SpmbRegister = lazyPage(() => import("../modules/admissions/portal"), "SpmbRegister");
const SpmbForgotPassword = lazyPage(() => import("../modules/admissions/portal"), "SpmbForgotPassword");
const SpmbResetPassword = lazyPage(() => import("../modules/admissions/portal"), "SpmbResetPassword");
const SpmbChecklist = lazyPage(() => import("../modules/admissions/portal"), "SpmbChecklist");
const SpmbPayment = lazyPage(() => import("../modules/admissions/portal"), "SpmbPayment");
const SpmbSubmit = lazyPage(() => import("../modules/admissions/portal"), "SpmbSubmit");
const CbtPortalLayout = lazyPage(() => import("../modules/cbt-portal/CbtPortalLayout"), "CbtPortalLayout");
const CbtPortalLogin = lazyPage(() => import("../modules/cbt-portal/CbtPortalLogin"), "CbtPortalLogin");
const CbtPortalTestRoom = lazyPage(() => import("../modules/cbt-portal/CbtPortalTestRoom"), "CbtPortalTestRoom");

const TeacherLayout = lazyPage(() => import("../modules/teacher-portal/teacher-layout"), "TeacherLayout");
const TeacherLogin = lazyPage(() => import("../modules/teacher-portal/teacher-login"), "TeacherLogin");
const TeacherDashboard = lazyPage(() => import("../modules/teacher-portal/teacher-dashboard"), "TeacherDashboard");
const TeacherClasses = lazyPage(() => import("../modules/teacher-portal/teacher-classes"), "TeacherClasses");
const TeacherJournals = lazyPage(() => import("../modules/teacher-portal/teacher-journals"), "TeacherJournals");
const TeacherLeaves = lazyPage(() => import("../modules/teacher-portal/teacher-leaves"), "TeacherLeaves");
const TeacherAttendance = lazyPage(() => import("../modules/teacher-portal/teacher-attendance"), "TeacherAttendance");
const TeacherSchedules = lazyPage(() => import("../modules/teacher-portal/teacher-schedules"), "TeacherSchedules");
const TeacherQuran = lazyPage(() => import("../modules/teacher-portal/teacher-quran"), "TeacherQuran");
const TeacherPaud = lazyPage(() => import("../modules/teacher-portal/teacher-paud"), "TeacherPaud");
const TeacherAnnouncements = lazyPage(() => import("../modules/teacher-portal/teacher-announcements"), "TeacherAnnouncements");
const TeacherProfile = lazyPage(() => import("../modules/teacher-portal/teacher-profile"), "TeacherProfile");
const TeacherTasks = lazyPage(() => import("../modules/teacher-portal/teacher-tasks"), "TeacherTasks");
const TeacherReports = lazyPage(() => import("../modules/teacher-portal/teacher-reports"), "TeacherReports");
const TeacherPerformance = lazyPage(() => import("../modules/teacher-portal/teacher-performance"), "TeacherPerformance");

const BendaharaLayout = lazyPage(() => import("../modules/bendahara-portal"), "BendaharaLayout");
const BendaharaLogin = lazyPage(() => import("../modules/bendahara-portal"), "BendaharaLogin");
const AdminSpmbLayout = lazyPage(() => import("../modules/admin-spmb-portal"), "AdminSpmbLayout");
const AdminSpmbLogin = lazyPage(() => import("../modules/admin-spmb-portal"), "AdminSpmbLogin");
const HrdPortalLayout = lazyPage(() => import("../modules/hrd-portal"), "HrdPortalLayout");
const HrdPortalLogin = lazyPage(() => import("../modules/hrd-portal"), "HrdPortalLogin");
const HrdDashboard = lazyPage(() => import("../modules/hrd-portal"), "HrdDashboard");
const StaffLogin = lazyPage(() => import("../modules/staff-portal"), "StaffLogin");
const StaffLayout = lazyPage(() => import("../modules/staff-portal"), "StaffLayout");
const StaffDashboard = lazyPage(() => import("../modules/staff-portal"), "StaffDashboard");
const StaffAttendance = lazyPage(() => import("../modules/staff-portal"), "StaffAttendance");
const StaffLeaves = lazyPage(() => import("../modules/staff-portal"), "StaffLeaves");
const StaffAnnouncements = lazyPage(() => import("../modules/staff-portal"), "StaffAnnouncements");
const StaffSchedules = lazyPage(() => import("../modules/staff-portal"), "StaffSchedules");
const StaffProfile = lazyPage(() => import("../modules/staff-portal"), "StaffProfile");
const StaffTasks = lazyPage(() => import("../modules/staff-portal"), "StaffTasks");
const StaffOperationalReports = lazyPage(() => import("../modules/staff-portal"), "StaffOperationalReports");

const ReportPeriodsList = lazyPage(() => import("../modules/digital-reports/periods/pages"), "ReportPeriodsList");
const ReportPeriodCreate = lazyPage(() => import("../modules/digital-reports/periods/pages"), "ReportPeriodCreate");
const ReportPeriodEdit = lazyPage(() => import("../modules/digital-reports/periods/pages"), "ReportPeriodEdit");
const ReportPeriodShow = lazyPage(() => import("../modules/digital-reports/periods/pages"), "ReportPeriodShow");
const ReportTemplatesList = lazyPage(() => import("../modules/digital-reports/templates/pages"), "ReportTemplatesList");
const ReportTemplateCreate = lazyPage(() => import("../modules/digital-reports/templates/pages"), "ReportTemplateCreate");
const ReportTemplateEdit = lazyPage(() => import("../modules/digital-reports/templates/pages"), "ReportTemplateEdit");
const ReportTemplateShow = lazyPage(() => import("../modules/digital-reports/templates/pages"), "ReportTemplateShow");
const ReportGenerator = lazyPage(() => import("../modules/digital-reports/generate/pages"), "ReportGenerator");
const TeacherInputList = lazyPage(() => import("../modules/digital-reports/teacher-input/pages"), "TeacherInputList");
const TeacherInputForm = lazyPage(() => import("../modules/digital-reports/teacher-input/pages"), "TeacherInputForm");
const HomeroomReviewList = lazyPage(() => import("../modules/digital-reports/homeroom-review/pages"), "HomeroomReviewList");
const HomeroomReviewForm = lazyPage(() => import("../modules/digital-reports/homeroom-review/pages"), "HomeroomReviewForm");
const WakasekReviewList = lazyPage(() => import("../modules/digital-reports/wakasek-review/pages"), "WakasekReviewList");
const WakasekReviewForm = lazyPage(() => import("../modules/digital-reports/wakasek-review/pages"), "WakasekReviewForm");
const PrincipalApprovalList = lazyPage(() => import("../modules/digital-reports/principal-approval/pages"), "PrincipalApprovalList");
const PrincipalApprovalForm = lazyPage(() => import("../modules/digital-reports/principal-approval/pages"), "PrincipalApprovalForm");
const PublishReportList = lazyPage(() => import("../modules/digital-reports/publish/pages"), "PublishReportList");
const ParentReportList = lazyPage(() => import("../modules/digital-reports/parent/pages"), "ParentReportList");
const ParentReportShow = lazyPage(() => import("../modules/digital-reports/parent/pages"), "ParentReportShow");
const ReadReceiptsList = lazyPage(() => import("../modules/digital-reports/read-receipts/pages"), "ReadReceiptsList");
const GeneratePDFList = lazyPage(() => import("../modules/digital-reports/pdf/pages"), "GeneratePDFList");
const MonitoringDashboard = lazyPage(() => import("../modules/digital-reports/monitoring/pages"), "MonitoringDashboard");

// Digital Library Imports
const DigitalLibraryCategoriesList = lazyPage(() => import("../modules/digital-library/categories-list"), "DigitalLibraryCategoriesList");
const DigitalLibraryCategoriesCreate = lazyPage(() => import("../modules/digital-library/categories-create"), "DigitalLibraryCategoriesCreate");
const DigitalLibraryCategoriesEdit = lazyPage(() => import("../modules/digital-library/categories-edit"), "DigitalLibraryCategoriesEdit");
const DigitalLibraryBooksList = lazyPage(() => import("../modules/digital-library/books-list"), "DigitalLibraryBooksList");
const DigitalLibraryBooksCreate = lazyPage(() => import("../modules/digital-library/books-create"), "DigitalLibraryBooksCreate");
const DigitalLibraryBooksEdit = lazyPage(() => import("../modules/digital-library/books-edit"), "DigitalLibraryBooksEdit");
const PortalLibrary = lazyPage(() => import("../modules/portal/portal-library"), "PortalLibrary");
const StaffLibrary = lazyPage(() => import("../modules/portal/portal-library"), "StaffLibrary");
const TeacherLibrary = lazyPage(() => import("../modules/portal/portal-library"), "TeacherLibrary");
const PortalOnboarding = lazyPage(() => import("../modules/portal/portal-onboarding"), "PortalOnboarding");
const StaffOnboarding = lazyPage(() => import("../modules/portal/portal-onboarding"), "StaffOnboarding");
const TeacherOnboarding = lazyPage(() => import("../modules/portal/portal-onboarding"), "TeacherOnboarding");
const PortalProfile = lazyPage(() => import("../modules/portal/portal-profile"), "PortalProfile");
const PortalAttendance = lazyPage(() => import("../modules/portal/portal-attendance"), "PortalAttendance");
const PortalRequests = lazyPage(() => import("../modules/portal/portal-requests"), "PortalRequests");
const PortalHbl = lazyPage(() => import("../modules/portal/portal-hbl"), "PortalHbl");

// Onboarding Imports
const OnboardingList = lazyPage(() => import("../modules/onboarding/pages"), "OnboardingList");
const OnboardingCreate = lazyPage(() => import("../modules/onboarding/pages"), "OnboardingCreate");
const OnboardingEdit = lazyPage(() => import("../modules/onboarding/pages"), "OnboardingEdit");
const OnboardingShow = lazyPage(() => import("../modules/onboarding/pages"), "OnboardingShow");

export default function App() {
  // Supabase falls back to the configured Site URL when a requested recovery
  // redirect is not yet allow-listed. Preserve the recovery hash and route it
  // into the SPMB password form instead of leaving the parent on the admin root.
  if (typeof window !== "undefined" && window.location.pathname !== "/spmb/reset-password") {
    const recoveryType = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("type");
    if (recoveryType === "recovery") window.history.replaceState(null, "", `/spmb/reset-password${window.location.hash}`);
  }
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
            meta: {
              canDelete: true,
            },
          },
          {
            name: "quran_records",
            list: "/quran",
            create: "/quran/create",
            edit: "/quran/edit/:id",
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
            name: "tahfidz_halaqohs",
            list: "/tahfidz-halaqohs",
            create: "/tahfidz-halaqohs/create",
            edit: "/tahfidz-halaqohs/edit/:id",
            show: "/tahfidz-halaqohs/show/:id",
            meta: {
              canDelete: true,
            },
          },
          {
            name: "tahfidz_student_targets",
            list: "/tahfidz-student-targets",
            create: "/tahfidz-student-targets/create",
            edit: "/tahfidz-student-targets/edit/:id",
            meta: {
              canDelete: true,
            },
          },
          {
            name: "tahfidz_reports",
            list: "/tahfidz-reports",
            meta: {
              canDelete: false,
            },
          },
          {
            name: "tahsin_halaqohs",
            list: "/tahsin-halaqohs",
            create: "/tahsin-halaqohs/create",
            edit: "/tahsin-halaqohs/edit/:id",
            show: "/tahsin-halaqohs/show/:id",
            meta: { canDelete: true },
          },
          {
            name: "tahsin_student_targets",
            list: "/tahsin-student-targets",
            create: "/tahsin-student-targets/create",
            edit: "/tahsin-student-targets/edit/:id",
            meta: { canDelete: true },
          },
          {
            name: "tahsin_records",
            list: "/tahsin-records",
            create: "/tahsin-records/create",
            edit: "/tahsin-records/edit/:id",
            meta: { canDelete: true },
          },
          {
            name: "tahsin_assessments",
            list: "/tahsin-assessments",
            create: "/tahsin-assessments/create",
            edit: "/tahsin-assessments/edit/:id",
            meta: { canDelete: true },
          },
          {
            name: "tahsin_reports",
            list: "/tahsin-reports",
            meta: { canDelete: false },
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
            name: "finance_settings",
            list: "/finance/settings",
            meta: { label: "Pengaturan Keuangan", parent: "finance" }
          },
          {
            name: "finance_cash_accounts",
            list: "/finance/cashbook",
            meta: { label: "Kas & Bank" }
          },
          {
            name: "finance_budgets",
            list: "/finance/budgets",
            meta: { label: "RKAS & Anggaran" }
          },
          {
            name: "finance_accounts",
            list: "/finance/accounting",
            meta: { label: "Bagan Akun" }
          },
          {
            name: "finance_journal_entries",
            list: "/finance/accounting",
            meta: { label: "Jurnal Akuntansi" }
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
            name: "staff_operational_reports",
            list: "/operations/reports",
            meta: { label: "Laporan Operasional Staf", canDelete: false },
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
            name: "email_messages",
            list: "/communications/email-log",
            meta: { label: "Log Email", canDelete: false },
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
            name: "report_export_logs",
            list: "/reports/history",
            meta: { label: "Riwayat Ekspor Laporan", canDelete: false },
          },
          {
            name: "onboarding_materials",
            list: "/onboarding",
            create: "/onboarding/create",
            edit: "/onboarding/edit/:id",
            show: "/onboarding/show/:id",
            meta: { label: "Onboarding Materials", canDelete: true },
          },
          {
            name: "digital_reports",
            meta: { label: "Rapor Digital" }
          },
          {
            name: "report_periods",
            list: "/reports/periods",
            create: "/reports/periods/create",
            edit: "/reports/periods/edit/:id",
            show: "/reports/periods/show/:id",
            meta: { label: "Periode Rapor", parent: "digital_reports" }
          },
          {
            name: "report_templates",
            list: "/reports/templates",
            create: "/reports/templates/create",
            edit: "/reports/templates/edit/:id",
            show: "/reports/templates/show/:id",
            meta: { label: "Template Rapor", parent: "digital_reports" }
          },
          {
            name: "report_generator",
            list: "/reports/generate",
            meta: { label: "Generate Rapor", parent: "digital_reports", canDelete: false }
          },
          {
            name: "teacher_input",
            list: "/reports/teacher-input",
            show: "/reports/teacher-input/:id",
            meta: { label: "Input Guru", parent: "digital_reports", canDelete: false }
          },
          {
            name: "homeroom_review",
            list: "/reports/homeroom-review",
            show: "/reports/homeroom-review/:id",
            meta: { label: "Review Wali Kelas", parent: "digital_reports", canDelete: false }
          },
          {
            name: "wakasek_review",
            list: "/reports/wakasek-review",
            show: "/reports/wakasek-review/:id",
            meta: { label: "Review Wakasek", parent: "digital_reports", canDelete: false }
          },
          {
            name: "principal_approval",
            list: "/reports/principal-approval",
            show: "/reports/principal-approval/:id",
            meta: { label: "Approval Kepala Sekolah", parent: "digital_reports", canDelete: false }
          },
          {
            name: "publish_report",
            list: "/reports/publish",
            meta: { label: "Publish Rapor", parent: "digital_reports", canDelete: false }
          },
          {
            name: "parent_reports",
            list: "/parent/reports",
            show: "/parent/reports/:id",
            meta: { label: "Rapor Anak", canDelete: false }
          },
          {
            name: "read_receipts",
            list: "/reports/read-receipts",
            meta: { label: "Tanda Terima", parent: "digital_reports", canDelete: false }
          },
          {
            name: "report_pdfs",
            list: "/reports/pdf",
            meta: { label: "Generate PDF", parent: "digital_reports", canDelete: false }
          },
          {
            name: "monitoring",
            list: "/reports/monitoring",
            meta: { label: "Monitoring Rapor", parent: "digital_reports", canDelete: false }
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
            show: "/employees/show/:id",
            meta: { canDelete: true },
          },
          {
            name: "employee_attendance",
            list: "/attendance/employees",
            meta: { canDelete: false },
          },
          {
            name: "employee_schedules",
            list: "/schedules",
            create: "/schedules/create",
            edit: "/schedules/edit/:id",
            meta: { canDelete: true, label: "Jadwal Pelajaran & Kerja" },
          },
          {
            name: "leave_requests",
            list: "/leaves",
            create: "/leaves/create",
            show: "/leaves/show/:id",
            meta: { canDelete: true },
          },
          {
            name: "substitute_assignments",
            list: "/substitutes",
            create: "/substitutes/create",
            edit: "/substitutes/edit/:id",
          },
          {
            name: "subjects",
            list: "/curriculum/subjects",
            create: "/curriculum/subjects/create",
            edit: "/curriculum/subjects/edit/:id",
            show: "/curriculum/subjects/show/:id",
          },
          {
            name: "subject_curriculums",
            create: "/curriculum/subject-curriculums/create",
            edit: "/curriculum/subject-curriculums/edit/:id",
            meta: { canDelete: true },
          },
          {
            name: "document_governance_actions",
            list: "/documents/governance",
            meta: { canDelete: false, label: "Retensi & Kepatuhan Dokumen" },
          },
          {
            name: "subject_curriculum_semesters",
            meta: { canDelete: true },
          },
          {
            name: "paud_curriculums",
            list: "/curriculum/paud",
            create: "/curriculum/paud/create",
            edit: "/curriculum/paud/edit/:id",
            show: "/curriculum/paud/show/:id",
            meta: { canDelete: true },
          },
          {
            name: "curriculum_documents",
            list: "/curriculum/documents",
            create: "/curriculum/documents/create",
          },
          {
            name: "digital_library_categories",
            list: "/digital-library/categories",
            create: "/digital-library/categories/create",
            edit: "/digital-library/categories/edit/:id",
            meta: { label: "Kategori Perpustakaan" },
          },
          {
            name: "digital_library_books",
            list: "/digital-library",
            create: "/digital-library/create",
            edit: "/digital-library/edit/:id",
            meta: { label: "Perpustakaan Digital" },
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
            name: "recruitment",
            list: "/recruitment",
            meta: { label: "Rekrutmen" },
          },
          {
            name: "recruitment_vacancies",
            list: "/recruitment/vacancies",
            create: "/recruitment/vacancies/create",
            meta: { label: "Lowongan", parent: "recruitment", canDelete: true },
          },
          {
            name: "recruitment_applicants",
            list: "/recruitment/applicants",
            create: "/recruitment/applicants/create",
            show: "/recruitment/applicants/show/:id",
            meta: { label: "Pelamar", parent: "recruitment", canDelete: true },
          },
          {
            name: "recruitment_cbt",
            list: "/recruitment/cbt/exams",
            meta: { label: "CBT Rekrutmen", parent: "recruitment", canDelete: false },
          },
          {
            name: "cbt_banks",
            list: "/recruitment/cbt/banks",
            meta: { label: "Bank Soal", parent: "recruitment_cbt", canDelete: true },
          },
          {
            name: "cbt_questions",
            meta: { canDelete: true, hide: true },
          },
          {
            name: "cbt_exams",
            list: "/recruitment/cbt/exams",
            meta: { label: "Pengaturan Ujian", parent: "recruitment_cbt", canDelete: true },
          },
          {
            name: "cbt_participants",
            list: "/recruitment/cbt/results",
            meta: { label: "Hasil Ujian", parent: "recruitment_cbt", canDelete: true },
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
            name: "admission_leads",
            list: "/admissions/crm",
            show: "/admissions/crm/:id",
            meta: { label: "CRM Calon Orang Tua", parent: "admissions", canDelete: false }
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
            name: "pkg_assessments",
            list: "/pkg",
            create: "/pkg/create",
            show: "/pkg/show/:id",
            edit: "/pkg/edit/:id",
            meta: { label: "PKG / Kinerja Guru", canDelete: true },
          },
          {
            name: "assets",
            list: "/sarpras/assets",
            meta: { canDelete: true, label: "Manajemen Aset" },
          },
          {
            name: "asset_loans",
            list: "/sarpras/asset-loans",
            meta: { canDelete: true, hide: true },
          },
          {
            name: "procurements",
            list: "/sarpras/procurements",
            meta: { canDelete: true, hide: true },
          },
          {
            name: "rooms",
            list: "/sarpras/rooms",
            meta: { canDelete: true, label: "Data Ruangan" },
          },
          {
            name: "room_schedules",
            list: "/sarpras/room-schedules",
            meta: { canDelete: true, label: "Jadwal Ruangan" },
          },
          {
            name: "asset_maintenance_requests",
            list: "/sarpras/maintenance",
            meta: { canDelete: false, label: "Pemeliharaan Sarpras" },
          },
          {
            name: "asset_stocktakes",
            list: "/sarpras/stocktakes",
            meta: { canDelete: false, label: "Stok Opname" },
          },
          {
            name: "asset_stocktake_items",
            meta: { canDelete: false, hide: true },
          },
          {
            name: "extracurricular",
            list: "/extracurricular",
            meta: { label: "Ekstrakurikuler" }
          },
          {
            name: "extracurriculars",
            list: "/extracurricular/programs",
            meta: { label: "Katalog Ekskul", parent: "extracurricular", canDelete: true }
          },
          {
            name: "extracurricular_members",
            list: "/extracurricular/members",
            meta: { label: "Data Peserta", parent: "extracurricular", canDelete: true }
          },
          {
            name: "extracurricular_attendances",
            list: "/extracurricular/attendance",
            meta: { label: "Absensi", parent: "extracurricular", canDelete: true }
          },
          {
            name: "extracurricular_grades",
            list: "/extracurricular/grades",
            meta: { label: "Penilaian & Rapor", parent: "extracurricular", canDelete: true }
          },
        ]}
        options={{
          syncWithLocation: true,
          warnWhenUnsavedChanges: true,
        }}
      >
        <AcademicYearProvider>
          <UnitProvider>
            <Suspense fallback={<PageLoader fullScreen />}>
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
                <Route path="/hbl" element={<Navigate to="/lms" replace />} />
                <Route path="/lms" element={<HblAdminPage />} />
                <Route path="/communications" element={<CommunicationsPage />} />
                <Route path="/communications/email-log" element={<EmailLogPage />} />
                <Route path="/counseling" element={<CounselingPage />} />
                <Route path="/dapodik" element={<DapodikPage />} />
                
                <Route path="/students">
                <Route index element={<StudentsList />} />
                <Route path="create" element={<StudentCreate />} />
                <Route path="edit/:id" element={<StudentEdit />} />
                <Route path="show/:id" element={<StudentShow />} />
                <Route path="mass-promotion" element={<StudentMassPromotion />} />
              </Route>

              <Route path="/parents">
                <Route index element={<ParentsList />} />
                <Route path="requests" element={<ParentPortalRequestsAdmin />} />
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
                  <Route path="events" element={<AttendanceEvents />} />
                  <Route path="overtime" element={<AttendanceOvertime />} />
                  <Route path="settings" element={<AttendanceSettings />} />
                  <Route path="reviews" element={<AttendanceReviews />} />
                  <Route path="reports" element={<AttendanceReports />} />
                </Route>
                <Route path="operations/reports" element={<StaffOperationalReportsAdmin />} />

                <Route path="employees">
                   <Route index element={<EmployeesList />} />
                   <Route path="create" element={<EmployeeCreate />} />
                   <Route path="edit/:id" element={<EmployeeEdit />} />
                   <Route path="show/:id" element={<EmployeeShow />} />
                 </Route>

                <Route path="schedules">
                  <Route index element={<SchedulesList />} />
                  <Route path="patterns" element={<UnitSchedulePatterns />} />
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
                  <Route path="governance" element={<DocumentGovernance />} />
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
                  <Route path="history" element={<ReportExportHistory />} />
                  <Route path="periods">
                    <Route index element={<ReportPeriodsList />} />
                    <Route path="create" element={<ReportPeriodCreate />} />
                    <Route path="edit/:id" element={<ReportPeriodEdit />} />
                    <Route path="show/:id" element={<ReportPeriodShow />} />
                  </Route>
                  <Route path="templates">
                    <Route index element={<ReportTemplatesList />} />
                    <Route path="create" element={<ReportTemplateCreate />} />
                    <Route path="edit/:id" element={<ReportTemplateEdit />} />
                    <Route path="show/:id" element={<ReportTemplateShow />} />
                  </Route>
                  <Route path="generate" element={<ReportGenerator />} />
                  <Route path="teacher-input">
                    <Route index element={<TeacherInputList />} />
                    <Route path=":id" element={<TeacherInputForm />} />
                  </Route>
                  <Route path="homeroom-review">
                    <Route index element={<HomeroomReviewList />} />
                    <Route path=":id" element={<HomeroomReviewForm />} />
                  </Route>
                  <Route path="wakasek-review">
                    <Route index element={<WakasekReviewList />} />
                    <Route path=":id" element={<WakasekReviewForm />} />
                  </Route>
                  <Route path="principal-approval">
                    <Route index element={<PrincipalApprovalList />} />
                    <Route path=":id" element={<PrincipalApprovalForm />} />
                  </Route>
                  <Route path="publish" element={<PublishReportList />} />
                  <Route path="read-receipts" element={<ReadReceiptsList />} />
                  <Route path="pdf" element={<GeneratePDFList />} />
                  <Route path="monitoring" element={<MonitoringDashboard />} />
                </Route>

                {/* Digital Library Routes */}
                <Route path="digital-library">
                  <Route index element={<DigitalLibraryBooksList />} />
                  <Route path="create" element={<DigitalLibraryBooksCreate />} />
                  <Route path="edit/:id" element={<DigitalLibraryBooksEdit />} />
                  <Route path="categories">
                    <Route index element={<DigitalLibraryCategoriesList />} />
                    <Route path="create" element={<DigitalLibraryCategoriesCreate />} />
                    <Route path="edit/:id" element={<DigitalLibraryCategoriesEdit />} />
                  </Route>
                </Route>

                <Route path="onboarding">
                  <Route index element={<OnboardingList />} />
                  <Route path="create" element={<OnboardingCreate />} />
                  <Route path="edit/:id" element={<OnboardingEdit />} />
                  <Route path="show/:id" element={<OnboardingShow />} />
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
                <Route path="/tahfidz-halaqohs">
                  <Route index element={<HalaqohsList />} />
                  <Route path="create" element={<HalaqohForm />} />
                  <Route path="edit/:id" element={<HalaqohForm />} />
                  <Route path="show/:id" element={<HalaqohShow />} />
                </Route>
                <Route path="/tahfidz-student-targets">
                  <Route index element={<TahfidzTargetsList />} />
                  <Route path="create" element={<TahfidzTargetForm />} />
                  <Route path="edit/:id" element={<TahfidzTargetForm />} />
                </Route>
                <Route path="/tahfidz-reports">
                  <Route index element={<TahfidzReportDashboard />} />
                </Route>
                
                {/* Tahsin Routes */}
                <Route path="/tahsin-halaqohs">
                  <Route index element={<TahsinHalaqohsList />} />
                  <Route path="create" element={<TahsinHalaqohForm />} />
                  <Route path="edit/:id" element={<TahsinHalaqohForm />} />
                  <Route path="show/:id" element={<TahsinHalaqohShow />} />
                </Route>
                <Route path="/tahsin-student-targets">
                  <Route index element={<TahsinTargetsList />} />
                  <Route path="create" element={<TahsinTargetForm />} />
                  <Route path="edit/:id" element={<TahsinTargetForm />} />
                </Route>
                <Route path="/tahsin-records">
                  <Route index element={<TahsinRecordsList />} />
                  <Route path="create" element={<TahsinRecordForm />} />
                  <Route path="edit/:id" element={<TahsinRecordForm />} />
                </Route>
                <Route path="/tahsin-assessments">
                  <Route index element={<TahsinAssessmentsList />} />
                  <Route path="create" element={<TahsinAssessmentForm />} />
                  <Route path="edit/:id" element={<TahsinAssessmentForm />} />
                </Route>
                <Route path="/tahsin-reports">
                  <Route index element={<TahsinReportDashboard />} />
                </Route>

                <Route path="/paud" element={<PaudDashboard />} />
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
                  <Route path="quality" element={<CurriculumQualityControl />} />
                  <Route path="hbl" element={<Navigate to="/lms" replace />} />
                  <Route path="subjects">
                    <Route index element={<SubjectsList />} />
                    <Route path="create" element={<SubjectCreate />} />
                    <Route path="edit/:id" element={<SubjectEdit />} />
                    <Route path="show/:id" element={<SubjectShow />} />
                    <Route path="directory" element={<SubjectTeacherDirectory />} />
                  </Route>
                  <Route path="subject-curriculums">
                    <Route path="create" element={<SubjectCurriculumCreate />} />
                    <Route path="edit/:id" element={<SubjectCurriculumEdit />} />
                  </Route>
                  <Route path="paud">
                    <Route index element={<PaudThemeList />} />
                    <Route path="create" element={<PaudThemeCreate />} />
                    <Route path="edit/:id" element={<PaudThemeEdit />} />
                    <Route path="show/:id" element={<PaudThemeShow />} />
                  </Route>
                  <Route path="documents">
                    <Route index element={<CurriculumDocumentsList />} />
                    <Route path="create" element={<CurriculumDocumentCreate />} />
                  </Route>
                </Route>

                <Route path="/finance">
                  <Route index element={<FinanceDashboard />} />
                  <Route path="invoices" element={<InvoicesList />} />
                  <Route path="receipts" element={<FinanceReceipts />} />
                  <Route path="verifications" element={<PaymentVerifications />} />
                  <Route path="expenses" element={<SchoolExpenses />} />
                  <Route path="cashbook" element={<FinanceCashbook />} />
                  <Route path="budgets" element={<FinanceBudgets />} />
                  <Route path="tariffs" element={<FinanceTariffs />} />
                  <Route path="accounting" element={<FinanceAccounting />} />
                  <Route path="reports" element={<FinanceReports />} />
                  <Route path="categories" element={<FinanceCategories />} />
                  <Route path="spmb-fees" element={<SpmbFeesConfig />} />
                  <Route path="settings" element={<FinanceSettings />} />
                </Route>

                <Route path="/mail">
                  <Route index element={<MailDashboard />} />
                  <Route path="incoming" element={<IncomingMailList />} />
                  <Route path="incoming/create" element={<IncomingMailCreate />} />
                  <Route path="outgoing" element={<OutgoingMailList />} />
                  <Route path="outgoing/create" element={<OutgoingMailCreate />} />
                  <Route path="dispositions" element={<DispositionsList />} />
                  <Route path="show/:id" element={<MailShow />} />
                </Route>

                <Route path="/recruitment">
                  <Route index element={<RecruitmentDashboard />} />
                  <Route path="vacancies" element={<VacanciesList />} />
                  <Route path="vacancies/create" element={<VacancyCreate />} />
                  <Route path="vacancies/edit/:id" element={<VacancyEdit />} />
                  <Route path="applicants" element={<ApplicantsList />} />
                  <Route path="applicants/create" element={<ApplicantCreate />} />
                  <Route path="applicants/show/:id" element={<ApplicantShow />} />
                  
                  <Route path="cbt" element={<Navigate to="/recruitment/cbt/banks" replace />} />
                  <Route path="cbt/banks" element={<CbtBanksList />} />
                  <Route path="cbt/banks/:bankId/questions" element={<CbtQuestionsManager />} />
                  <Route path="cbt/exams" element={<CbtExamsList />} />
                  <Route path="cbt/exams/:examId/settings" element={<CbtExamBanksManager />} />
                  <Route path="cbt/results" element={<CbtAttemptsList />} />
                  <Route path="cbt/results/:participantId" element={<CbtAttemptShow />} />
                </Route>

                <Route path="/admissions">
                  <Route index element={<AdmissionsDashboard />} />
                  <Route path="crm" element={<AdmissionCrm />} />
                  <Route path="crm/:id" element={<AdmissionLeadShow />} />
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
                  <Route path="cbt" element={<StudentCbtPage />} />
                  <Route path="cbt/banks" element={<CbtBanksList />} />
                  <Route path="cbt/banks/:bankId/questions" element={<CbtQuestionsManager />} />
                </Route>

                <Route path="/sarpras">
                  <Route index element={<SarprasDashboard />} />
                  <Route path="assets" element={<UnifiedAssetsDashboard />} />
                  <Route path="asset-loans" element={<AssetLoansList />} />
                  <Route path="procurements" element={<ProcurementsList />} />
                  <Route path="rooms" element={<RoomsList />} />
                  <Route path="room-schedules" element={<RoomSchedulesList />} />
                  <Route path="maintenance" element={<MaintenanceList />} />
                  <Route path="stocktakes" element={<StocktakesList />} />
                </Route>

                <Route path="/pkg">
                  <Route index element={<PkgList />} />
                  <Route path="create" element={<PkgCreate />} />
                  <Route path="show/:id" element={<PkgShow />} />
                  <Route path="edit/:id" element={<PkgCreate />} />
                  <Route path="history/:employeeId" element={<PkgHistory />} />
                  <Route path="settings" element={<PkgSettings />} />
                </Route>

                <Route path="/extracurricular">
                  <Route index element={<ExtracurricularDashboard />} />
                  <Route path="programs" element={<ProgramsList />} />
                  <Route path="members" element={<MembersList />} />
                  <Route path="attendance" element={<AttendanceList />} />
                  <Route path="grades" element={<GradesList />} />
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
                <Route path="profile" element={<PortalProfile />} />
                <Route path="attendance" element={<PortalAttendance />} />
                <Route path="requests" element={<PortalRequests />} />
                <Route path="hbl" element={<PortalHbl />} />
                <Route path="extracurricular" element={<PortalExtracurricular />} />
                <Route path="finance" element={<PortalFinance />} />
                <Route path="academic" element={<PortalAcademic />} />
                <Route path="quran" element={<PortalQuran />} />
                <Route path="paud" element={<PortalPaud />} />
                <Route path="journals" element={<PortalJournals />} />
                <Route path="conduct" element={<PortalConduct />} />
                <Route path="library" element={<PortalLibrary />} />
                <Route path="onboarding" element={<PortalOnboarding />} />
                <Route path="announcements" element={<PortalAnnouncements />} />
                <Route path="reports">
                  <Route index element={<ParentReportList />} />
                  <Route path=":id" element={<ParentReportShow />} />
                </Route>
              </Route>

              <Route path="/ekskul-portal/login" element={<ExtracurricularPortalLogin />} />
              <Route path="/ekskul-portal/register" element={<ExtracurricularPortalRegister />} />
              <Route path="/ekskul-portal" element={<ExtracurricularPortalLayout />}>
                <Route index element={<ExtracurricularPortalDashboard />} />
                <Route path="programs" element={<ExtracurricularPortalPrograms />} />
                <Route path="profile" element={<ExtracurricularPortalProfile />} />
              </Route>

              {/* CBT Portal */}
              <Route path="/cbt" element={<CbtPortalLayout />}>
                <Route index element={<CbtPortalLogin />} />
                <Route path="login" element={<CbtPortalLogin />} />
                <Route path="test/:token" element={<CbtPortalTestRoom />} />
              </Route>

              {/* Print Invoice Route (Standalone) */}
              <Route path="/print-invoice/:id" element={<PrintInvoice />} />

              <Route path="/spmb" element={<SpmbLayout />}>
                <Route index element={<SpmbDashboard />} />
                <Route path="login" element={<SpmbLogin />} />
                <Route path="register" element={<SpmbRegister />} />
                <Route path="forgot-password" element={<SpmbForgotPassword />} />
                <Route path="reset-password" element={<SpmbResetPassword />} />
                <Route path="form" element={<SpmbForm />} />
                <Route path="documents" element={<SpmbDocuments />} />
                <Route path="checklist" element={<SpmbChecklist />} />
                <Route path="payment" element={<SpmbPayment />} />
                <Route path="submit" element={<SpmbSubmit />} />
                <Route path="announcement" element={<SpmbAnnouncement />} />
              </Route>

              <Route path="/teacher/login" element={<TeacherLogin />} />
              <Route path="/teacher" element={<TeacherLayout />}>
                <Route index element={<TeacherDashboard />} />
                <Route path="classes" element={<TeacherClasses />} />
                <Route path="reports" element={<TeacherReports />} />
                <Route path="reports/:id" element={<TeacherInputForm />} />
                <Route path="quran" element={<TeacherQuran />} />
                <Route path="paud" element={<TeacherPaud />} />
                <Route path="journals" element={<TeacherJournals />} />
                <Route path="conduct" element={<TeacherConduct />} />
                <Route path="cbt" element={<StudentCbtPage />} />
                <Route path="cbt/banks" element={<CbtBanksList />} />
                <Route path="cbt/banks/:bankId/questions" element={<CbtQuestionsManager />} />
                <Route path="attendance" element={<TeacherAttendance />} />
                <Route path="leaves" element={<TeacherLeaves />} />
                <Route path="schedules" element={<TeacherSchedules />} />
                <Route path="announcements" element={<TeacherAnnouncements />} />
                <Route path="library" element={<TeacherLibrary />} />
                <Route path="onboarding" element={<TeacherOnboarding />} />
                <Route path="tasks" element={<TeacherTasks />} />
                <Route path="performance" element={<TeacherPerformance />} />
                <Route path="profile" element={<TeacherProfile />} />
              </Route>

              <Route path="/staff/login" element={<StaffLogin />} />
              <Route path="/staff" element={<StaffLayout />}>
                <Route index element={<StaffDashboard />} />
                <Route path="attendance" element={<StaffAttendance />} />
                <Route path="leaves" element={<StaffLeaves />} />
                <Route path="announcements" element={<StaffAnnouncements />} />
                <Route path="library" element={<StaffLibrary />} />
                <Route path="onboarding" element={<StaffOnboarding />} />
                <Route path="schedules" element={<StaffSchedules />} />
                <Route path="tasks" element={<StaffTasks />} />
                <Route path="reports" element={<StaffOperationalReports />} />
                <Route path="profile" element={<StaffProfile />} />
              </Route>

              <Route path="/bendahara/login" element={<BendaharaLogin />} />
              <Route path="/bendahara" element={<BendaharaLayout />}>
                <Route index element={<FinanceDashboard />} />
                <Route path="invoices" element={<InvoicesList />} />
                <Route path="receipts" element={<FinanceReceipts />} />
                <Route path="verifications" element={<PaymentVerifications />} />
                <Route path="expenses" element={<SchoolExpenses />} />
                <Route path="cashbook" element={<FinanceCashbook />} />
                <Route path="budgets" element={<FinanceBudgets />} />
                <Route path="tariffs" element={<FinanceTariffs />} />
                <Route path="accounting" element={<FinanceAccounting />} />
                <Route path="reports" element={<FinanceReports />} />
                <Route path="students" element={<StudentsList />} />
                <Route path="categories" element={<FinanceCategories />} />
                <Route path="settings" element={<FinanceSettings />} />
              </Route>

              <Route path="/admin-spmb/login" element={<AdminSpmbLogin />} />
              <Route path="/admin-spmb" element={<AdminSpmbLayout />}>
                <Route index element={<AdmissionsDashboard />} />
                <Route path="crm" element={<AdmissionCrm />} />
                <Route path="crm/:id" element={<AdmissionLeadShow />} />
                <Route path="applicants" element={<AdmissionsApplicantsList />} />
                <Route path="applicants/:id" element={<AdmissionsApplicantShow />} />
                <Route path="reports" element={<AdmissionsReports />} />
                <Route path="settings" element={<AdmissionsSettings />} />
              </Route>

              <Route path="/hrd/login" element={<HrdPortalLogin />} />
              <Route path="/hrd" element={<HrdPortalLayout />}>
                <Route index element={<HrdDashboard />} />
                <Route path="vacancies" element={<VacanciesList />} />
                <Route path="vacancies/create" element={<VacancyCreate />} />
                <Route path="vacancies/edit/:id" element={<VacancyEdit />} />
                <Route path="applicants" element={<ApplicantsList />} />
                <Route path="applicants/create" element={<ApplicantCreate />} />
                <Route path="applicants/show/:id" element={<ApplicantShow />} />
                <Route path="cbt/banks" element={<CbtBanksList />} />
                <Route path="cbt/banks/:bankId/questions" element={<CbtQuestionsManager />} />
                <Route path="cbt/exams" element={<CbtExamsList />} />
                <Route path="cbt/exams/:examId/settings" element={<CbtExamBanksManager />} />
                <Route path="cbt/results" element={<CbtAttemptsList />} />
                <Route path="cbt/results/:participantId" element={<CbtAttemptShow />} />
                <Route path="employees" element={<EmployeesList />} />
                <Route path="employees/create" element={<EmployeeCreate />} />
                <Route path="employees/show/:id" element={<EmployeeShow />} />
                <Route path="employees/edit/:id" element={<EmployeeEdit />} />
              </Route>

              {/* Catch-all route for unknown URLs (404) to prevent blank screen */}
              <Route path="*" element={<NotFoundPage />} />

            </Routes>
            </Suspense>
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
