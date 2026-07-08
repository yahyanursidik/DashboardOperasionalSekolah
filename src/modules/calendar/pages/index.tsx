import React, { useState, useEffect } from "react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, AlertCircle, Clock, Info, X, Save } from "lucide-react";
import { supabaseClient } from "../../../lib/supabase/client";
import { useCreate } from "@refinedev/core";
import { toast } from "sonner";

interface HijriDetails {
  day: number;
  month: string;
  year: number;
  monthIndex: number;
}

// Map Intl format month names to more standard Indonesian/Islamic ones
const hijriMonthNames: Record<string, string> = {
  "Muharram": "Muharam",
  "Safar": "Safar",
  "Rabi' I": "Rabiulawal",
  "Rabi' II": "Rabiulakhir",
  "Jumada I": "Jumadilawal",
  "Jumada II": "Jumadilakhir",
  "Rajab": "Rajab",
  "Sha'ban": "Syakban",
  "Ramadan": "Ramadan",
  "Shawwal": "Syawal",
  "Dhuʻl-Qiʻdah": "Zulkaidah",
  "Dhuʻl-Hijjah": "Zulhijah"
};

const toArabicNumeral = (num: number): string => {
  return new Intl.NumberFormat('ar-SA').format(num);
};

const getHijriDateDetails = (date: Date): HijriDetails => {
  // Using English locale first to get predictable format for parsing
  const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  
  const parts = formatter.formatToParts(date);
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1', 10);
  const rawMonth = parts.find(p => p.type === 'month')?.value || '';
  const yearStr = parts.find(p => p.type === 'year')?.value || '';
  const year = parseInt(yearStr.split(' ')[0], 10); // Handle "1445 AH"

  const month = hijriMonthNames[rawMonth] || rawMonth;
  const monthIndex = Object.keys(hijriMonthNames).indexOf(rawMonth);

  return { day, month, year, monthIndex };
};

