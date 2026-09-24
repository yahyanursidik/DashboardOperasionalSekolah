import React from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

export type AdmissionProgramHeroSlide = {
  image: string;
  title: string;
  detail: string;
};

const slides: readonly AdmissionProgramHeroSlide[] = [
  { image: "/images/preschool-onsite/classroom.jpg", title: "Ruang belajar yang hangat", detail: "Ruang kegiatan anak yang disiapkan untuk belajar, bermain, dan berinteraksi langsung." },
  { image: "/images/preschool-onsite/playground.jpg", title: "Area bermain luar ruang", detail: "Ruang gerak untuk permainan aktif dan eksplorasi anak di lingkungan sekolah." },
  { image: "/images/preschool-onsite/campus-exterior-01.jpg", title: "Lingkungan Preschool", detail: "Area Preschool Regular / Onsite yang terpisah dan mudah diakses keluarga." },
  { image: "/images/preschool-onsite/campus-exterior-02.jpg", title: "Datang, belajar, dan bertumbuh", detail: "Kegiatan onsite didampingi guru dan terhubung melalui komunikasi rutin dengan orang tua." },
] as const;

export function AdmissionProgramHero({
  programName,
  eyebrow = "Pilihan program Anda",
  slides,
  className = "bg-emerald-950",
  overlayClassName = "from-emerald-950/90 via-emerald-950/60 to-emerald-950/15",
}: {
  programName: string;
  eyebrow?: string;
  slides: readonly AdmissionProgramHeroSlide[];
  className?: string;
  overlayClassName?: string;
}) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const [reduceMotion, setReduceMotion] = React.useState(false);

  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReduceMotion(query.matches);
    updatePreference();
    query.addEventListener("change", updatePreference);
    return () => query.removeEventListener("change", updatePreference);
  }, []);

  React.useEffect(() => {
    if (reduceMotion || isPaused) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [isPaused, reduceMotion]);

  const move = (direction: -1 | 1) => {
    setActiveIndex((current) => (current + direction + slides.length) % slides.length);
  };
  const activeSlide = slides[activeIndex] || slides[0];

  return (
    <section
      className={`relative isolate overflow-hidden rounded-xl text-white shadow-sm ${className}`}
      aria-roledescription="carousel"
      aria-label={`Galeri ${programName}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(false);
      }}
    >
      <div className="absolute inset-0" aria-hidden="true">
        {slides.map((slide, index) => (
          <img
            key={slide.image}
            src={slide.image}
            alt=""
            loading={index === 0 ? "eager" : "lazy"}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 motion-reduce:transition-none ${index === activeIndex ? "opacity-100" : "opacity-0"}`}
          />
        ))}
        <div className={`absolute inset-0 bg-gradient-to-r ${overlayClassName}`} />
      </div>

      <div className="relative min-h-72 p-6 sm:min-h-80 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">{eyebrow}</p>
        <h2 className="mt-2 max-w-md text-2xl font-bold sm:text-3xl">{programName}</h2>
        <div className="mt-8 max-w-sm rounded-lg border border-white/20 bg-slate-950/20 p-4 backdrop-blur-sm">
          <p className="text-lg font-bold">{activeSlide.title}</p>
          <p className="mt-1.5 text-sm leading-6 text-emerald-50">{activeSlide.detail}</p>
        </div>

        <div className="absolute bottom-5 left-6 flex items-center gap-2 sm:left-8">
          <button type="button" onClick={() => move(-1)} className="grid h-9 w-9 place-items-center rounded-full border border-white/35 bg-slate-950/25 text-white transition hover:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-white" aria-label={`Foto ${programName} sebelumnya`}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => move(1)} className="grid h-9 w-9 place-items-center rounded-full border border-white/35 bg-slate-950/25 text-white transition hover:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-white" aria-label={`Foto ${programName} berikutnya`}>
            <ChevronRight className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => setIsPaused((current) => !current)} className="grid h-9 w-9 place-items-center rounded-full border border-white/35 bg-slate-950/25 text-white transition hover:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-white" aria-label={isPaused ? `Putar slideshow ${programName}` : `Jeda slideshow ${programName}`}>
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
          <div className="ml-1 flex gap-1.5" aria-label={`Pilih foto ${programName}`}>
            {slides.map((slide, index) => (
              <button key={slide.image} type="button" onClick={() => setActiveIndex(index)} aria-label={`Tampilkan foto ${programName} ${index + 1}`} aria-current={index === activeIndex ? "true" : undefined} className={`h-1.5 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white ${index === activeIndex ? "w-6 bg-white" : "w-2 bg-white/55 hover:bg-white/85"}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function PreschoolOnsiteHero() {
  return <AdmissionProgramHero programName="Preschool Regular / Onsite" slides={slides} />;
}
