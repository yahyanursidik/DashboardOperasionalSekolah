import React, { useEffect, useState } from "react";
import { supabaseClient } from "../../lib/supabase/client";
import { Search, Book, ExternalLink, BookOpen, Loader2 } from "lucide-react";

export const PortalLibrary: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLibraryData = async () => {
      try {
        setIsLoading(true);
        // Fetch categories
        const { data: catData } = await supabaseClient
          .from("digital_library_categories")
          .select("*")
          .order("name");

        if (catData) setCategories(catData);

        // Fetch active books
        const { data: bookData } = await supabaseClient
          .from("digital_library_books")
          .select("*, digital_library_categories(name)")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (bookData) setBooks(bookData);
      } catch (error) {
        console.error("Error fetching library:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLibraryData();
  }, []);

  const filteredBooks = books.filter((book) => {
    const matchesCategory = activeCategory === "all" || book.category_id === activeCategory;
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          book.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-emerald-600">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p className="text-sm font-medium">Memuat Perpustakaan...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-emerald-600 text-white p-6 rounded-b-[2rem] shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-2">Perpustakaan Digital</h2>
          <p className="text-emerald-50 text-sm opacity-90">Jelajahi koleksi buku dan materi belajar untuk mendampingi Ananda.</p>
          
          <div className="mt-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600/50" />
            <input 
              type="text" 
              placeholder="Cari judul atau penulis buku..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-gray-900 border-none shadow-sm focus:ring-2 focus:ring-emerald-400 placeholder:text-gray-400"
            />
          </div>
        </div>
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <BookOpen className="w-32 h-32 transform rotate-12" />
        </div>
      </div>

      <div className="p-4 space-y-6 mt-2">
        {/* Categories Horizontal Scroll */}
        <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2 -mx-4 px-4">
          <button
            onClick={() => setActiveCategory("all")}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeCategory === "all" 
                ? "bg-emerald-600 text-white shadow-sm" 
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            Semua
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat.id 
                  ? "bg-emerald-600 text-white shadow-sm" 
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Books Grid */}
        <div className="grid grid-cols-2 gap-4">
          {filteredBooks.length > 0 ? (
            filteredBooks.map((book) => (
              <a
                key={book.id}
                href={book.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col group hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="aspect-[3/4] w-full bg-gray-50 rounded-xl overflow-hidden mb-3 relative flex items-center justify-center">
                  {book.cover_url ? (
                    <img 
                      src={book.cover_url} 
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <Book className="w-8 h-8 text-gray-300" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-white/90 p-2 rounded-full text-emerald-600 transform scale-75 group-hover:scale-100 transition-transform">
                      <ExternalLink className="w-5 h-5" />
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col flex-1">
                  {book.digital_library_categories?.name && (
                    <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-1">
                      {book.digital_library_categories.name}
                    </span>
                  )}
                  <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-tight mb-1">
                    {book.title}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-1 mt-auto">
                    {book.author}
                  </p>
                </div>
              </a>
            ))
          ) : (
            <div className="col-span-2 py-12 text-center text-gray-500 flex flex-col items-center">
              <BookOpen className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm font-medium">Tidak ada buku ditemukan</p>
              <p className="text-xs text-gray-400 mt-1">Coba gunakan kata kunci atau kategori lain.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
