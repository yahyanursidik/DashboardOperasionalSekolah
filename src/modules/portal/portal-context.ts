export type ParentPortalParent = {
  id: string;
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  nik?: string | null;
  occupation?: string | null;
};

export type ParentPortalStudent = {
  id: string;
  full_name?: string | null;
  nis?: string | null;
  nisn?: string | null;
  class_id?: string | null;
  unit_id?: string | null;
  status?: string | null;
  gender?: string | null;
  photo_url?: string | null;
  photoUrl?: string | null;
  relationship?: string | null;
  is_primary_guardian?: boolean;
  classes?: {
    id?: string;
    name?: string | null;
    unit_id?: string | null;
    units?: { name?: string | null } | null;
  } | null;
  [key: string]: unknown;
};

export type ParentPortalContext = {
  parent: ParentPortalParent;
  student: ParentPortalStudent;
  students: ParentPortalStudent[];
  selectedStudentId: string;
  setSelectedStudentId: (studentId: string) => void;
  unreadAnnouncements: number;
  refreshUnreadAnnouncements: () => Promise<void>;
};
