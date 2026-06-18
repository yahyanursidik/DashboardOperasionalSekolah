import React, { useEffect, useState } from "react";
import { supabaseClient } from "../../lib/supabase/client";
import { Megaphone, Calendar, Clock, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const PortalAnnouncements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        // Fetch announcements where status is 'terkirim' and target_type is either 'all' or 'parents'
        const { data, error } = await supabaseClient
          .from("announcements")
          .select("*")
          .eq("status", "terkirim")
          .in("target_type", ["all", "parents"])
          .order("publish_at", { ascending: false })
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (data) setAnnouncements(data);
      } catch (err) {
        console.error("Error fetching announcements:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
            <Megaphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Pusat Pengumuman</h2>
            <p className="text-emerald-50 text-xs opacity-90 mt-0.5">Informasi resmi dari pihak sekolah</p>
          </div>
        </div>
        <div className="absolute -right-4 -bottom-4 opacity-10">
          <Megaphone className="w-32 h-32" />
        </div>
      </div>

      {/* Announcements List */}
      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground animate-pulse flex flex-col items-center">
          <Clock className="w-8 h-8 mb-2 opacity-50" />
          <p>Memuat pengumuman...</p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-500 flex flex-col items-center shadow-sm">
          <AlertCircle className="w-10 h-10 mb-3 text-gray-300" />
          <p className="font-medium text-gray-600">Belum ada pengumuman</p>
          <p className="text-xs mt-1">Belum ada informasi terbaru dari sekolah untuk saat ini.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="bg-white rounded-xl border shadow-sm overflow-hidden hover:border-emerald-200 transition-colors">
              <div className="p-5">
                <div className="flex justify-between items-start gap-4 mb-3">
                  <h3 className="font-bold text-gray-900 text-lg leading-tight">
                    {announcement.title}
                  </h3>
                  <div className="shrink-0 flex flex-col items-end text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium">
                      <Calendar className="w-3 h-3" /> {formatDate(announcement.publish_at || announcement.created_at)}
                    </span>
                    <span className="flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> {formatTime(announcement.publish_at || announcement.created_at)}
                    </span>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">
                  {announcement.content}
                </div>
                
                {/* Visual indicator for Target Type if needed, but not strictly necessary for parents */}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
