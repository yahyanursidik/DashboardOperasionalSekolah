import React, { useState, useEffect } from "react";
import { useTable, useCreate, useUpdate, useDelete, useList } from "@refinedev/core";
import { 
  Plus, Edit as EditIcon, Trash2, Package, X, 
  Search, Filter, Eye, ChevronLeft, ChevronRight, 
  CheckCircle2, AlertTriangle, AlertCircle, BookmarkIcon,
  Monitor, Car, Armchair, Box, HelpCircle
} from "lucide-react";

export const AssetsList: React.FC = () => {
  const [activeTab, setActiveTab] = useState("Semua");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { tableQueryResult, current, setCurrent, pageCount, setFilters } = useTable({
    resource: "assets",
    pagination: { current: 1, pageSize: 10 },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
  });

  // Apply filters based on tab, search, and category
  useEffect(() => {
    const newFilters: any[] = [];
    
    if (activeTab === "Tersedia") {
      newFilters.push({ field: "status", operator: "eq", value: "Tersedia" });
    } else if (activeTab === "Dipinjam") {
      newFilters.push({ field: "status", operator: "eq", value: "Dipinjam" });
    } else if (activeTab === "Rusak") {
      newFilters.push({ field: "condition", operator: "in", value: ["Rusak Ringan", "Rusak Berat"] });
    }

    if (debouncedSearch) {
      newFilters.push({ field: "name", operator: "contains", value: debouncedSearch });
    }

    if (categoryFilter) {
      newFilters.push({ field: "category", operator: "eq", value: categoryFilter });
    }

    setFilters(newFilters, "replace");
    setCurrent(1); // Reset to page 1 on filter change
  }, [activeTab, debouncedSearch, categoryFilter, setFilters, setCurrent]);

  const assets = tableQueryResult?.data?.data || [];
  
  // Fetch all assets for summary cards
  const { data: allAssetsData } = useList({
    resource: "assets",
    pagination: { pageSize: 1000 },
  });
  
  const allAssets = allAssetsData?.data || [];
  const totalAssets = allAssets.length;
  const availableAssets = allAssets.filter(a => a.status === 'Tersedia').length;
  const borrowedAssets = allAssets.filter(a => a.status === 'Dipinjam').length;
  const damagedAssets = allAssets.filter(a => a.condition === 'Rusak Ringan' || a.condition === 'Rusak Berat').length;

  const { mutate: createAsset, isLoading: isCreating } = useCreate();
  const { mutate: updateAsset, isLoading: isUpdating } = useUpdate();
  const { mutate: deleteAsset, isLoading: isDeleting } = useDelete();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [currentAsset, setCurrentAsset] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    code: "", name: "", category: "", condition: "Baik", location: "", purchase_price: 0, status: "Tersedia", notes: ""
  });

  const CATEGORIES = ['Elektronik', 'Furnitur', 'Kendaraan', 'Ruangan', 'Lainnya'];
  const CONDITIONS = ['Baik', 'Rusak Ringan', 'Rusak Berat'];
  const STATUSES = ['Tersedia', 'Dipinjam', 'Diperbaiki', 'Dihapus'];
  const TABS = ['Semua', 'Tersedia', 'Dipinjam', 'Rusak'];

  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'Elektronik': return <Monitor className="w-4 h-4 text-blue-500" />;
      case 'Furnitur': return <Armchair className="w-4 h-4 text-orange-500" />;
      case 'Kendaraan': return <Car className="w-4 h-4 text-green-500" />;
      case 'Ruangan': return <Box className="w-4 h-4 text-purple-500" />;
      default: return <HelpCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleOpenCreate = () => {
    setFormData({ code: "", name: "", category: "", condition: "Baik", location: "", purchase_price: 0, status: "Tersedia", notes: "" });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (asset: any) => {
    setCurrentAsset(asset);
    setFormData({
      code: asset.code, name: asset.name, category: asset.category, 
      condition: asset.condition, location: asset.location || "", 
      purchase_price: asset.purchase_price, status: asset.status, notes: asset.notes || ""
    });
    setIsEditOpen(true);
  };

  const handleOpenView = (asset: any) => {
    setCurrentAsset(asset);
    setIsViewOpen(true);
  };

  const handleOpenDelete = (asset: any) => {
    setCurrentAsset(asset);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreateOpen) {
      createAsset({ resource: "assets", values: formData }, {
        onSuccess: () => { setIsCreateOpen(false); tableQueryResult.refetch(); }
      });
    } else if (isEditOpen && currentAsset) {
      updateAsset({ resource: "assets", id: currentAsset.id, values: formData }, {
        onSuccess: () => { setIsEditOpen(false); tableQueryResult.refetch(); }
      });
    }
  };

  const handleDelete = () => {
    if (currentAsset) {
      deleteAsset({ resource: "assets", id: currentAsset.id }, {
        onSuccess: () => { setIsDeleteOpen(false); tableQueryResult.refetch(); }
      });
    }
  };

  // Helper to format currency
  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <Package className="w-7 h-7" />
            </div>
            Katalog Aset
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5 ml-14">Kelola dan pantau inventaris fisik sekolah secara komprehensif</p>
        </div>
        <button onClick={handleOpenCreate} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-all shadow-md hover:shadow-lg font-semibold text-sm active:scale-95">
          <Plus className="w-5 h-5" /> Tambah Aset Baru
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3.5 bg-blue-50 text-blue-600 rounded-full"><Package className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Aset</p>
            <h3 className="text-2xl font-bold text-gray-900">{totalAssets}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-full"><CheckCircle2 className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Tersedia</p>
            <h3 className="text-2xl font-bold text-gray-900">{availableAssets}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3.5 bg-purple-50 text-purple-600 rounded-full"><BookmarkIcon className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Sedang Dipinjam</p>
            <h3 className="text-2xl font-bold text-gray-900">{borrowedAssets}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3.5 bg-red-50 text-red-600 rounded-full"><AlertTriangle className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Perlu Perbaikan</p>
            <h3 className="text-2xl font-bold text-gray-900">{damagedAssets}</h3>
          </div>
        </div>
      </div>

      {/* Filters & Tabs */}
      <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex bg-muted/50 p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
          {TABS.map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-gray-900 hover:bg-white/50'}`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Cari nama aset..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
            />
          </div>
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="pl-9 pr-8 py-2 bg-background border border-input rounded-lg text-sm appearance-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none cursor-pointer"
            >
              <option value="">Semua Kategori</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold border-b tracking-wider">
              <tr>
                <th className="px-6 py-4">Aset</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Kondisi</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Lokasi</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all">
                        {getCategoryIcon(asset.category)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{asset.name}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{asset.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-medium">{asset.category}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      asset.condition === 'Baik' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      asset.condition === 'Rusak Ringan' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        asset.condition === 'Baik' ? 'bg-emerald-500' :
                        asset.condition === 'Rusak Ringan' ? 'bg-amber-500' : 'bg-red-500'
                      }`}></span>
                      {asset.condition}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      asset.status === 'Tersedia' ? 'bg-blue-100 text-blue-700' :
                      asset.status === 'Dipinjam' ? 'bg-purple-100 text-purple-700' :
                      asset.status === 'Diperbaiki' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 flex items-center gap-2">
                    {asset.location || <span className="text-gray-400 italic">Belum diatur</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenView(asset)} className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Lihat Detail">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleOpenEdit(asset)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleOpenDelete(asset)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {assets.length === 0 && !tableQueryResult.isLoading && (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Package className="w-12 h-12 mb-3 text-gray-300" />
                      <p className="text-lg font-medium text-gray-900">Tidak ada aset ditemukan</p>
                      <p className="text-sm mt-1">Coba sesuaikan kata kunci pencarian atau filter Anda.</p>
                    </div>
                  </td>
                </tr>
              )}
              {tableQueryResult.isLoading && (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <div className="flex justify-center items-center gap-2 text-primary">
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-medium">Memuat data...</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {pageCount > 1 && (
          <div className="bg-gray-50 px-6 py-4 border-t flex items-center justify-between">
            <p className="text-sm text-muted-foreground font-medium">
              Halaman <span className="text-gray-900">{current}</span> dari <span className="text-gray-900">{pageCount}</span>
            </p>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrent(p => Math.max(1, p - 1))}
                disabled={current === 1}
                className="p-2 rounded-lg border bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pageCount) }).map((_, i) => {
                  // Simplified pagination display logic for 5 pages max
                  let pageNum = current;
                  if (current <= 3) pageNum = i + 1;
                  else if (current >= pageCount - 2) pageNum = pageCount - 4 + i;
                  else pageNum = current - 2 + i;
                  
                  if (pageNum > 0 && pageNum <= pageCount) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrent(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${current === pageNum ? 'bg-primary text-white shadow-sm' : 'hover:bg-gray-100 text-gray-600'}`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  return null;
                })}
              </div>

              <button 
                onClick={() => setCurrent(p => Math.min(pageCount, p + 1))}
                disabled={current === pageCount}
                className="p-2 rounded-lg border bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal (Create/Edit) */}
      {(isCreateOpen || isEditOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{isCreateOpen ? "Tambah Data Aset" : "Edit Data Aset"}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{isCreateOpen ? "Masukkan detail aset baru ke dalam inventaris" : "Perbarui informasi aset yang ada"}</p>
              </div>
              <button onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }} className="p-2 hover:bg-gray-100 text-gray-500 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Kode Aset <span className="text-red-500">*</span></label>
                  <input required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="flex w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-mono" placeholder="Mis: KOMP-LAB-01" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Nama Aset <span className="text-red-500">*</span></label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="flex w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" placeholder="Mis: PC Lenovo Core i5" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Kategori <span className="text-red-500">*</span></label>
                  <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="flex w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none appearance-none">
                    <option value="" disabled>Pilih Kategori</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Kondisi <span className="text-red-500">*</span></label>
                  <select required value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value})} className="flex w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none appearance-none">
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Lokasi / Ruangan</label>
                  <input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="flex w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" placeholder="Mis: Lab Komputer 1" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Harga Beli (Rp)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">Rp</span>
                    <input type="number" min="0" value={formData.purchase_price || ''} onChange={e => setFormData({...formData, purchase_price: Number(e.target.value)})} className="flex w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" placeholder="0" />
                  </div>
                </div>
              </div>

              {isEditOpen && (
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Status Ketersediaan <span className="text-red-500">*</span></label>
                  <select required value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="flex w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none appearance-none">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Keterangan Tambahan</label>
                <textarea rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="flex w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none resize-none" placeholder="Tuliskan catatan opsional mengenai aset ini..." />
              </div>
              
              <div className="pt-6 border-t flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }} className="px-5 py-2.5 border border-gray-300 rounded-lg font-semibold text-sm hover:bg-gray-50 text-gray-700 transition-colors">Batal</button>
                <button type="submit" disabled={isCreating || isUpdating} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 shadow-sm flex items-center gap-2 transition-all disabled:opacity-70">
                  {(isCreating || isUpdating) && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {isCreateOpen ? "Simpan Aset Baru" : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {isViewOpen && currentAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="relative h-24 bg-gradient-to-r from-primary/80 to-primary flex items-end p-6">
              <button onClick={() => setIsViewOpen(false)} className="absolute top-4 right-4 p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-md transition-colors">
                <X className="w-5 h-5" />
              </button>
              <div className="bg-white p-3 rounded-xl shadow-md -mb-10 ring-4 ring-white">
                {getCategoryIcon(currentAsset.category)}
              </div>
            </div>
            
            <div className="pt-12 p-6">
              <h3 className="text-2xl font-bold text-gray-900">{currentAsset.name}</h3>
              <p className="font-mono text-sm text-gray-500 mt-1">{currentAsset.code}</p>

              <div className="grid grid-cols-2 gap-y-6 gap-x-4 mt-8">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Kategori</p>
                  <p className="font-medium text-gray-900 mt-1">{currentAsset.category}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Lokasi</p>
                  <p className="font-medium text-gray-900 mt-1">{currentAsset.location || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Kondisi</p>
                  <span className={`inline-block mt-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                    currentAsset.condition === 'Baik' ? 'bg-emerald-100 text-emerald-800' :
                    currentAsset.condition === 'Rusak Ringan' ? 'bg-amber-100 text-amber-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {currentAsset.condition}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Status</p>
                  <span className={`inline-block mt-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                    currentAsset.status === 'Tersedia' ? 'bg-blue-100 text-blue-800' :
                    currentAsset.status === 'Dipinjam' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {currentAsset.status}
                  </span>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Harga Beli</p>
                  <p className="font-medium text-gray-900 mt-1">{currentAsset.purchase_price ? formatRupiah(currentAsset.purchase_price) : '-'}</p>
                </div>
                {currentAsset.notes && (
                  <div className="col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">Catatan Tambahan</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{currentAsset.notes}</p>
                  </div>
                )}
              </div>
              
              <div className="mt-8 pt-6 border-t flex justify-end">
                <button onClick={() => { setIsViewOpen(false); handleOpenEdit(currentAsset); }} className="px-5 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2">
                  <EditIcon className="w-4 h-4" /> Edit Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && currentAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-center p-8">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Hapus Aset Ini?</h3>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              Anda yakin ingin menghapus <span className="font-semibold text-gray-900">"{currentAsset.name}"</span>? Tindakan ini tidak dapat dibatalkan dan data akan hilang secara permanen.
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setIsDeleteOpen(false)} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-semibold text-sm transition-colors flex-1">
                Batal
              </button>
              <button onClick={handleDelete} disabled={isDeleting} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm transition-colors flex-1 flex justify-center items-center gap-2 disabled:opacity-70">
                {isDeleting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
