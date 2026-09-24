import { AdmissionProgramHero, type AdmissionProgramHeroSlide } from "./preschool-onsite-hero";

const slides: readonly AdmissionProgramHeroSlide[] = [
  { image: "/images/preschool-hbl/science-live-session.jpg", title: "Eksperimen bersama dari rumah", detail: "Anak mengikuti penjelasan guru lalu mencoba kegiatan sederhana bersama pendamping di rumah." },
  { image: "/images/preschool-hbl/adab-live-session.jpg", title: "Belajar adab dengan cara yang ramah anak", detail: "Materi visual membantu keluarga melanjutkan percakapan dan praktik baik setelah sesi belajar." },
  { image: "/images/preschool-hbl/home-project-session.jpg", title: "Karya dan proyek rumah", detail: "Instruksi aktivitas dapat diikuti sesuai ritme keluarga, lalu hasilnya dibagikan pada guru melalui portal." },
];

export function PreschoolHblHero() {
  return <AdmissionProgramHero
    programName="Preschool Homebased Learning"
    eyebrow="Belajar bersama keluarga"
    slides={slides}
    className="bg-sky-950"
    overlayClassName="from-sky-950/90 via-indigo-950/65 to-sky-950/15"
  />;
}
