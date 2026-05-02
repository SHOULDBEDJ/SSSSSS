import { useEffect, useMemo, useState, useRef } from "react";
import { localDataService } from "@/services/localDataService";
import { useI18n } from "@/context/I18nContext";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, IndianRupee, Download, ListChecks, Filter, 
  FileImage, FileText, TrendingUp, TrendingDown,
  Clock, AlertCircle, ArrowUpFromLine, CheckCircle2,
  ChevronRight, Search
} from "lucide-react";
import { fmtINR, fmtDate, monthStartISO, todayISO, statusTone } from "@/lib/format";
import { toast } from "sonner";
import html2canvas from "html2canvas";

type ReportType = 
  | "income" 
  | "expense" 
  | "booking" 
  | "pending_payments" 
  | "overdue_balance" 
  | "vendor_borrowed" 
  | "items_return";

const Reports = () => {
  const { t } = useI18n();
  const [type, setType] = useState<ReportType>("booking");
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO());
  const [selectedCatId, setSelectedCatId] = useState<string>("all");
  const reportRef = useRef<HTMLDivElement>(null);
  
  const [data, setData] = useState<{
    bookings: any[];
    expenses: any[];
    categories: any[];
    inventory: any[];
    vendors: any[];
    vendorTx: any[];
  }>({
    bookings: [],
    expenses: [],
    categories: [],
    inventory: [],
    vendors: [],
    vendorTx: []
  });

  const loadAll = async () => {
    const [bookings, expenses, categories, inventory, vendors, vendorTx] = await Promise.all([
      localDataService.getAll("bookings"),
      localDataService.getAll("expenses"),
      localDataService.getAll("categories"),
      localDataService.getAll("inventory_items"),
      localDataService.getAll("vendors"),
      localDataService.getAll("vendor_transactions")
    ]);
    setData({
      bookings,
      expenses,
      categories,
      inventory,
      vendors,
      vendorTx
    });
  };

  useEffect(() => {
    loadAll();
  }, []);

  const inRange = (d: string) => {
    if (!d) return false;
    const date = d.slice(0, 10);
    return date >= from && date <= to;
  };

  // --- REPORT CALCULATIONS ---

  const reportData = useMemo(() => {
    const { bookings, expenses, vendorTx, inventory } = data;
    let filteredBookings = bookings.filter(b => inRange(b.booking_date || b.start_date));
    
    // Category filter for bookings (if any item matches category)
    if (selectedCatId !== "all") {
      filteredBookings = filteredBookings.filter(b => 
        (b.items || []).some((it: any) => {
          const inv = inventory.find(i => i.id === it.item_id);
          return inv && inv.category_id === selectedCatId;
        })
      );
    }

    switch (type) {
      case "income":
        const incomeRows: any[] = [];
        bookings.forEach(b => {
          if (b.pricing?.advance > 0 && inRange((b.booking_date || b.start_date || "").slice(0, 10))) {
            incomeRows.push({ date: (b.booking_date || b.start_date).slice(0, 10), customer: b.customer_name, type: "Advance", amount: b.pricing.advance, method: b.payment_method || "Cash" });
          }
          (b.payments || []).forEach((p: any) => {
            if (inRange((p.date || "").slice(0, 10))) {
              incomeRows.push({ date: p.date.slice(0, 10), customer: b.customer_name, type: "Payment", amount: p.amount, method: p.method || "UPI" });
            }
          });
        });
        return { rows: incomeRows.sort((a, b) => b.date.localeCompare(a.date)), total: incomeRows.reduce((s, r) => s + r.amount, 0) };

      case "expense":
        const expenseRows = expenses.filter(e => inRange(e.date));
        return { rows: expenseRows.sort((a, b) => b.date.localeCompare(a.date)), total: expenseRows.reduce((s, r) => s + Number(r.amount), 0) };

      case "booking":
        return { 
          rows: filteredBookings.sort((a, b) => (b.booking_date || b.start_date).localeCompare(a.booking_date || a.start_date)), 
          total: filteredBookings.reduce((s, b) => s + Number(b.pricing?.totalAmount || 0), 0),
          paid: filteredBookings.reduce((s, b) => s + Number(b.total_paid || b.pricing?.advance || 0), 0),
          balance: filteredBookings.reduce((s, b) => s + Number(b.remaining_amount || 0), 0)
        };

      case "pending_payments":
        const pending = filteredBookings.filter(b => Number(b.remaining_amount) > 0);
        return { rows: pending, total: pending.reduce((s, b) => s + Number(b.remaining_amount), 0) };

      case "overdue_balance":
        const overdue = filteredBookings.filter(b => b.status === "Overdue Balance");
        return { rows: overdue, total: overdue.reduce((s, b) => s + Number(b.remaining_amount), 0) };

      case "vendor_borrowed":
        const vMap: Record<string, any> = {};
        vendorTx.forEach(t => {
          if (inRange(t.created_at)) {
            t.items.forEach((item: any) => {
              if (!vMap[item.item_id]) vMap[item.item_id] = { name: item.name, qty: 0, vendor: data.vendors.find(v => v.id === t.vendor_id)?.name || "Unknown" };
              vMap[item.item_id].qty += t.type === "borrow" ? item.quantity : -item.quantity;
            });
          }
        });
        const vRows = Object.values(vMap).filter((i: any) => i.qty > 0);
        return { rows: vRows, total: vRows.length };

      case "items_return":
        const returns: any[] = [];
        bookings.forEach(b => {
          (b.item_checklist || []).forEach((c: any) => {
            if (c.returned && inRange(b.updated_at || b.booking_date || b.start_date)) {
              returns.push({ date: (b.updated_at || b.booking_date || b.start_date).slice(0, 10), item: c.itemName, customer: b.customer_name, qty: 1, type: "Customer Return" });
            }
          });
        });
        vendorTx.filter(t => t.type === "return" && inRange(t.created_at)).forEach(t => {
          t.items.forEach((i: any) => {
            returns.push({ date: t.created_at.slice(0, 10), item: i.name, customer: data.vendors.find(v => v.id === t.vendor_id)?.name || "Vendor", qty: i.quantity, type: "Vendor Return" });
          });
        });
        return { rows: returns.sort((a, b) => b.date.localeCompare(a.date)), total: returns.reduce((s, r) => s + r.qty, 0) };

      default: return { rows: [], total: 0 };
    }
  }, [type, from, to, selectedCatId, data]);

  // --- EXPORT LOGIC ---

  const exportImage = async () => {
    if (!reportRef.current || reportData.rows.length === 0) return toast.error("No data to export");
    
    try {
      toast.info("Generating high-quality report image...");
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true
      });
      
      const link = document.createElement("a");
      link.download = `${type}_report_${from}_${to}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Report Image saved successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate image");
    }
  };


  const REPORT_TYPES: { id: ReportType; label: string; icon: any; tone: string }[] = [
    { id: "booking", label: "Booking Report", icon: ListChecks, tone: "accent" },
    { id: "income", label: "Income Report", icon: TrendingUp, tone: "success" },
    { id: "expense", label: "Expense Report", icon: TrendingDown, tone: "destructive" },
    { id: "pending_payments", label: "Pending Payments", icon: Clock, tone: "warning" },
    { id: "overdue_balance", label: "Overdue Balance", icon: AlertCircle, tone: "destructive" },
    { id: "vendor_borrowed", label: "Vendor Borrowed", icon: ArrowUpFromLine, tone: "primary" },
    { id: "items_return", label: "Items Return", icon: CheckCircle2, tone: "success" },
  ];

  return (
    <>
      <PageHeader 
        title={t("businessIntelligence")} 
        subtitle={t("reportSubtitle")}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Controls */}
        <div className="space-y-6">
          <Card className="p-5 space-y-4 shadow-sm border-primary/10">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{t("selectReportType")}</Label>
              <div className="space-y-1">
                {REPORT_TYPES.map((rt) => (
                  <button 
                    key={rt.id} 
                    onClick={() => setType(rt.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${type === rt.id ? "bg-primary text-primary-foreground shadow-md ring-1 ring-primary/20" : "hover:bg-muted text-muted-foreground"}`}
                  >
                    <div className="flex items-center gap-3">
                      <rt.icon className={`h-4 w-4 ${type === rt.id ? "" : "text-muted-foreground"}`} />
                      {t(rt.id)}
                    </div>
                    {type === rt.id && <ChevronRight className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t space-y-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{t("date")}</Label>
                <div className="grid grid-cols-1 gap-2">
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 text-xs" />
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 text-xs" />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{t("category")}</Label>
                <Select value={selectedCatId} onValueChange={setSelectedCatId}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("all")}</SelectItem>
                    {data.categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button onClick={exportImage} className="w-full h-12 text-sm gap-3 bg-accent hover:bg-accent/90 text-accent-foreground font-black shadow-lg shadow-accent/20">
                <FileImage className="h-5 w-5" /> Save Image Report
              </Button>
            </div>
          </Card>

          <StatCard 
            label={t("currentViewTotal")} 
            value={type === "vendor_borrowed" || type === "items_return" ? reportData.total : fmtINR(reportData.total)} 
            icon={IndianRupee} 
            tone={REPORT_TYPES.find(r => r.id === type)?.tone as any}
          />
        </div>

        {/* Main Report Area */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden border-none shadow-elegant bg-card/50 backdrop-blur-sm p-4 sm:p-8" ref={reportRef}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b pb-6">
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/60">{t("businessIntelligence")}</div>
                <h3 className="font-display font-black text-3xl flex items-center gap-3 capitalize">
                  {t(type)}
                  <Badge className="bg-primary/10 text-primary border-primary/20 font-mono text-xs px-3">{reportData.rows.length} {t("records")}</Badge>
                </h3>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t("quickSearch")} className="pl-10 h-11 bg-white/50 backdrop-blur-sm border-primary/5 focus:border-primary/30 rounded-xl shadow-sm" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-4">
              {reportData.rows.length === 0 && (
                <div className="col-span-full py-32 text-center text-muted-foreground italic border-4 border-dashed rounded-[2rem] bg-muted/20">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="text-xl font-medium">{t("noBookingsMatch")}</p>
                </div>
              )}
              {reportData.rows.map((row, idx) => (
                <ReportCard key={idx} type={type} row={row} t={t} />
              ))}
            </div>

            {reportData.rows.length > 0 && (
              <div className="mt-12 pt-8 border-t-4 border-primary/5 space-y-4">
                {renderFooter(type, reportData, t)}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
};

// --- RESPONSIVE CARD COMPONENT ---

const ReportCard = ({ type, row, t }: { type: ReportType, row: any, t: any }) => {
  switch (type) {
    case "income":
      return (
        <Card className="p-5 border-success/10 hover:border-success/30 transition-all shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="space-y-1">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">{fmtDate(row.date)}</div>
              <h4 className="font-bold text-lg leading-tight">{row.customer}</h4>
            </div>
            <Badge variant="outline" className="bg-success/10 text-success border-success/20 font-black text-[9px] uppercase px-3">{row.type}</Badge>
          </div>
          <div className="flex justify-between items-end pt-4 border-t border-success/5">
            <div className="text-[10px] font-bold text-muted-foreground uppercase">{row.method}</div>
            <div className="text-2xl font-display font-black text-success">{fmtINR(row.amount)}</div>
          </div>
        </Card>
      );
    case "expense":
      return (
        <Card className="p-5 border-destructive/10 hover:border-destructive/30 transition-all shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="space-y-1">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">{fmtDate(row.date)}</div>
              <h4 className="font-bold text-lg leading-tight">{row.category || t("none")}</h4>
            </div>
            <div className="bg-destructive/10 p-2 rounded-lg text-destructive"><TrendingDown className="h-4 w-4" /></div>
          </div>
          <p className="text-xs text-muted-foreground italic line-clamp-1 mb-4">"{row.description || "—"}"</p>
          <div className="flex justify-end pt-4 border-t border-destructive/5">
            <div className="text-2xl font-display font-black text-destructive">{fmtINR(row.amount)}</div>
          </div>
        </Card>
      );
    case "booking":
    case "pending_payments":
    case "overdue_balance":
      return (
        <Card className="p-5 border-primary/10 hover:border-primary/30 transition-all shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="space-y-1">
              <div className="text-[10px] font-black uppercase tracking-widest text-primary/60">{row.booking_id}</div>
              <h4 className="font-bold text-lg leading-tight">{row.customer_name}</h4>
              <div className="text-xs text-muted-foreground font-medium">{fmtDate(row.booking_date || row.start_date)}</div>
            </div>
            <Badge variant="outline" className={`font-black text-[9px] uppercase px-3 border-2 ${statusTone[row.status]}`}>{t(row.status) || row.status}</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 py-4 border-y border-primary/5 my-4">
            <div className="text-center">
              <div className="text-[9px] font-bold text-muted-foreground uppercase opacity-60 mb-1">{t("total")}</div>
              <div className="font-bold text-sm">{fmtINR(row.pricing?.totalAmount)}</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] font-bold text-muted-foreground uppercase opacity-60 mb-1">{t("paid")}</div>
              <div className="font-bold text-sm text-success">{fmtINR(row.total_paid || row.pricing?.advance || 0)}</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] font-bold text-muted-foreground uppercase opacity-60 mb-1">{t("balance")}</div>
              <div className="font-bold text-sm text-destructive">{fmtINR(row.remaining_amount)}</div>
            </div>
          </div>
          <div className="flex justify-center">
            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${Number(row.remaining_amount) > 0 ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
              {Number(row.remaining_amount) > 0 ? t("paymentPending") || "Payment Pending" : t("fullyPaid") || "Fully Paid"}
            </div>
          </div>
        </Card>
      );
    case "vendor_borrowed":
      return (
        <Card className="p-5 border-primary/10 hover:border-primary/30 transition-all shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div className="bg-primary/10 p-3 rounded-xl"><ArrowUpFromLine className="h-6 w-6 text-primary" /></div>
            <div className="text-right">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{t("vendorBorrowed")}</div>
              <div className="text-4xl font-display font-black text-primary">{row.qty}</div>
            </div>
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-lg leading-tight">{row.name}</h4>
            <div className="text-sm text-muted-foreground flex items-center gap-2"><IndianRupee className="h-3 w-3" /> {row.vendor}</div>
          </div>
        </Card>
      );
    case "items_return":
      return (
        <Card className="p-5 border-success/10 hover:border-success/30 transition-all shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="space-y-1">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">{fmtDate(row.date)}</div>
              <h4 className="font-bold text-lg leading-tight">{row.item}</h4>
            </div>
            <Badge variant="secondary" className="text-[9px] font-black uppercase px-3">{t(row.type) || row.type}</Badge>
          </div>
          <div className="flex justify-between items-end pt-4 border-t border-success/5">
            <div className="text-xs text-muted-foreground font-bold uppercase">{row.customer}</div>
            <div className="text-3xl font-display font-black text-success">{row.qty}</div>
          </div>
        </Card>
      );
    default: return null;
  }
};

const renderFooter = (type: ReportType, data: any, t: any) => {
  switch (type) {
    case "income":
      return <div className="bg-success/5 p-6 rounded-2xl border-2 border-success/20 flex justify-between items-center"><span className="text-sm font-black uppercase tracking-widest text-success/70">{t("totalIncomeCollected")}</span><span className="text-4xl font-display font-black text-success">{fmtINR(data.total)}</span></div>;
    case "expense":
      return <div className="bg-destructive/5 p-6 rounded-2xl border-2 border-destructive/20 flex justify-between items-center"><span className="text-sm font-black uppercase tracking-widest text-destructive/70">{t("totalExpensesPaid")}</span><span className="text-4xl font-display font-black text-destructive">{fmtINR(data.total)}</span></div>;
    case "booking":
    case "pending_payments":
    case "overdue_balance":
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 bg-muted/50 rounded-2xl border border-primary/5 flex flex-col items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">{t("totalBookingsValue")}</span>
            <span className="text-2xl font-display font-bold">{fmtINR(data.total)}</span>
          </div>
          <div className="p-5 bg-success/5 rounded-2xl border border-success/20 flex flex-col items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-success/60 mb-2">{t("totalPaidAmount")}</span>
            <span className="text-2xl font-display font-bold text-success">{fmtINR(data.paid)}</span>
          </div>
          <div className="p-5 bg-destructive/5 rounded-2xl border-4 border-destructive/20 flex flex-col items-center ring-4 ring-destructive/5">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-destructive/60 mb-2 font-black">{t("netBalancePending")}</span>
            <span className="text-4xl font-display font-black text-destructive">{fmtINR(data.balance)}</span>
          </div>
        </div>
      );
    case "vendor_borrowed":
      return <div className="bg-primary/5 p-6 rounded-2xl border-2 border-primary/20 flex justify-between items-center"><span className="text-sm font-black uppercase tracking-widest text-primary/70">{t("uniqueItemsBorrowed")}</span><span className="text-4xl font-display font-black text-primary">{data.total}</span></div>;
    case "items_return":
      return <div className="bg-success/5 p-6 rounded-2xl border-2 border-success/20 flex justify-between items-center"><span className="text-sm font-black uppercase tracking-widest text-success/70">{t("totalItemsReturned")}</span><span className="text-4xl font-display font-black text-success">{data.total}</span></div>;
    default: return null;
  }
};

export default Reports;
