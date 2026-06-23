-- Mengubah semua relasi Foreign Key yang mengarah ke tabel students
-- agar menjadi ON DELETE CASCADE secara otomatis.
-- Hal ini memungkinkan kita untuk menghapus data siswa dan semua data
-- terkait (absen, ekskul, tagihan) akan ikut terhapus otomatis.

DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT
            tc.table_name,
            tc.constraint_name,
            kcu.column_name
        FROM
            information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.referential_constraints AS rc
              ON tc.constraint_name = rc.constraint_name
              AND tc.table_schema = rc.constraint_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE ccu.table_name = 'students'
          AND rc.delete_rule != 'CASCADE'
    LOOP
        EXECUTE format(
            'ALTER TABLE %I DROP CONSTRAINT %I, ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES students(id) ON DELETE CASCADE',
            rec.table_name, rec.constraint_name, rec.constraint_name, rec.column_name
        );
    END LOOP;
END;
$$;
