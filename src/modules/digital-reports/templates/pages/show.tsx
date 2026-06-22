import React from "react";
import { useShow } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, FileText, CheckCircle2, XCircle, List, Eye, EyeOff } from "lucide-react";

export const ReportTemplateShow: React.FC = () => {
  const navigate = useNavigate();
  const { queryResult } = useShow({
    resource: "report_templates",
    meta: {
      select: "*, units(name), sections:report_template_sections(*, items:report_template_items(*))"
    }
  });

  const { data, isLoading } = queryResult;
  const template = data?.data as any;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Memuat data template...</p>
        </div>
      </div>
    );
  }

  if (!template) return null;

  // Sort sections and items
  const sortedSections = [...(template.sections || [])].sort((a, b) => a.display_order - b.display_order);
  sortedSections.forEach(sec => {
    sec.items = [...(sec.items || [])].sort((a: any, b: any) => a.display_order - b.display_order);
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-full transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight">{template.name}</h1>
              {template.is_active ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Aktif
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border bg-slate-50 text-slate-700 border-slate-200">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Nonaktif
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-semibold text-primary">{template.units?.name || "Semua Unit"}</span>
              <span>•</span>
              <span className="uppercase tracking-wider">{template.report_type?.replace(/_/g, ' ')}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/reports/templates/edit/${template.id}`)}
            className="px-4 py-2 text-sm font-medium bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit Template
          </button>
        </div>
      </div>

      {template.description && (
        <div className="bg-muted/30 p-4 rounded-lg border text-sm text-foreground">
          {template.description}
        </div>
      )}

      {/* Sections Preview */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Struktur Template</h2>
        </div>

        {sortedSections.length === 0 ? (
          <div className="text-center p-12 border border-dashed rounded-xl bg-muted/10 text-muted-foreground">
            Belum ada section yang dibuat untuk template ini.
          </div>
        ) : (
          <div className="space-y-8">
            {sortedSections.map((section: any, idx: number) => (
              <div key={section.id} className="bg-card border rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 bg-muted/40 border-b flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <span className="text-muted-foreground text-sm font-normal">{idx + 1}.</span> {section.title}
                    </h3>
                    {section.description && <p className="text-sm text-muted-foreground mt-1">{section.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium">
                    {section.parent_visible ? (
                      <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100"><Eye className="w-3.5 h-3.5" /> Ortu Bisa Lihat</span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-200"><EyeOff className="w-3.5 h-3.5" /> Sembunyikan</span>
                    )}
                  </div>
                </div>

                <div className="p-0">
                  {(!section.items || section.items.length === 0) ? (
                    <div className="p-6 text-center text-sm text-muted-foreground italic">
                      Tidak ada item penilaian di section ini.
                    </div>
                  ) : (
                    <table className="w-full text-sm text-left">
                      <thead className="bg-background text-muted-foreground text-xs uppercase font-semibold border-b">
                        <tr>
                          <th className="px-5 py-3 w-10 text-center">#</th>
                          <th className="px-5 py-3">Nama Item</th>
                          <th className="px-5 py-3 w-40">Tipe Penilaian</th>
                          <th className="px-5 py-3 w-24 text-center">Wajib</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {section.items.map((item: any, iIdx: number) => (
                          <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-5 py-3 text-center text-muted-foreground">{iIdx + 1}</td>
                            <td className="px-5 py-3">
                              <div className="font-medium text-foreground">{item.name}</div>
                              {item.description && <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>}
                            </td>
                            <td className="px-5 py-3">
                              <span className="inline-flex px-2 py-1 rounded-md bg-muted text-xs font-medium uppercase tracking-wider">
                                {item.assessment_type}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-center">
                              {item.is_required ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> : <XCircle className="w-4 h-4 text-muted-foreground mx-auto" />}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
