-- Allow active teacher/staff portal accounts to receive published announcements.
-- Existing admin policies remain unchanged; this only grants SELECT for scoped, published messages.

CREATE POLICY "Active employees read scoped announcements"
ON public.announcements
FOR SELECT TO authenticated
USING (
  status = 'terkirim'
  AND EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.user_id = auth.uid()
      AND e.status = 'active'
      AND (
        public.announcements.target_type = 'staff'
        OR public.announcements.target_type = 'all'
        OR (
          public.announcements.target_type = 'unit'
          AND (
            public.announcements.unit_id IS NULL
            OR public.announcements.unit_id = e.unit_id
          )
        )
        OR (
          public.announcements.target_type = 'class'
          AND (
            EXISTS (
              SELECT 1
              FROM public.employee_schedules es
              WHERE es.employee_id = e.id
                AND es.class_id = public.announcements.class_id
            )
            OR EXISTS (
              SELECT 1
              FROM public.classes c
              WHERE c.id = public.announcements.class_id
                AND c.homeroom_teacher_id = e.id
            )
          )
        )
      )
  )
);
