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
          <Card className="overflow-hidden border-none shadow-elegant bg-card/50 backdrop-blur-sm" ref={reportRef}>
            <div className="bg-muted/30 px-6 py-4 border-b flex justify-between items-center">
              <h3 className="font-display font-bold text-lg flex items-center gap-2">
                {t(type)}
                <Badge variant="outline" className="ml-2 font-mono text-[10px]">{reportData.rows.length} {t("records")}</Badge>
              </h3>
              <div className="relative w-48">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input placeholder={t("quickSearch")} className="pl-7 h-8 text-xs bg-transparent" />
              </div>
            </div>
            
            <div className="overflow-x-auto min-h-[500px]">
              <table className="w-full text-sm">
                <thead className="bg-muted/10 text-[10px] uppercase tracking-widest text-muted-foreground font-bold border-b">
                  {renderHeaders(type, t)}
                </thead>
                <tbody className="divide-y divide-border/50">
                  {reportData.rows.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-20 text-center text-muted-foreground italic">
                        {t("noBookingsMatch")}
                      </td>
                    </tr>
                  )}
                  {reportData.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-primary/5 transition-colors group">
                      {renderRow(type, row, t)}
                    </tr>
                  ))}
                </tbody>
                {reportData.rows.length > 0 && (
                  <tfoot className="bg-muted/30 font-bold border-t-2 border-primary/10">
                    {renderFooter(type, reportData, t)}
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
};

// --- TABLE RENDERING HELPERS ---

const renderHeaders = (type: ReportType, t: any) => {
  switch (type) {
    case "income":
      return <tr><th className="text-left px-6 py-4">{t("date")}</th><th className="text-left px-6 py-4">{t("customer")}</th><th className="text-left px-6 py-4">{t("type")}</th><th className="text-left px-6 py-4">{t("method")}</th><th className="text-right px-6 py-4">{t("amount")}</th></tr>;
    case "expense":
      return <tr><th className="text-left px-6 py-4">{t("date")}</th><th className="text-left px-6 py-4">{t("category")}</th><th className="text-left px-6 py-4">{t("description")}</th><th className="text-right px-6 py-4">{t("amount")}</th></tr>;
    case "booking":
    case "pending_payments":
    case "overdue_balance":
      return <tr><th className="text-left px-6 py-4">{t("bookings")} ID</th><th className="text-left px-6 py-4">{t("customer")}</th><th className="text-left px-6 py-4">{t("date")}</th><th className="text-right px-6 py-4">{t("total")}</th><th className="text-right px-6 py-4">{t("paid")}</th><th className="text-right px-6 py-4">{t("balance")}</th><th className="text-left px-6 py-4">{t("status")}</th></tr>;
    case "vendor_borrowed":
      return <tr><th className="text-left px-6 py-4">{t("itemCatalogName")}</th><th className="text-left px-6 py-4">{t("vendors")}</th><th className="text-right px-6 py-4">{t("vendorBorrowed")}</th></tr>;
    case "items_return":
      return <tr><th className="text-left px-6 py-4">{t("date")}</th><th className="text-left px-6 py-4">{t("itemCatalogName")}</th><th className="text-left px-6 py-4">{t("from")}</th><th className="text-left px-6 py-4">{t("type")}</th><th className="text-right px-6 py-4">{t("qty")}</th></tr>;
  }
};

const renderRow = (type: ReportType, r: any, t: any) => {
  switch (type) {
    case "income":
      return <><td className="px-6 py-4 font-medium text-muted-foreground">{fmtDate(r.date)}</td><td className="px-6 py-4 font-bold">{r.customer}</td><td className="px-6 py-4"><Badge variant="outline" className="text-[10px] uppercase font-bold opacity-70">{r.type}</Badge></td><td className="px-6 py-4 text-xs font-semibold">{r.method}</td><td className="px-6 py-4 text-right text-success font-bold text-lg">{fmtINR(r.amount)}</td></>;
    case "expense":
      return <><td className="px-6 py-4 font-medium text-muted-foreground">{fmtDate(r.date)}</td><td className="px-6 py-4 font-bold">{r.category || t("none")}</td><td className="px-6 py-4 text-xs text-muted-foreground italic line-clamp-1">{r.description || "—"}</td><td className="px-6 py-4 text-right text-destructive font-bold text-lg">{fmtINR(r.amount)}</td></>;
    case "booking":
    case "pending_payments":
    case "overdue_balance":
      return <><td className="px-6 py-4 font-mono text-xs font-bold text-primary">{r.booking_id}</td><td className="px-6 py-4 font-bold">{r.customer_name}</td><td className="px-6 py-4 text-muted-foreground">{fmtDate(r.booking_date || r.start_date)}</td><td className="px-6 py-4 text-right font-semibold">{fmtINR(r.pricing?.totalAmount)}</td><td className="px-6 py-4 text-right text-success font-semibold">{fmtINR(r.total_paid || r.pricing?.advance || 0)}</td><td className="px-6 py-4 text-right text-destructive font-bold">{fmtINR(r.remaining_amount)}</td><td className="px-6 py-4"><Badge variant="outline" className={`text-[9px] uppercase font-bold ${statusTone[r.status]}`}>{t(r.status) || r.status}</Badge></td></>;
    case "vendor_borrowed":
      return <><td className="px-6 py-4 font-bold">{r.name}</td><td className="px-6 py-4 text-muted-foreground">{r.vendor}</td><td className="px-6 py-4 text-right font-display font-bold text-primary text-xl">{r.qty}</td></>;
    case "items_return":
      return <><td className="px-6 py-4 font-medium text-muted-foreground">{fmtDate(r.date)}</td><td className="px-6 py-4 font-bold">{r.item}</td><td className="px-6 py-4">{r.customer}</td><td className="px-6 py-4"><Badge variant="secondary" className="text-[9px] uppercase font-bold">{t(r.type) || r.type}</Badge></td><td className="px-6 py-4 text-right font-display font-bold text-lg">{r.qty}</td></>;
  }
};

const renderFooter = (type: ReportType, data: any, t: any) => {
  switch (type) {
    case "income":
      return <tr><td colSpan={4} className="px-6 py-4 text-right uppercase tracking-widest text-[10px]">{t("totalIncomeCollected")}</td><td className="px-6 py-4 text-right text-success text-xl">{fmtINR(data.total)}</td></tr>;
    case "expense":
      return <tr><td colSpan={3} className="px-6 py-4 text-right uppercase tracking-widest text-[10px]">{t("totalExpensesPaid")}</td><td className="px-6 py-4 text-right text-destructive text-xl">{fmtINR(data.total)}</td></tr>;
    case "booking":
    case "pending_payments":
    case "overdue_balance":
      return (
        <>
          <tr><td colSpan={3} className="px-6 py-2 text-right uppercase tracking-widest text-[10px]">{t("totalBookingsValue")}</td><td className="px-6 py-2 text-right">{fmtINR(data.total)}</td><td colSpan={3}></td></tr>
          <tr><td colSpan={3} className="px-6 py-2 text-right uppercase tracking-widest text-[10px]">{t("totalPaidAmount")}</td><td className="px-6 py-2 text-right text-success">{fmtINR(data.paid)}</td><td colSpan={3}></td></tr>
          <tr className="bg-primary/5 text-primary"><td colSpan={3} className="px-6 py-3 text-right uppercase tracking-widest text-[10px] font-black">{t("netBalancePending")}</td><td className="px-6 py-3 text-right text-destructive text-xl">{fmtINR(data.balance)}</td><td colSpan={3}></td></tr>
        </>
      );
    case "vendor_borrowed":
      return <tr><td colSpan={2} className="px-6 py-4 text-right uppercase tracking-widest text-[10px]">{t("uniqueItemsBorrowed")}</td><td className="px-6 py-4 text-right text-primary text-xl">{data.total}</td></tr>;
    case "items_return":
      return <tr><td colSpan={4} className="px-6 py-4 text-right uppercase tracking-widest text-[10px]">{t("totalItemsReturned")}</td><td className="px-6 py-4 text-right text-success text-xl">{data.total}</td></tr>;
  }
};

export default Reports;
