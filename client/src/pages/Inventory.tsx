import { useEffect, useState } from "react";
import { localDataService } from "@/services/localDataService";
import { useI18n } from "@/context/I18nContext";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Search, AlertTriangle, Layers, Box, Info, IndianRupee } from "lucide-react";
import { fmtINR } from "@/lib/format";
import { toast } from "sonner";

const Inventory = () => {
  const { t } = useI18n();
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [openItem, setOpenItem] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [openCat, setOpenCat] = useState(false);
  const [editCat, setEditCat] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [it, cat] = await Promise.all([
        localDataService.getAll("inventory_items"),
        localDataService.getAll("categories")
      ]);
      setItems(Array.isArray(it) ? it : []);
      setCategories(Array.isArray(cat) ? cat : []);
    } catch (error) {
      console.error("Inventory load error:", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter((i) => 
    !search || 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    (i.name_kn || "").includes(search)
  );

  const removeItem = async (id: string) => {
    if (!confirm("Delete this item? This cannot be undone.")) return;
    await localDataService.delete("inventory_items", id);
    toast.success("Item deleted successfully");
    load();
  };

  const removeCategory = async (id: string) => {
    const hasItems = items.some(i => i.category_id === id);
    if (hasItems) return toast.error("This category contains items. Please move or delete the items first.");
    if (!confirm("Delete this category?")) return;
    await localDataService.delete("categories", id);
    toast.success("Category deleted");
    load();
  };

  const independentItems = filtered.filter(i => !i.category_id);
  const lowStockItems = items.filter(i => Number(i.available_quantity) <= Number(i.low_stock_threshold || 0));

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
        <Box className="h-12 w-12 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium animate-pulse">{t("loading")}</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={t("inventoryModule")}
        subtitle={t("inventorySubtitle")}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpenCat(true)}>
              <Layers className="mr-2 h-4 w-4" /> {t("addCategoryInv")}
            </Button>
            <Button onClick={() => setOpenItem(true)} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" /> {t("addNewItem")}
            </Button>
          </div>
        }
      />

      {/* Out of Stock / Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="mb-6 rounded-xl border border-warning/30 bg-warning/5 p-4 flex items-start gap-3 animate-in slide-in-from-top-2">
          <div className="bg-warning/20 p-2 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
          <div>
            <div className="font-bold text-warning-foreground uppercase tracking-tight text-xs">{t("lowStockWarning")}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {t("lowStockHint")} <span className="font-semibold text-foreground">{lowStockItems.map(i => i.name).join(", ")}</span>.
            </div>
          </div>
        </div>
      )}

      <div className="relative mb-8 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          placeholder={t("searchItemPlaceholder")} 
          className="pl-9 h-12 shadow-sm border-primary/10 focus:border-primary transition-all" 
        />
      </div>

      <Tabs defaultValue="items" className="space-y-8">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="items" className="rounded-lg px-8">{t("stockCatalog")}</TabsTrigger>
          <TabsTrigger value="categories" className="rounded-lg px-8">{t("categoriesMgmt")}</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-12 animate-in fade-in duration-500">
          {categories.map(cat => {
            const catItems = filtered.filter(i => i.category_id === cat.id);
            if (catItems.length === 0 && !search) return null;
            return (
              <div key={cat.id} className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2 px-1">
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    <h3 className="font-display text-2xl font-bold tracking-tight">{cat.name}</h3>
                    {cat.name_kn && <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded ml-2 font-medium">{cat.name_kn}</span>}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {catItems.length} {t("records")}
                  </div>
                </div>
                <ItemTable 
                  items={catItems} 
                  onEdit={(i: any) => { setEditItem(i); setOpenItem(true); }} 
                  onDelete={removeItem} 
                  t={t}
                />
              </div>
            );
          })}

          <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between border-b pb-2 px-1">
                <div className="flex items-center gap-2">
                  <Box className="h-5 w-5 text-accent" />
                  <h3 className="font-display text-2xl font-bold tracking-tight">{t("independentItems")}</h3>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t("noCategory")}
                </div>
              </div>
            <ItemTable 
              items={independentItems} 
              onEdit={(i: any) => { setEditItem(i); setOpenItem(true); }} 
              onDelete={removeItem} 
              t={t}
            />
          </div>
        </TabsContent>

        <TabsContent value="categories" className="animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed rounded-2xl bg-muted/20">
                <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground">No categories defined. Start by adding one above.</p>
              </div>
            )}
            {categories.map((c) => (
              <Card key={c.id} className="p-6 flex items-center justify-between group hover:border-primary/50 transition-all shadow-sm">
                <div>
                  <h4 className="font-bold text-lg">{c.name}</h4>
                  <p className="text-sm text-muted-foreground">{c.name_kn || t("none")}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                  <Button variant="ghost" size="sm" onClick={() => { setEditCat(c); setOpenCat(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => removeCategory(c.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <ItemDialog 
        open={openItem || !!editItem} 
        item={editItem} 
        categories={categories} 
        onClose={() => { setOpenItem(false); setEditItem(null); load(); }} 
        t={t}
      />

      <CategoryDialog 
        open={openCat || !!editCat} 
        category={editCat} 
        onClose={() => { setOpenCat(false); setEditCat(null); load(); }} 
        t={t}
      />
    </>
  );
};

const ItemTable = ({ items, onEdit, onDelete, t }: any) => {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden border-primary/5">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground font-bold border-b">
            <tr>
              <th className="text-left px-6 py-4">{t("itemCatalogName")}</th>
              <th className="text-right px-6 py-4">{t("takeawayPrice")}</th>
              <th className="text-right px-6 py-4">{t("deliveryPrice")}</th>
              <th className="text-right px-6 py-4">{t("currentStock")}</th>
              <th className="text-right px-6 py-4">{t("actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/5">
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted-foreground py-12 italic text-sm">
                  {t("noItemsListed")}
                </td>
              </tr>
            )}
            {items.map((i: any) => {
              const isLow = Number(i.available_quantity) <= Number(i.low_stock_threshold || 2);
              return (
                <tr key={i.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-foreground text-base">{i.name}</div>
                    {i.name_kn && <div className="text-[10px] font-bold text-muted-foreground uppercase mt-1">{i.name_kn}</div>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {i.price_takeaway !== null ? (
                      <span className="font-display font-bold text-primary">{fmtINR(i.price_takeaway)}</span>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">{t("none")}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {i.price_delivery !== null ? (
                      <span className="font-display font-bold text-accent">{fmtINR(i.price_delivery)}</span>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">{t("none")}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end">
                      <div className={`px-2 py-0.5 rounded text-xs font-bold ${isLow ? "bg-destructive/10 text-destructive animate-pulse" : "bg-success/10 text-success"}`}>
                        {i.available_quantity} {t("available")}
                      </div>
                      <div className="text-[9px] text-muted-foreground uppercase font-bold mt-1">Total: {i.total_quantity}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onEdit(i)} className="h-8 w-8 p-0"><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => onDelete(i.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ItemDialog = ({ open, item, categories, onClose, t }: any) => {
  const [name, setName] = useState(item?.name || "");
  const [nameKn, setNameKn] = useState(item?.name_kn || "");
  const [catId, setCatId] = useState<string>(item?.category_id || "none");
  const [total, setTotal] = useState<string>(item?.total_quantity?.toString() || "1");
  const [available, setAvailable] = useState<string>(item?.available_quantity?.toString() || "1");
  const [priceTake, setPriceTake] = useState<string>(item?.price_takeaway !== null ? item?.price_takeaway?.toString() : "");
  const [priceDel, setPriceDel] = useState<string>(item?.price_delivery !== null ? item?.price_delivery?.toString() : "");
  const [lowStock, setLowStock] = useState<string>(item?.low_stock_threshold?.toString() || "0");

  useEffect(() => {
    if (open) {
      setName(item?.name || "");
      setNameKn(item?.name_kn || "");
      setCatId(item?.category_id || "none");
      setTotal(item?.total_quantity?.toString() || "1");
      setAvailable(item?.available_quantity?.toString() || "1");
      setPriceTake(item?.price_takeaway !== null ? item?.price_takeaway?.toString() : "");
      setPriceDel(item?.price_delivery !== null ? item?.price_delivery?.toString() : "");
      setLowStock(item?.low_stock_threshold?.toString() || "0");
    }
  }, [open, item]);

  const save = async () => {
    if (!name) return toast.error("Item name is required");
    const t = Number(total);
    const a = Number(available);
    if (isNaN(t) || t < 0) return toast.error("Total stock must be a positive number");
    if (a > t) return toast.error("Available stock cannot exceed total stock");

    const payload: any = {
      name, 
      name_kn: nameKn || null,
      category_id: catId === "none" ? null : catId,
      total_quantity: t, 
      available_quantity: a,
      price_takeaway: priceTake === "" ? null : Math.max(0, Number(priceTake)),
      price_delivery: priceDel === "" ? null : Math.max(0, Number(priceDel)),
      low_stock_threshold: Number(lowStock),
    };

    if (item) await localDataService.update("inventory_items", item.id, payload);
    else await localDataService.insert("inventory_items", payload);
    toast.success(item ? "Item updated" : "New item added");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-primary p-6 text-primary-foreground">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl font-bold tracking-tight">
              {item ? t("modifyItem") : t("createItem")}
            </DialogTitle>
            <p className="opacity-80 text-sm mt-1">{t("configurePricingStock")}</p>
          </DialogHeader>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest opacity-60">{t("itemNameEn")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Round Table" className="h-12 text-lg font-semibold" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest opacity-60">{t("itemNameKn")}</Label>
              <Input value={nameKn} onChange={(e) => setNameKn(e.target.value)} placeholder="ಹೆಸರು ಕನ್ನಡದಲ್ಲಿ" className="h-12" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest opacity-60">{t("assignCategory")}</Label>
            <Select value={catId} onValueChange={setCatId}>
              <SelectTrigger className="h-12 border-primary/10">
                <SelectValue placeholder={t("selectCategory")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("independentItemNoCat")}</SelectItem>
                {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-xl border border-dashed">
            <div className="space-y-1.5 text-center">
              <Label className="text-[10px] font-bold uppercase tracking-tighter">{t("totalQtyAlt")}</Label>
              <Input type="number" min={0} value={total} onChange={(e) => setTotal(e.target.value)} className="h-10 text-center font-bold" />
            </div>
            <div className="space-y-1.5 text-center">
              <Label className="text-[10px] font-bold uppercase tracking-tighter">{t("available")}</Label>
              <Input type="number" min={0} value={available} onChange={(e) => setAvailable(e.target.value)} className="h-10 text-center font-bold text-success" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest opacity-60">{t("takeawayPrice")} (₹)</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="number" 
                  min={0} 
                  value={priceTake} 
                  onChange={(e) => setPriceTake(e.target.value)} 
                  placeholder={t("enterPriceManually")} 
                  className="pl-10 h-12 font-display font-bold text-primary text-xl" 
                />
              </div>
              <p className="text-[9px] text-muted-foreground flex items-center gap-1"><Info className="h-2 w-2" /> {t("leaveBlankNull")}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest opacity-60">{t("deliveryPrice")} (₹)</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="number" 
                  min={0} 
                  value={priceDel} 
                  onChange={(e) => setPriceDel(e.target.value)} 
                  placeholder={t("enterPriceManually")} 
                  className="pl-10 h-12 font-display font-bold text-accent text-xl" 
                />
              </div>
              <p className="text-[9px] text-muted-foreground flex items-center gap-1"><Info className="h-2 w-2" /> {t("leaveBlankNull")}</p>
            </div>
          </div>
        </div>

        <div className="bg-muted/50 p-6 flex justify-end gap-3 border-t">
          <Button variant="ghost" onClick={onClose} className="h-12 px-8">{t("discard")}</Button>
          <Button onClick={save} className="bg-primary hover:bg-primary/90 h-12 px-12 font-bold shadow-lg shadow-primary/20">
            {t("saveConfiguration")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const CategoryDialog = ({ open, category, onClose, t }: any) => {
  const [name, setName] = useState(category?.name || "");
  const [nameKn, setNameKn] = useState(category?.name_kn || "");

  useEffect(() => {
    if (open) {
      setName(category?.name || "");
      setNameKn(category?.name_kn || "");
    }
  }, [open, category]);

  const save = async () => {
    if (!name) return toast.error("Category name is required");
    const payload = { name, name_kn: nameKn || null };
    if (category) await localDataService.update("categories", category.id, payload);
    else await localDataService.insert("categories", payload);
    toast.success(category ? "Category updated" : "Category created");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-muted p-6 border-b">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold tracking-tight">
              {category ? t("modifyCategory") : t("newCategory")}
            </DialogTitle>
          </DialogHeader>
        </div>
        <div className="p-8 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest opacity-60">{t("itemNameEn")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lighting" className="h-12 font-semibold" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest opacity-60">{t("itemNameKn")}</Label>
            <Input value={nameKn} onChange={(e) => setNameKn(e.target.value)} placeholder="ಹೆಸರು ಕನ್ನಡದಲ್ಲಿ" className="h-12" />
          </div>
        </div>
        <div className="bg-muted/30 p-6 flex justify-end gap-3 border-t">
          <Button variant="ghost" onClick={onClose} className="h-11 px-6">{t("cancel")}</Button>
          <Button onClick={save} className="bg-primary hover:bg-primary/90 h-11 px-8 font-bold">
            {t("saveCategory")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Inventory;
