-- Allow active employee portal users to manage only their own attendance rows.

CREATE POLICY "Active employees insert own attendance"
ON public.employee_attendance
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.id = public.employee_attendance.employee_id
      AND e.user_id = auth.uid()
      AND e.status = 'active'
  )
);

CREATE POLICY "Active employees update own attendance"
ON public.employee_attendance
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.id = public.employee_attendance.employee_id
      AND e.user_id = auth.uid()
      AND e.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.id = public.employee_attendance.employee_id
      AND e.user_id = auth.uid()
      AND e.status = 'active'
  )
);
