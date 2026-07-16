import React from "react";
import { useParams } from "react-router-dom";
import { LibraryCategoryForm } from "./library-category-form";

export const DigitalLibraryCategoriesEdit: React.FC = () => {
  const { id } = useParams();
  return <LibraryCategoryForm categoryId={id} />;
};
