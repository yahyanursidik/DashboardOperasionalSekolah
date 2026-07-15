/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { useOutletContext } from "react-router-dom";
import { EmployeeSelfAttendance } from "../attendance/components/employee-self-attendance";

export const TeacherAttendance: React.FC = () => {
  const { employee } = useOutletContext<any>();
  return <EmployeeSelfAttendance employee={employee} portal="teacher" showSubstitutes />;
};
