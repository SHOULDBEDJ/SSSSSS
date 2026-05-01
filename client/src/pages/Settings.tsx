import { useEffect, useState } from "react";
import { localDataService } from "@/services/localDataService";
import { useI18n } from "@/context/I18nContext";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Download, Upload, AlertTriangle, Languages } from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const { t } = useI18n();
  return (
    <>
      <PageHeader title={t("settings")} subtitle={t("settingsSubtitle")} />
      <Tabs defaultValue="functions">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="functions">{t("functionNames")}</TabsTrigger>
          <TabsTrigger value="upi-ids">{t("upiIds")}</TabsTrigger>
          <TabsTrigger value="data">{t("dataManagement")}</TabsTrigger>
        </TabsList>

        <TabsContent value="functions"><FunctionsTab /></TabsContent>
        <TabsContent value="upi-ids"><UPITab /></TabsContent>
        <TabsContent value="data"><DataTab /></TabsContent>
      </Tabs>
    </>
  );
};
export default Settings;

/* ---------- Function Names ---------- */
const FunctionsTab = () => {
  const { t } = useI18n();
  const [list, setList] = useState<any[]>([]);
  const [titleEn, setTitleEn] = useState("");
  const [titleKn, setTitleKn] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await localDataService.getAll("function_types");
      setList(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Functions load error:", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const startEdit = (f: any) => {
    setEditingId(f.id);
    setTitleEn(f.title);
    setTitleKn(f.title_kn || "");
    // Scroll to top of card if needed
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitleEn("");
    setTitleKn("");
  };

  const addOrUpdate = async () => {
    if (!titleEn) return toast.error("English name required");
    
    if (editingId) {
      await localDataService.update("function_types", editingId, { 
        title: titleEn, 
        title_kn: titleKn || null 
      });
      toast.success("Updated");
    } else {
      await localDataService.insert("function_types", { 
        title: titleEn, 
        title_kn: titleKn || null 
      });
      toast.success("Added");
    }
    
    cancelEdit();
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this function type?")) return;
    await localDataService.delete("function_types", id);
    load();
  };

  return (
    <Card className="p-6 mt-4 space-y-5">
      <div className="grid md:grid-cols-4 gap-3 items-end">
        <div className="md:col-span-1"><Label>{t("title")} (English)</Label><Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="Wedding" /></div>
        <div className="md:col-span-1"><Label>{t("title")} (Kannada)</Label><Input value={titleKn} onChange={(e) => setTitleKn(e.target.value)} placeholder="ಮದುವೆ" /></div>
        <div className="md:col-span-2 flex gap-2">
          <Button onClick={addOrUpdate} className="flex-1 bg-primary hover:bg-primary/90">
            {editingId ? <><Plus className="mr-2 h-4 w-4" /> Update</> : <><Plus className="mr-2 h-4 w-4" /> {t("add")}</>}
          </Button>
          {editingId && (
            <Button variant="ghost" onClick={cancelEdit}>Cancel</Button>
          )}
        </div>
      </div>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="text-left px-4 py-2">{t("english")}</th><th className="text-left px-4 py-2">{t("kannada")}</th><th /></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="text-center py-6 animate-pulse">{t("loading")}</td></tr>
            ) : (Array.isArray(list) && list.length === 0) ? (
              <tr><td colSpan={3} className="text-center text-muted-foreground py-6">{t("noneYet")}</td></tr>
            ) : (
              Array.isArray(list) && list.map((f: any) => (
                <tr key={f.id} className={`border-t transition-colors ${editingId === f.id ? "bg-primary/5" : ""}`}>
                  <td className="px-4 py-2 font-medium">{f.title}</td>
                  <td className="px-4 py-2 text-muted-foreground">{f.title_kn || "—"}</td>
                  <td className="px-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(f)} title="Edit">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(f.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};



/* ---------- Data Management ---------- */
const TABLES = ["bookings", "customers", "categories", "inventory_items", "expenses", "expense_types", "function_types", "vendors", "vendor_transactions", "workers", "business_profile"] as const;

const DataTab = () => {
  const { t } = useI18n();
  const backup = async () => {
    const t = toast.loading("Exporting data…");
    const dump: Record<string, any[]> = {};
    for (const tbl of TABLES) {
      dump[tbl] = await localDataService.getAll(tbl);
    }
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data: dump }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `shivashakti-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Backup downloaded", { id: t });
  };

  const restore = async (file: File) => {
    if (!confirm("Restore from backup? This will replace records from the file. Existing rows in those tables are kept.")) return;
    const text = await file.text();
    let parsed: any;
    try { parsed = JSON.parse(text); } catch { return toast.error("Invalid JSON"); }
    const dump = parsed.data || parsed;
    const t = toast.loading("Restoring…");
    for (const tbl of TABLES) {
      const rows = dump[tbl];
      if (!Array.isArray(rows)) continue;
      const existing = await localDataService.getAll(tbl);
      await localDataService.saveAll(tbl, [...existing, ...rows]);
    }
    toast.success("Restore finished.", { id: t });
  };

  const erase = async () => {
    const t = toast.loading("Erasing all local data…");
    for (const tbl of TABLES) {
      await localDataService.saveAll(tbl, []);
    }
    toast.success("All operational data erased.", { id: t });
  };

  return (
    <Card className="p-6 mt-4 max-w-2xl space-y-6">
      <div>
        <div className="font-medium mb-1 flex items-center gap-2"><Download className="h-4 w-4" /> {t("backupData")}</div>
        <p className="text-sm text-muted-foreground mb-3">{t("backupDataHint")}</p>
        <Button onClick={backup} className="bg-primary hover:bg-primary/90">{t("downloadBackup")}</Button>
      </div>

      <div className="border-t pt-6">
        <div className="font-medium mb-1 flex items-center gap-2"><Upload className="h-4 w-4" /> {t("restoreData")}</div>
        <p className="text-sm text-muted-foreground mb-3">{t("restoreDataHint")}</p>
        <Input type="file" accept=".json,application/json" onChange={(e) => { const f = e.target.files?.[0]; if (f) restore(f); e.currentTarget.value = ""; }} />
      </div>

      <div className="border-t pt-6">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive"><AlertTriangle className="mr-2 h-4 w-4" /> {t("eraseAllData")}</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("eraseAllData")}?</AlertDialogTitle>
              <AlertDialogDescription>
                {t("eraseDataWarning")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={erase} className="bg-destructive hover:bg-destructive/90">{t("yesEraseEverything")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  );
};

/* ---------- UPI IDs ---------- */
const UPITab = () => {
  const { t } = useI18n();
  const [list, setList] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await localDataService.getAll("upi_ids");
      setList(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("UPI IDs load error:", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name || !upiId) return toast.error("Name and UPI ID required");
    await localDataService.insert("upi_ids", { name, upi_id: upiId });
    setName(""); setUpiId(""); toast.success("Added"); load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this UPI ID?")) return;
    await localDataService.delete("upi_ids", id);
    load();
  };

  return (
    <Card className="p-6 mt-4 space-y-5">
      <div className="grid md:grid-cols-3 gap-3 items-end">
        <div><Label>{t("displayName")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Business UPI" /></div>
        <div><Label>UPI ID</Label><Input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="name@upi" /></div>
        <Button onClick={add} className="bg-primary hover:bg-primary/90"><Plus className="mr-2 h-4 w-4" /> {t("add")}</Button>
      </div>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="text-left px-4 py-2">{t("name")}</th><th className="text-left px-4 py-2">UPI ID</th><th /></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="text-center py-6 animate-pulse">{t("loading")}</td></tr>
            ) : (Array.isArray(list) && list.length === 0) ? (
              <tr><td colSpan={3} className="text-center text-muted-foreground py-6">{t("noneYet")}</td></tr>
            ) : (
              Array.isArray(list) && list.map((u: any) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{u.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{u.upi_id}</td>
                  <td className="px-2 text-right"><Button variant="ghost" size="sm" onClick={() => remove(u.id)}><Trash2 className="h-3.5 w-3.5" /></Button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