export const AcademicCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // New event form state
  const [newEvent, setNewEvent] = useState({
    title: "",
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    color: "#10b981", // Emerald
    type: "custom"
  });

  const { mutate: createEvent, isLoading: isCreating } = useCreate();

  // Determine current viewing month & year (Gregorian base)
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-11

  // Fetch Custom Events
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        
        // Go back/forward to cover the whole grid
        firstDay.setDate(firstDay.getDate() - 7);
        lastDay.setDate(lastDay.getDate() + 7);

        const { data, error } = await supabaseClient
          .from("calendar_events")
          .select("*")
          .gte("start_date", firstDay.toISOString())
          .lte("start_date", lastDay.toISOString());

        if (!error && data) {
          setEvents(data);
        }
      } catch (err) {
        console.error("No custom events loaded. Make sure table exists.");
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [currentYear, currentMonth]);

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    createEvent({
      resource: "calendar_events",
      values: newEvent,
    }, {
      onSuccess: () => {
        toast.success("Event berhasil ditambahkan!");
        setIsAddModalOpen(false);
        // Optimistically add to events list
        setEvents(prev => [...prev, newEvent]);
        setNewEvent({ ...newEvent, title: "" });
      },
      onError: (err) => {
        toast.error("Gagal menambahkan event", { description: err.message });
      }
    });
  };

  const generateGrid = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Mon=0, Sun=6
    
    const days = [];
    
    // Previous month filler
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - 1, prevMonthLastDay - i);
      days.push({ date, isCurrentMonth: false });
    }
    
    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(currentYear, currentMonth, i);
      days.push({ date, isCurrentMonth: true });
    }
    
    // Next month filler
    let nextMonthDay = 1;
    while (days.length % 7 !== 0) {
      const date = new Date(currentYear, currentMonth + 1, nextMonthDay++);
      days.push({ date, isCurrentMonth: false });
    }
    
    return days;
  };

  const getIslamicEvents = (date: Date, hijri: HijriDetails) => {
    const eventsList = [];
    const gregorianDayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ..., 4=Thu

    // Puasa Sunnah Senin Kamis
    if (gregorianDayOfWeek === 1 || gregorianDayOfWeek === 4) {
      // Except if it's forbidden days (Tasyrik, Idul Fitri, Idul Adha)
      const isForbidden = 
        (hijri.month === "Syawal" && hijri.day === 1) ||
        (hijri.month === "Zulhijah" && hijri.day >= 10 && hijri.day <= 13);
      
      if (!isForbidden) {
        eventsList.push({ title: "Puasa Sunnah", type: "sunnah" });
      }
    }

    // Ayyamul Bidh (13, 14, 15)
    if (hijri.day >= 13 && hijri.day <= 15) {
      if (hijri.month !== "Ramadan" && hijri.month !== "Zulhijah") { // Simplify logic
        eventsList.push({ title: "Ayyamul Bidh", type: "sunnah" });
      }
    }

    // Major Events
    if (hijri.month === "Ramadan") {
      if (hijri.day === 1) eventsList.push({ title: "Awal Ramadhan", type: "islamic" });
    } else if (hijri.month === "Syawal" && hijri.day === 1) {
      eventsList.push({ title: "Idul Fitri", type: "islamic" });
    } else if (hijri.month === "Zulhijah") {
      if (hijri.day === 9) eventsList.push({ title: "Puasa Arafah", type: "islamic" });
      if (hijri.day === 10) eventsList.push({ title: "Idul Adha", type: "islamic" });
      if (hijri.day >= 11 && hijri.day <= 13) eventsList.push({ title: "Hari Tasyrik", type: "islamic" });
    } else if (hijri.month === "Muharam") {
      if (hijri.day === 1) eventsList.push({ title: "Tahun Baru Hijriah", type: "islamic" });
      if (hijri.day === 9) eventsList.push({ title: "Puasa Tasu'a", type: "islamic" });
      if (hijri.day === 10) eventsList.push({ title: "Puasa Asyura", type: "islamic" });
    } else if (hijri.month === "Rabiulawal" && hijri.day === 12) {
      eventsList.push({ title: "Maulid Nabi", type: "islamic" });
    } else if (hijri.month === "Rajab" && hijri.day === 27) {
      eventsList.push({ title: "Isra' Mi'raj", type: "islamic" });
    }

    return eventsList;
  };

  const getCustomEvents = (date: Date) => {
    const targetDate = date.toISOString().split('T')[0];
    return events.filter(e => e.start_date === targetDate || (e.start_date <= targetDate && e.end_date >= targetDate));
  };

  const nextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  const today = () => setCurrentDate(new Date());

  const gridDays = generateGrid();
  const weekDays = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Ahad"];

  // To display the Hijri month header (based on the middle of the Gregorian month)
  const midMonthDate = new Date(currentYear, currentMonth, 15);
  const midHijri = getHijriDateDetails(midMonthDate);

  // Generate Upcoming Events for Sidebar
  const upcomingEvents = [];
  const todayDate = new Date();
  todayDate.setHours(0,0,0,0);
  
  for (let i = 0; i < 30; i++) {
    const d = new Date(todayDate);
    d.setDate(d.getDate() + i);
    const h = getHijriDateDetails(d);
    const isls = getIslamicEvents(d, h);
    if (isls.length > 0 && isls.some(i => i.type === "islamic")) {
      upcomingEvents.push({ date: d, title: isls.find(i=>i.type==="islamic")?.title || "", type: "islamic" });
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader 
        title="Kalender Akademik Dual" 
        description="Masehi & Hijriah (Umm al-Qura)" 
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Main Calendar View */}
        <div className="xl:col-span-3 bg-white border shadow-sm rounded-xl overflow-hidden flex flex-col h-[800px]">
          {/* Header Controls */}
          <div className="p-4 border-b flex justify-between items-center bg-muted/20 shrink-0">
            <div className="flex items-center gap-2">
              <button onClick={today} className="px-3 py-1.5 text-sm border bg-white rounded-md hover:bg-muted font-medium shadow-sm transition-colors">
                Hari Ini
              </button>
              <div className="flex bg-white border rounded-md overflow-hidden shadow-sm">
                <button onClick={prevMonth} className="p-1.5 hover:bg-muted transition-colors border-r"><ChevronLeft className="w-5 h-5"/></button>
                <button onClick={nextMonth} className="p-1.5 hover:bg-muted transition-colors"><ChevronRight className="w-5 h-5"/></button>
              </div>
            </div>
            
            <div className="text-center">
              <h2 className="text-xl font-bold font-serif text-emerald-900 tracking-wide" dir="rtl">
                {midHijri.month} {toArabicNumeral(midHijri.year)} H
              </h2>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            
            <div>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4"/> Tambah Event
              </button>
            </div>
          </div>

          {/* Grid Headers */}
          <div className="grid grid-cols-7 border-b bg-emerald-50 shrink-0">
            {weekDays.map(day => (
              <div key={day} className={`p-3 text-center text-xs font-bold uppercase tracking-wider ${day === 'Ahad' ? 'text-red-600' : 'text-emerald-800'}`}>
                {day}
              </div>
            ))}
          </div>

          {/* Grid Body */}
          <div className="flex-1 grid grid-cols-7 grid-rows-6">
            {gridDays.map((dayObj, index) => {
              const { date, isCurrentMonth } = dayObj;
              const hijri = getHijriDateDetails(date);
              const isToday = new Date().toDateString() === date.toDateString();
              const isSunday = date.getDay() === 0;
              
              const islmEvents = getIslamicEvents(date, hijri);
              const custEvents = getCustomEvents(date);
              const hasPuasa = islmEvents.some(e => e.type === "sunnah");

              return (
                <div 
                  key={index} 
                  className={`border-r border-b p-2 flex flex-col relative transition-colors ${!isCurrentMonth ? 'bg-muted/30 opacity-60' : 'hover:bg-emerald-50/50'} ${isToday ? 'bg-emerald-100/50' : ''}`}
                >
                  {/* Gregorian Date (Small in Corner) */}
                  <div className={`absolute top-2 right-2 text-xs font-semibold ${isSunday ? 'text-red-500' : 'text-slate-400'}`}>
                    {date.getDate()} {date.toLocaleDateString('id-ID', {month: 'short'})}
                  </div>

                  {/* Hijri Date (Huge in Center) */}
                  <div className={`mt-4 text-center ${isSunday ? 'text-red-700' : isToday ? 'text-emerald-700' : 'text-slate-800'}`}>
                    <span className="text-3xl font-black font-serif leading-none block">{toArabicNumeral(hijri.day)}</span>
                    <span className="block text-[10px] uppercase font-bold text-slate-500 mt-1">{hijri.month}</span>
                  </div>

                  {/* Events Container */}
                  <div className="mt-auto pt-2 space-y-1 overflow-y-auto">
                    {hasPuasa && (
                      <div className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center truncate">
                        🌙 Puasa Sunnah
                      </div>
                    )}
                    {islmEvents.filter(e => e.type === "islamic").map((e, i) => (
                      <div key={`i-${i}`} className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-800 border border-emerald-200 text-center truncate shadow-sm">
                        ⭐ {e.title}
                      </div>
                    ))}
                    {custEvents.map((e, i) => (
                      <div key={`c-${i}`} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm text-white text-center truncate shadow-sm`} style={{ backgroundColor: e.color || '#ef4444' }}>
                        {e.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar Panel */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-card rounded-xl border shadow-sm p-5">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 border-b pb-2">
              <Clock className="w-5 h-5 text-emerald-600" /> Akan Datang
            </h3>
            
            <div className="space-y-4">
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Tidak ada event dalam 30 hari ke depan.</p>
              ) : (
                upcomingEvents.slice(0, 5).map((evt, idx) => (
                  <div key={idx} className="flex gap-3 items-start p-2 hover:bg-muted/50 rounded-lg transition-colors border border-transparent hover:border-border cursor-default">
                    <div className="bg-emerald-100 text-emerald-800 rounded-lg p-2 text-center min-w-[3rem] shrink-0">
                      <span className="block text-xs font-bold uppercase">{evt.date.toLocaleDateString('id-ID', {month: 'short'})}</span>
                      <span className="block text-lg font-black leading-none mt-1">{evt.date.getDate()}</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">{evt.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5" dir="rtl">
                        {toArabicNumeral(getHijriDateDetails(evt.date).day)} {getHijriDateDetails(evt.date).month} {toArabicNumeral(getHijriDateDetails(evt.date).year)} H
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <button className="w-full mt-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
              Lihat Semua Agenda
            </button>
          </div>

          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <h4 className="font-bold text-amber-800 flex items-center gap-2 mb-2 text-sm">
              <Info className="w-4 h-4"/> Informasi Penentuan
            </h4>
            <p className="text-xs text-amber-700/80 leading-relaxed">
              Kalender Hijriah ini menggunakan metode hisab (Umm al-Qura). Untuk penentuan 1 Ramadhan, Idul Fitri, dan Idul Adha secara resmi, harap tetap mengikuti <strong>Sidang Isbat</strong> Kementerian Agama RI atau rujukan resmi sekolah.
            </p>
          </div>
        </div>

      </div>

      {/* Add Event Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b bg-muted/30">
              <h3 className="font-bold text-lg flex items-center gap-2 text-foreground">
                <CalendarIcon className="w-5 h-5 text-emerald-600" />
                Tambah Event / Agenda
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-muted-foreground hover:bg-muted p-1.5 rounded-md transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateEvent} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-muted-foreground">Judul Agenda <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  value={newEvent.title}
                  onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                  className="w-full border border-input rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-background transition-all"
                  placeholder="Contoh: Penilaian Tengah Semester"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-muted-foreground">Tanggal Mulai <span className="text-red-500">*</span></label>
                  <input 
                    type="date" 
                    required
                    value={newEvent.start_date}
                    onChange={e => setNewEvent({...newEvent, start_date: e.target.value})}
                    className="w-full border border-input rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-background transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-muted-foreground">Tanggal Selesai <span className="text-red-500">*</span></label>
                  <input 
                    type="date" 
                    required
                    value={newEvent.end_date}
                    onChange={e => setNewEvent({...newEvent, end_date: e.target.value})}
                    className="w-full border border-input rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-background transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-muted-foreground">Warna Label</label>
                <div className="flex gap-3 mt-1">
                  {[
                    { c: '#10b981', n: 'Emerald' },
                    { c: '#3b82f6', n: 'Blue' },
                    { c: '#f59e0b', n: 'Amber' },
                    { c: '#ef4444', n: 'Rose' },
                    { c: '#8b5cf6', n: 'Purple' },
                  ].map(color => (
                    <button
                      key={color.c}
                      type="button"
                      onClick={() => setNewEvent({...newEvent, color: color.c})}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${newEvent.color === color.c ? 'border-foreground scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: color.c }}
                      title={color.n}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border rounded-xl text-sm font-bold hover:bg-muted transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isCreating}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4"/>
                  {isCreating ? "Menyimpan..." : "Simpan Agenda"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
