import React from "react";
import { useShow } from "@refinedev/core";
import { useNavigate, Link } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ArrowLeft, Edit, ChevronRight } from "lucide-react";

export const OnboardingShow: React.FC = () => {
  const navigate = useNavigate();
  const { queryResult } = useShow({
    resource: "onboarding_materials",
  });
  const { data, isLoading } = queryResult;

  const record = data?.data;

  if (isLoading) {
    return (
      <div className="p-12 flex justify-center items-center gap-3 text-gray-500">
        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        Memuat data...
      </div>
    );
  }

  if (!record) {
    return <div className="p-12 text-center text-gray-500">Data tidak ditemukan.</div>;
  }

  const renderViewer = () => {
    const { material_type, file_url } = record;

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
        return <iframe src={embedUrl} className="w-full h-[600px] border-0 rounded-lg shadow-inner bg-gray-50" title="PDF Viewer" />;
      case "audio":
        return <audio controls src={file_url} className="w-full max-w-2xl" />;
      case "video":
        return <video controls src={file_url} className="w-full max-h-[600px] bg-black rounded-lg shadow-inner" />;
      case "image":
        return <img src={file_url} alt="Onboarding" className="max-w-full max-h-[600px] object-contain rounded-lg shadow-sm" />;
      case "youtube":
        const videoIdMatch = file_url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
        const videoId = videoIdMatch ? videoIdMatch[1] : null;
        if (videoId) {
          return (
             <iframe 
               className="w-full h-[600px] border-0 rounded-lg shadow-inner"
               src={`https://www.youtube.com/embed/${videoId}`} 
               title="YouTube video player" 
               allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
               allowFullScreen
             />
          );
        }
        return <p className="text-red-500 text-center">URL YouTube tidak valid</p>;
      case "gdrive":
        return <iframe src={embedUrl} className="w-full h-[600px] border-0 rounded-lg shadow-inner bg-gray-50" title="Google Drive Viewer" />;
      case "s3_link":
        const isPdf = file_url.toLowerCase().split('?')[0].endsWith('.pdf');
        const isImage = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(file_url);
        const isVideo = /\.(mp4|webm|ogg)(\?.*)?$/i.test(file_url);
        const isAudio = /\.(mp3|wav|ogg)(\?.*)?$/i.test(file_url);
        
        if (isPdf) return <iframe src={embedUrl} className="w-full h-[600px] border-0 rounded-lg bg-gray-50 shadow-inner" title="S3 PDF Viewer" />;
        if (isImage) return <img src={file_url} alt="Preview" className="max-w-full max-h-[600px] object-contain rounded-lg shadow-sm" />;
        if (isVideo) return <video controls src={file_url} className="w-full max-h-[600px] bg-black rounded-lg shadow-inner" />;
        if (isAudio) return <audio controls src={file_url} className="w-full max-w-2xl" />;
        return <iframe src={file_url} className="w-full h-[600px] border-0 rounded-lg bg-gray-50 shadow-inner" title="S3 Viewer" />;
      default:
        return <p className="text-gray-500 text-center">Tipe materi tidak didukung</p>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center text-sm text-gray-500 mb-2">
        <Link to="/" className="hover:text-primary transition-colors">Dashboard</Link>
        <ChevronRight className="w-4 h-4 mx-1" />
        <Link to="/onboarding" className="hover:text-primary transition-colors">Onboarding</Link>
        <ChevronRight className="w-4 h-4 mx-1" />
        <span className="text-gray-900 font-medium">Detail Materi</span>
      </div>

      <PageHeader
        title="Detail Materi Onboarding"
        description="Lihat tampilan materi sebelum dipublikasikan ke orang tua dan siswa."
        action={
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/onboarding")}
              className="flex items-center gap-2 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm font-medium text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </button>
            <button
              onClick={() => navigate(`/onboarding/edit/${record.id}`)}
              className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-lg hover:bg-emerald-100 transition-colors shadow-sm font-medium text-sm"
            >
              <Edit className="w-4 h-4" />
              Edit Materi
            </button>
          </div>
        }
      />

      <div className="bg-white rounded-xl border shadow-sm max-w-5xl mx-auto overflow-hidden">
        <div className="p-6 md:p-8 border-b bg-gray-50/50">
          <div className="flex justify-between items-start mb-3 gap-4">
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">{record.title}</h2>
            <div className="flex gap-2 shrink-0">
              <span className="px-3 py-1.5 text-xs font-semibold bg-gray-200 text-gray-700 rounded-lg uppercase tracking-wider">
                {record.material_type === 's3_link' ? 'S3 CONTABO' : record.material_type}
              </span>
              <span className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${record.status === 'published' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                {record.status === 'published' ? 'DIPUBLIKASIKAN' : 'DRAFT'}
              </span>
            </div>
          </div>
          {record.description && (
            <p className="text-gray-600 max-w-3xl leading-relaxed">{record.description}</p>
          )}
        </div>
        
        <div className="p-6 bg-gray-100 min-h-[500px] flex items-center justify-center">
          {renderViewer()}
        </div>
      </div>
    </div>
  );
};
