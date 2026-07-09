ALTER TABLE public.curriculum_documents
DROP CONSTRAINT IF EXISTS curriculum_documents_document_type_check;

ALTER TABLE public.curriculum_documents
ADD CONSTRAINT curriculum_documents_document_type_check
CHECK (
    document_type IN (
        'SK Kurikulum',
        'Panduan Kurikulum',
        'Template',
        'Referensi',
        'PDF Final',
        'Lainnya',
        'Modul Ajar',
        'ATP',
        'CP'
    )
);
