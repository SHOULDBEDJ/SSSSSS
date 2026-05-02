import { useEffect, useState, useMemo } from "react";
import { localDataService } from "@/services/localDataService";
import { useI18n } from "@/context/I18nContext";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Search, Trash2, Pencil, Phone, History, 
  ArrowUpFromLine, ArrowDownToLine, Receipt, Clock, 
  User, Layers, Box, CheckCircle2, ChevronRight, FileText, Minus
} from "lucide-react";
import { fmtINR, fmtDate } from "@/lib/format";
import { toast } from "sonner";

const Vendors = () => {
  const { t } = useI18n();
  const [vendors, setVendors] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [openVendor, setOpenVendor] = useState(false);
  const [editVendor, setEditVendor] = useState<any>(null);
  const [selectedVendor, setSelectedVendor] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await localDataService.getAll("vendors");
      setVendors(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Vendors load error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = vendors.filter(v => 
    v.name.toLowerCase().includes(search.toLowerCase()) || 
    v.phone.includes(search)
  );

  const removeVendor = async (id: string) => {
    if (!confirm("Delete this vendor and all their history?")) return;
    await localDataService.delete("vendors", id);
    toast.success("Vendor removed");
    load();
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
        <User className="h-12 w-12 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium animate-pulse">{t("loading")}</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={t("vendorModule")}
        subtitle={t("vendorSubtitle")}
        actions={
          <Button onClick={() => setOpenVendor(true)} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" /> {t("addNewVendor")}
          </Button>
        }
      />

      <div className="relative mb-8 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          placeholder={t("searchVendorPlaceholder")} 
          className="pl-9 h-12 shadow-sm border-primary/10" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(v => (
          <Card key={v.id} className="group hover:border-primary/50 transition-all shadow-sm overflow-hidden border-primary/5">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-primary/10 p-3 rounded-xl">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" onClick={() => { setEditVendor(v); setOpenVendor(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => removeVendor(v.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <h3 className="font-display text-xl font-bold mb-1">{v.name}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                <Phone className="h-3.5 w-3.5" /> {v.phone}
              </div>
              <Button 
                onClick={() => setSelectedVendor(v)}
                className="w-full bg-muted text-foreground hover:bg-primary hover:text-primary-foreground font-bold h-11"
              >
                {t("manageBorrowedItems")}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <VendorDialog 
        open={openVendor || !!editVendor} 
        vendor={editVendor} 
        onClose={() => { setOpenVendor(false); setEditVendor(null); load(); }} 
        t={t}
      />

      {selectedVendor && (
        <VendorManagementDialog 
          vendor={selectedVendor} 
          onClose={() => { setSelectedVendor(null); load(); }} 
          t={t}
        />
      )}
    </>
  );
};

/* ---------------- VENDOR DIALOG (ADD/EDIT) ---------------- */
const VendorDialog = ({ open, vendor, onClose, t }: any) => {
  const [name, setName] = useState(vendor?.name || "");
  const [phone, setPhone] = useState(vendor?.phone || "");

  useEffect(() => {
    if (open) {
      setName(vendor?.name || "");
      setPhone(vendor?.phone || "");
    }
  }, [open, vendor]);

  const save = async () => {
    if (!name || !phone) return toast.error("Name and Phone are required");
    const payload = { name, phone };
    if (vendor) await localDataService.update("vendors", vendor.id, payload);
    else await localDataService.insert("vendors", payload);
    toast.success(vendor ? "Updated" : "Created");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-display text-2xl">{vendor ? t("modifyVendor") : t("addNewVendor")}</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2"><Label>{t("name")} *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label>{t("phone")} *</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        </div>
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
          <Button onClick={save} className="bg-primary hover:bg-primary/90 px-8">{t("save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ---------------- VENDOR MANAGEMENT DIALOG ---------------- */
const VendorManagementDialog = ({ vendor, onClose, t }: any) => {
  const [txs, setTxs] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [openReturn, setOpenReturn] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any | null>(null);

  const loadData = async () => {
    const [allTx, allBills, cats, inv] = await Promise.all([
      localDataService.getAll("vendor_transactions"),
      localDataService.getAll("vendor_bills"),
      localDataService.getAll("categories"),
      localDataService.getAll("inventory_items")
    ]);
    setTxs(allTx.filter((t: any) => t.vendor_id === vendor.id));
    setBills(allBills.filter((b: any) => b.vendor_id === vendor.id));
    setCategories(cats);
    setItems(inv);
  };

  useEffect(() => { loadData(); }, [vendor.id]);

  const borrowedItems = useMemo(() => {
    const map: Record<string, any> = {};
    txs.forEach(t => {
      t.items.forEach((it: any) => {
        if (!map[it.item_id]) {
          const invItem = items.find(i => i.id === it.item_id);
          const cat = categories.find(c => c.id === invItem?.category_id);
          map[it.item_id] = { 
            id: it.item_id, 
            name: it.name, 
            category: cat?.name || "Independent", 
            qty: 0, 
            borrowed_at: t.created_at,
            status: "Borrowed"
          };
        }
        map[it.item_id].qty += t.type === "borrow" ? it.quantity : -it.quantity;
      });
    });
    return Object.values(map).filter(i => i.qty > 0);
  }, [txs, categories, items]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
        <div className="bg-primary p-8 text-primary-foreground">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 mb-2">{t("vendorPortfolio")}</div>
              <DialogTitle className="font-display text-4xl font-bold tracking-tight mb-2">{vendor.name}</DialogTitle>
              <div className="flex items-center gap-4 text-sm opacity-80">
                <span className="flex items-center gap-2"><Phone className="h-4 w-4" /> {vendor.phone}</span>
                <span className="h-1 w-1 bg-white/40 rounded-full" />
                <span className="flex items-center gap-2"><ArrowUpFromLine className="h-4 w-4" /> {borrowedItems.length} {t("activeBorrows")}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setOpenReturn(true)} className="bg-white text-primary hover:bg-white/90 font-bold h-12 px-8">
                <ArrowDownToLine className="mr-2 h-4 w-4" /> {t("returnItems")}
              </Button>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-12">
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <Layers className="h-4 w-4 text-primary" />
              <h3 className="font-bold uppercase tracking-widest text-xs">{t("activeBorrowedTable")}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {borrowedItems.length === 0 && (
                <div className="col-span-full py-16 text-center text-muted-foreground italic border-2 border-dashed rounded-2xl">{t("noItemsListed")}</div>
              )}
              {borrowedItems.map(it => (
                <Card key={it.id} className="p-4 border-primary/5 hover:border-primary/20 transition-all shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-bold text-lg">{it.name}</div>
                      <Badge variant="secondary" className="text-[9px] font-black uppercase px-2 mt-1">{it.category}</Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">{t("qty")}</div>
                      <div className="font-display font-black text-2xl text-primary">{it.qty}</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-primary/5">
                    <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> {fmtDate(it.borrowed_at)}
                    </div>
                    <Badge className="bg-warning/10 text-warning border-warning/20 font-black text-[9px] uppercase px-3 py-1">
                      {t("borrowed") || "Borrowed"}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* BILL HISTORY */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <History className="h-4 w-4 text-primary" />
              <h3 className="font-bold uppercase tracking-widest text-xs">{t("settledBillHistory")}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bills.length === 0 && <div className="col-span-full py-10 text-center text-muted-foreground italic border-2 border-dashed rounded-xl">{t("noPastBills")}</div>}
              {bills.map(b => (
                <Card 
                  key={b.id} 
                  className="p-5 flex justify-between items-center hover:border-primary cursor-pointer transition-all group"
                  onClick={() => setSelectedBill(b)}
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-muted p-3 rounded-lg group-hover:bg-primary/10 transition-colors">
                      <Receipt className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <div>
                      <div className="font-bold">{fmtDate(b.returned_at)}</div>
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                        {b.items.length} {t("itemsReturned")}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-display font-bold text-primary">{fmtINR(b.total_amount)}</div>
                    <div className="text-[10px] font-black uppercase text-success">{t("settled")}</div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </div>

        <ReturnDialog 
          open={openReturn}
          vendor={vendor} 
          borrowedItems={borrowedItems} 
          onClose={() => { setOpenReturn(false); loadData(); }} 
          t={t}
        />

        {selectedBill && (
          <BillDetailDialog open={!!selectedBill} bill={selectedBill} vendor={vendor} onClose={() => setSelectedBill(null)} t={t} />
        )}
      </DialogContent>
    </Dialog>
  );
};

/* ---------------- RETURN DIALOG ---------------- */
const ReturnDialog = ({ open, vendor, borrowedItems, onClose, t }: any) => {
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [charges, setCharges] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      const initQtys: Record<string, number> = {};
      borrowedItems.forEach((i: any) => initQtys[i.id] = i.qty);
      setReturnQtys(initQtys);
    }
  }, [open, borrowedItems]);

  const saveReturn = async () => {
    setBusy(true);
    const now = new Date().toISOString();
    const itemsToReturn = borrowedItems.filter((it: any) => (returnQtys[it.id] || 0) > 0);
    
    if (itemsToReturn.length === 0) return toast.error("Select items to return");

    const returnTxItems = itemsToReturn.map((it: any) => ({
      item_id: it.id,
      name: it.name,
      quantity: returnQtys[it.id],
      charge: Number(charges[it.id] || 0)
    }));

    await localDataService.insert("vendor_transactions", {
      vendor_id: vendor.id,
      type: "return",
      items: returnTxItems,
      created_at: now
    });

    const total = returnTxItems.reduce((s: number, i: any) => s + i.charge, 0);
    await localDataService.insert("vendor_bills", {
      vendor_id: vendor.id,
      items: returnTxItems.map(i => ({ ...i, category: borrowedItems.find((bi: any) => bi.id === i.item_id)?.category })),
      borrowed_at: itemsToReturn[0].borrowed_at, 
      returned_at: now,
      total_amount: total
    });

    const invItems = await localDataService.getAll("inventory_items");
    await Promise.all(returnTxItems.map(async (ri) => {
      const inv = invItems.find((i: any) => i.id === ri.item_id);
      if (inv) {
        await localDataService.update("inventory_items", inv.id, {
          available_quantity: Number(inv.available_quantity) + ri.quantity
        });
      }
    }));

    toast.success("Items returned and bill generated!");
    setBusy(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{t("returnItemsToVendor")}</DialogTitle>
          <p className="text-sm text-muted-foreground">{t("pleaseWait")}</p>
        </DialogHeader>
        <div className="space-y-4 py-6">
          {borrowedItems.map((it: any) => (
            <div key={it.id} className="flex flex-col sm:grid sm:grid-cols-12 gap-4 items-center bg-muted/20 p-4 rounded-xl border">
              <div className="sm:col-span-6 w-full text-center sm:text-left">
                <div className="font-bold text-lg">{it.name}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{it.category}</div>
              </div>
              <div className="sm:col-span-3 w-full flex flex-col items-center sm:items-start">
                <Label className="text-[10px] mb-2 font-black uppercase tracking-tighter opacity-60">{t("returnQty")}</Label>
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="sm" className="h-10 w-10 p-0 rounded-full" onClick={() => setReturnQtys({...returnQtys, [it.id]: Math.max(0, returnQtys[it.id] - 1)})}><Minus className="h-4 w-4" /></Button>
                  <span className="font-display font-black text-xl w-6 text-center">{returnQtys[it.id]}</span>
                  <Button variant="outline" size="sm" className="h-10 w-10 p-0 rounded-full" onClick={() => setReturnQtys({...returnQtys, [it.id]: Math.min(it.qty, returnQtys[it.id] + 1)})}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="sm:col-span-3 w-full">
                <Label className="text-[10px] mb-2 block font-black uppercase tracking-tighter opacity-60 text-center sm:text-left">{t("charge")} (₹)</Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    placeholder="0" 
                    value={charges[it.id] || ""} 
                    onChange={(e) => setCharges({...charges, [it.id]: e.target.value})} 
                    className="h-11 font-black text-center sm:text-left pl-4"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>{t("cancel")}</Button>
          <Button onClick={saveReturn} className="bg-primary hover:bg-primary/90 px-10 font-bold" disabled={busy}>
            {t("confirmReturnBill")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ---------------- BILL DETAIL DIALOG ---------------- */
const BillDetailDialog = ({ open, bill, vendor, onClose, t }: any) => {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl">
        <div className="p-10 space-y-10 bg-white text-black font-sans">
          <div className="flex justify-between items-start border-b-4 border-black pb-8">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">{t("vendorReturnBill")}</h1>
              <div className="text-sm font-bold opacity-60">{t("voucherId")}: {bill.id?.slice(0,8).toUpperCase()}</div>
            </div>
            <div className="text-right">
              <div className="font-black text-xl uppercase">{vendor.name}</div>
              <div className="font-bold opacity-60">{vendor.phone}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 py-4 px-6 bg-muted/20 rounded-2xl border-2 border-dashed">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                <ArrowUpFromLine className="h-3 w-3" /> {t("borrowedDateTime")}
              </div>
              <div className="font-bold text-sm">{new Date(bill.borrowed_at).toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2 justify-end">
                {t("returnedDateTime")} <ArrowDownToLine className="h-3 w-3" />
              </div>
              <div className="font-bold text-sm">{new Date(bill.returned_at).toLocaleString()}</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-12 gap-4 text-[10px] font-black uppercase tracking-widest opacity-40 border-b pb-2">
              <div className="col-span-6">{t("description")}</div>
              <div className="col-span-2 text-center">{t("qty")}</div>
              <div className="col-span-4 text-right">{t("chargeAmount")}</div>
            </div>
            <div className="space-y-3">
              {bill.items.map((it: any, idx: number) => (
                <div key={idx} className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-6">
                    <div className="font-bold">{it.name}</div>
                    <div className="text-[9px] font-black uppercase opacity-40">{it.category}</div>
                  </div>
                  <div className="col-span-2 text-center font-bold">{it.quantity}</div>
                  <div className="col-span-4 text-right font-display font-bold">{fmtINR(it.charge || 0)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t-4 border-black pt-8 flex justify-between items-end">
            <div className="space-y-1">
              <div className="text-[10px] font-black uppercase opacity-40">{t("status")}</div>
              <div className="bg-success text-success-foreground px-4 py-1 rounded text-xs font-black uppercase">{t("paidSettled")}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-black uppercase tracking-widest opacity-40 mb-1">{t("totalAmountPaid")}</div>
              <div className="text-5xl font-display font-black">{fmtINR(bill.total_amount)}</div>
            </div>
          </div>

          <div className="text-center pt-8 opacity-20 text-[10px] font-bold uppercase tracking-widest">
            {t("systemGeneratedReceipt")}
          </div>
        </div>
        
        <div className="bg-muted p-4 flex justify-center gap-3">
          <Button onClick={() => window.print()} className="bg-black text-white hover:bg-black/80 font-bold px-10 h-12">
            {t("printReceipt")}
          </Button>
          <Button variant="ghost" onClick={onClose} className="h-12">{t("closeView")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Vendors;
