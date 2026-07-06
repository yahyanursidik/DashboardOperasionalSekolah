import React, { useEffect, useState, useMemo } from "react";
import { supabaseClient } from "../../lib/supabase/client";
import { 
  FileText, 
  Video, 
  Image as ImageIcon, 
  Music, 
  PlayCircle,
  HardDrive,
  Cloud,
  Search,
  X,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

export const PortalOnboarding: React.FC = () => {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<any | null>(null);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const { data, error } = await supabaseClient
          .from("onboarding_materials")
          .select("*")
          .eq("status", "published")
          .order("order_index", { ascending: true })
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (data) setMaterials(data);
      } catch (err: any) {
        toast.error("Gagal memuat materi: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, []);

  const getIcon = (type: string, className = "w-8 h-8") => {
    switch (type) {
      case 'pdf': return <FileText className={`${className} text-red-500`} />;
      case 'video': return <Video className={`${className} text-blue-500`} />;
      case 'image': return <ImageIcon className={`${className} text-emerald-500`} />;
      case 'audio': return <Music className={`${className} text-purple-500`} />;
      case 'youtube': return <PlayCircle className={`${className} text-red-600`} />;
      case 'gdrive': return <HardDrive className={`${className} text-yellow-500`} />;
      case 's3_link': return <Cloud className={`${className} text-cyan-500`} />;
      default: return <FileText className={`${className} text-gray-500`} />;
    }
  };

  const getMaterialLabel = (type: string) => {
    const labels: Record<string, string> = {
      pdf: 'Dokumen',
      video: 'Video',
      image: 'Gambar',
      audio: 'Audio',
      youtube: 'YouTube',
      gdrive: 'G-Drive',
      s3_link: 'S3 Contabo'
    };
    return labels[type] || type.toUpperCase();
  };

  const filteredMaterials = useMemo(() => {
    return materials.filter(material => {
      const matchesSearch = 
        material.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (material.description && material.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = selectedType === "all" || material.material_type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [materials, searchTerm, selectedType]);

  const uniqueTypes = useMemo(() => {
    const types = new Set(materials.map(m => m.material_type));
    return Array.from(types);
  }, [materials]);

  const renderViewer = (material: any) => {
    if (!material) return null;
    const { material_type, file_url } = material;

    const getEmbedUrl = (url: string) => {
      if (!url) return url;
      const gdriveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (gdriveMatch) {
        return `https://drive.google.com/file/d/${gdriveMatch[1]}/preview`;
      }
      return url;
    };

    const embedUrl = getEmbedUrl(file_url);

    switch (material_type) {
      case "pdf":
        return <iframe src={embedUrl} className="w-full h-[65vh] rounded-xl border bg-white shadow-inner" title="PDF Viewer" />;
      case "audio":
        return (
          <div className="w-full max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
             <Music className="w-16 h-16 text-purple-400 mb-6 animate-pulse" />
             <audio controls src={file_url} className="w-full" autoPlay />
          </div>
        );
      case "video":
        return <video controls src={file_url} className="w-full max-h-[70vh] rounded-xl bg-black shadow-lg" autoPlay />;
      case "image":
        return <img src={file_url} alt="Onboarding" className="w-full max-h-[70vh] object-contain rounded-xl shadow-md" />;
      case "youtube":
        const videoIdMatch = file_url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
        const videoId = videoIdMatch ? videoIdMatch[1] : null;
        if (videoId) {
          return (
             <iframe 
               className="w-full h-[65vh] rounded-xl shadow-lg border-0"
               src={`https://www.youtube.com/embed/${videoId}?autoplay=1`} 
               title="YouTube video player" 
               allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
               allowFullScreen
             />
          );
        }
        return <p className="text-red-500 text-center p-4">URL YouTube tidak valid</p>;
      case "gdrive":
        return <iframe src={embedUrl} className="w-full h-[65vh] rounded-xl border bg-white shadow-inner" title="Google Drive Viewer" />;
      case "s3_link":
        const isPdf = file_url.toLowerCase().split('?')[0].endsWith('.pdf');
        const isImage = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(file_url);
        const isVideo = /\.(mp4|webm|ogg)(\?.*)?$/i.test(file_url);
        const isAudio = /\.(mp3|wav|ogg)(\?.*)?$/i.test(file_url);
        
        if (isPdf) return <iframe src={embedUrl} className="w-full h-[65vh] rounded-xl border bg-white shadow-inner" title="S3 PDF Viewer" />;
        if (isImage) return <img src={file_url} alt="Preview" className="w-full max-h-[70vh] object-contain rounded-xl shadow-md" />;
        if (isVideo) return <video controls src={file_url} className="w-full max-h-[70vh] rounded-xl bg-black shadow-lg" autoPlay />;
        if (isAudio) return (
           <div className="w-full max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
             <Music className="w-16 h-16 text-cyan-400 mb-6 animate-pulse" />
             <audio controls src={file_url} className="w-full" autoPlay />
          </div>
        );
        return <iframe src={file_url} className="w-full h-[65vh] rounded-xl border bg-white shadow-inner" title="S3 Viewer" />;
      default:
        return <p className="text-center p-4">Tipe materi tidak didukung</p>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-emerald-600">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
        <p className="font-medium animate-pulse">Memuat materi edukasi...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 rounded-3xl p-8 md:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transform translate-x-10 -translate-y-10">
          <Sparkles className="w-64 h-64" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3 tracking-tight">Materi Onboarding</h1>
          <p className="text-emerald-50 text-lg md:text-xl font-light opacity-90 leading-relaxed">
            Selamat datang di Portal Informasi! Pelajari berbagai panduan dan materi pengenalan sekolah kami.
          </p>
        </div>
      </div>

      {materials.length === 0 ? (
        <div className="text-center p-16 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <FileText className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Belum Ada Materi</h3>
          <p className="text-gray-500 max-w-sm">Materi onboarding saat ini sedang disiapkan. Silakan kembali lagi nanti.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Filters & Search */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedType("all")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedType === "all" 
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-200" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Semua Materi
              </button>
              {uniqueTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                    selectedType === type 
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-200" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {getIcon(type, "w-4 h-4")}
                  {getMaterialLabel(type)}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Cari materi..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Grid Layout */}
          {filteredMaterials.length === 0 ? (
             <div className="text-center p-12 bg-white/50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-gray-500">Tidak ada materi yang sesuai dengan pencarian Anda.</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMaterials.map((material) => (
                <div 
                  key={material.id} 
                  onClick={() => setSelectedMaterial(material)}
                  className="group bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="p-3.5 bg-gray-50 rounded-xl group-hover:bg-white group-hover:shadow-md transition-all duration-300">
                      {getIcon(material.material_type, "w-8 h-8")}
                    </div>
                    <div className="flex-1 pt-1">
                      <span className="inline-block mb-1.5 text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md tracking-wider group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors">
                        {getMaterialLabel(material.material_type).toUpperCase()}
                      </span>
                      <h3 className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-2 text-lg leading-snug">
                        {material.title}
                      </h3>
                    </div>
                  </div>
                  {material.description && (
                    <p className="text-sm text-gray-500 line-clamp-3 flex-1 mt-2 mb-4 leading-relaxed">
                      {material.description}
                    </p>
                  )}
                  <div className="mt-auto pt-4 border-t border-gray-50 flex items-center text-emerald-600 text-sm font-semibold group-hover:text-emerald-700">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 mr-2 group-hover:bg-emerald-100 transition-colors">
                       <PlayCircle className="w-4 h-4" />
                    </div>
                    Buka Materi
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Enhanced Viewer Modal */}
      {selectedMaterial && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-md transition-opacity duration-300" 
          onClick={() => setSelectedMaterial(null)}
        >
          <div 
            className="bg-white rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh] transform transition-all duration-300 scale-100 opacity-100" 
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 md:p-6 border-b flex justify-between items-start bg-white relative z-10 shadow-sm">
              <div className="flex items-start gap-4 pr-12">
                <div className="p-3 bg-emerald-50 rounded-xl hidden sm:block">
                   {getIcon(selectedMaterial.material_type, "w-8 h-8")}
                </div>
                <div>
                  <h3 className="font-bold text-xl md:text-2xl text-gray-900 leading-tight mb-1">{selectedMaterial.title}</h3>
                  {selectedMaterial.description && (
                    <p className="text-sm text-gray-500 leading-relaxed">{selectedMaterial.description}</p>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setSelectedMaterial(null)}
                className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 md:p-6 bg-gray-50 flex-1 overflow-auto flex items-center justify-center relative">
              {renderViewer(selectedMaterial)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
