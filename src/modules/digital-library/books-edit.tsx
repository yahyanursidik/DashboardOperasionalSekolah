import React from "react";
import { useParams } from "react-router";
import { LibraryBookForm } from "./library-book-form";

export const DigitalLibraryBooksEdit: React.FC = () => {
  const { id } = useParams();
  return <LibraryBookForm bookId={id} />;
};
