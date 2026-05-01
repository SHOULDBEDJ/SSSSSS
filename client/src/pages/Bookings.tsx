import { useEffect, useState, useMemo } from "react";
import { localDataService } from "@/services/localDataService";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { 
  Plus, Search, Trash2, AlertTriangle, FileText, MessageCircle, ChevronRight, 
  User, MapPin, Calendar, Clock, Layers, Box, CheckCircle2,
  Minus, QrCode, Mic, StickyNote
} from "lucide-react";
import { fmtINR, fmtDate, statusTone } from "@/lib/format";
import { generateInvoicePDF } from "@/lib/invoice";
import { 
  sendWhatsappConfirmation, 
  sendWhatsappDelivered, 
  sendWhatsappCompletion, 
  sendWhatsappPendingItems, 
  sendWhatsappPendingAmount, 
  sendWhatsappPendingAll,
  sendWhatsappStatus 
} from "@/lib/whatsapp";
import { useI18n } from "@/context/I18nContext";
import { VoiceInput } from "@/components/VoiceInput";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { BookingBill } from "@/components/BookingBill";

const STATUSES = [
  "Confirmed", 
  "Delivered", 
  "Time to Pickup", 
  "Returned", 
  "Pending Items + Amount Balance", 
  "Only Pending Items", 
  "Only Amount Balance", 
  "Complete"
];

const Bookings = () => {
  const { t } = useI18n();
  const [bookings, setBookings] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [openCreate, setOpenCreate] = useState<any>(false);
  const [detail, setDetail] = useState<any | null>(null);

  const load = async () => {
    const data = await localDataService.getAll("bookings");
    setBookings(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = bookings.filter((b) => {
    const okSearch = !search || 
      b.customer_name?.toLowerCase().includes(search.toLowerCase()) || 
      b.phone?.includes(search) || 
      b.booking_id?.toLowerCase().includes(search.toLowerCase()) ||
      (b.customer_id || "").toLowerCase().includes(search.toLowerCase());
    const okStatus = statusFilter === "all" || b.status === statusFilter;
    return okSearch && okStatus;
  });

  return (
    <>
      <PageHeader
        title={t("bookingModule")}
        subtitle={t("bookingSubtitle")}
        actions={
          <Button onClick={() => setOpenCreate(true)} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" /> {t("newBooking")}
          </Button>
        }
      />

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("searchBookingPlaceholder")} className="pl-9 h-11 border-primary/10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-56 h-11"><SelectValue placeholder={t("allStatuses")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allStatuses")}</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{t(s) || s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              <tr>
                <th className="text-left px-6 py-4">{t("bookings")} ID</th>
                <th className="text-left px-6 py-4">{t("customerDetails")}</th>
                <th className="text-left px-6 py-4">{t("bookingDate")}</th>
                <th className="text-left px-6 py-4">{t("status")}</th>
                <th className="text-right px-6 py-4">{t("totalAmount")}</th>
                <th className="text-right px-6 py-4">{t("remaining")}</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center text-muted-foreground py-16 italic">{t("noBookingsMatch")}</td></tr>}
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-muted/30 cursor-pointer transition-colors group" onClick={() => setDetail(b)}>
                  <td className="px-6 py-4 font-mono text-xs font-bold text-primary">{b.booking_id}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-foreground">{b.customer_name}</div>
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">{b.phone}</div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground font-medium">{fmtDate(b.booking_date)}</td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className={`font-bold text-[10px] uppercase ${statusTone[b.status] || "bg-muted"}`}>{t(b.status) || b.status}</Badge>
                  </td>
                  <td className="px-6 py-4 text-right font-display font-bold text-foreground">{fmtINR(b.pricing?.totalAmount || 0)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <span className={Number(b.remaining_amount) > 0 ? "text-destructive font-bold mr-4" : "text-success font-bold mr-4"}>
                        {fmtINR(b.remaining_amount || 0)}
                      </span>
                      
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-primary hover:bg-primary/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenCreate(b);
                          }}
                        >
                          <StickyNote className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm("Delete this booking and restore stock?")) return;
                            try {
                              // Replenish stock
                              const invItems = await localDataService.getAll("inventory_items");
                              await Promise.all(b.items.map(async (item: any) => {
                                const inv = invItems.find((i: any) => i.id === item.item_id);
                                if (inv) {
                                  await localDataService.update("inventory_items", inv.id, {
                                    available_quantity: Number(inv.available_quantity) + item.quantity
                                  });
                                }
                              }));
                              await localDataService.delete("bookings", b.id);
                              toast.success("Booking deleted and stock restored");
                              load();
                            } catch (err) {
                              toast.error("Delete failed");
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground ml-2" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CreateBookingDialog 
        open={openCreate} 
        onClose={() => { setOpenCreate(false); load(); }} 
        t={t}
      />

      {detail && (
        <BookingDetailDialog 
          booking={detail} 
          onClose={() => { setDetail(null); load(); }} 
          onEdit={() => { 
            const toEdit = detail;
            setDetail(null);
            setOpenCreate(toEdit); // Reusing Create dialog for Edit
          }}
          t={t}
        />
      )}
    </>
  );
};

/* ---------------- CREATE BOOKING DIALOG ---------------- */
const CreateBookingDialog = ({ open, onClose, t }: any) => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [functionTypes, setFunctionTypes] = useState<any[]>([]);
  const [upiIds, setUpiIds] = useState<any[]>([]);

  // Form State (initialized for Create or Edit)
  const isEdit = typeof open === "object" && open !== null;
  const editBooking = isEdit ? open : null;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [pendingBalance, setPendingBalance] = useState(0);

  const [bookingDate, setBookingDate] = useState(editBooking?.booking_date || new Date().toISOString().slice(0, 16));
  const [customerName, setCustomerName] = useState(editBooking?.customer_name || "");
  const [phone, setPhone] = useState(editBooking?.phone || "");
  const [place, setPlace] = useState(editBooking?.address || "");
  const [returnDate, setReturnDate] = useState(editBooking?.return_date || "");
  const [functionType, setFunctionType] = useState(editBooking?.function_type || "");
  const [pricingMode, setPricingMode] = useState<"Delivery" | "Takeaway">(editBooking?.pricing_mode || "Takeaway");
  const [deliveryCharge, setDeliveryCharge] = useState<string>(editBooking?.pricing?.deliveryCharge?.toString() || "");
  const [note, setNote] = useState(editBooking?.note || "");
  
  const [selectedCatId, setSelectedCatId] = useState<string>("none");
  const [selectedItems, setSelectedItems] = useState<any[]>(editBooking?.items || []);
  
  const [discount, setDiscount] = useState<string>(editBooking?.pricing?.discount?.toString() || "");
  const [advance, setAdvance] = useState<string>(editBooking?.pricing?.advance?.toString() || "");
  const [paymentOption, setPaymentOption] = useState<"Advance" | "Full" | "Later">(editBooking?.payment_option || "Advance");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "UPI">(editBooking?.payment_method || "Cash");
  const [selectedUpiId, setSelectedUpiId] = useState<string>(editBooking?.upi_id || "");

  const [showBillPreview, setShowBillPreview] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (open) {
        const [c, i, cat, v, f, u] = await Promise.all([
          localDataService.getAll("customers"),
          localDataService.getAll("inventory_items"),
          localDataService.getAll("categories"),
          localDataService.getAll("vendors"),
          localDataService.getAll("function_types"),
          localDataService.getAll("upi_ids")
        ]);
        setCustomers(c);
        setItems(i);
        setCategories(cat);
        setVendors(v);
        setFunctionTypes(f);
        setUpiIds(u);
      }
    };
    init();
  }, [open]);

  // Handle Reset on Close/Open
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setCustomerName("");
      setPhone("");
      setPlace("");
      setReturnDate("");
      setFunctionType("");
      setPricingMode("Takeaway");
      setDeliveryCharge("");
      setNote("");
      setSelectedItems([]);
      setDiscount("");
      setAdvance("");
      setPaymentOption("Advance");
      setPaymentMethod("Cash");
      setSelectedUpiId("");
    } else if (isEdit) {
      setCustomerName(editBooking.customer_name);
      setPhone(editBooking.phone);
      setPlace(editBooking.address);
      setBookingDate(editBooking.booking_date);
      setReturnDate(editBooking.return_date || "");
      setFunctionType(editBooking.function_type || "");
      setPricingMode(editBooking.pricing_mode || "Takeaway");
      setDeliveryCharge(editBooking.pricing?.deliveryCharge?.toString() || "");
      setNote(editBooking.note || "");
      setSelectedItems(editBooking.items || []);
      setDiscount(editBooking.pricing?.discount?.toString() || "");
      setAdvance(editBooking.pricing?.advance?.toString() || "");
      setPaymentOption(editBooking.payment_option || "Advance");
      setPaymentMethod(editBooking.payment_method || "Cash");
      setSelectedUpiId(editBooking.upi_id || "");
    }
  }, [open, isEdit]);

  // Customer Search Logic
  const handleCustomerSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query) {
      setSelectedCustomer(null);
      setPendingBalance(0);
      return;
    }
    const found = customers.find(c => 
      c.id.toLowerCase() === query.toLowerCase() || 
      c.name.toLowerCase().includes(query.toLowerCase()) || 
      c.phone.includes(query)
    );
    if (found) {
      setSelectedCustomer(found);
      const allBookings = await localDataService.getAll("bookings");
      const cBookings = allBookings.filter((b: any) => b.customer_id === found.id && b.status !== "Complete");
      const bal = cBookings.reduce((sum: number, b: any) => sum + Number(b.remaining_amount || 0), 0);
      setPendingBalance(bal);
      
      setCustomerName(found.name);
      setPhone(found.phone);
      setPlace(found.address || "");
      toast.info(t("customerExists"));
    } else {
      setSelectedCustomer(null);
      setPendingBalance(0);
    }
  };

  const addItem = (it: any) => {
    if (selectedItems.find(si => si.item_id === it.id)) return;
    const price = pricingMode === "Takeaway" ? (it.price_takeaway ?? it.price ?? 0) : (it.price_delivery ?? it.price ?? 0);
    setSelectedItems([...selectedItems, { 
      item_id: it.id, 
      name: it.name, 
      quantity: 1, 
      price, 
      borrow_from: null,
      is_out_of_stock: Number(it.available_quantity) <= 0
    }]);
  };

  const updateItemQty = (id: string, q: number) => {
    setSelectedItems(selectedItems.map(si => si.item_id === id ? { ...si, quantity: q } : si));
  };

  const removeItem = (id: string) => {
    setSelectedItems(selectedItems.filter(si => si.item_id !== id));
  };

  const assignVendor = (itemId: string, vendorId: string) => {
    setSelectedItems(selectedItems.map(si => si.item_id === itemId ? { ...si, borrow_from: vendorId === "none" ? null : vendorId } : si));
  };

  const subtotal = selectedItems.reduce((sum, si) => sum + (si.quantity * si.price), 0);
  const total = subtotal + Number(deliveryCharge || 0) - Number(discount || 0);
  
  const upiLink = useMemo(() => {
    if (paymentMethod !== "UPI" || !selectedUpiId) return "";
    const upi = upiIds.find(u => u.id === selectedUpiId);
    if (!upi) return "";
    
    const amountToPay = paymentOption === "Full" ? total : (paymentOption === "Advance" ? Number(advance) : 0);
    
    // pn: Payee Name, tn: Transaction Note, am: Amount, cu: Currency
    const payeeName = encodeURIComponent("ShivaShakti Shamiyana");
    const note = encodeURIComponent(`Booking Payment - ${customerName || "Customer"}`);
    
    let link = `upi://pay?pa=${upi.upi_id}&pn=${payeeName}&cu=INR&tn=${note}`;
    if (amountToPay > 0) {
      link += `&am=${amountToPay}`;
    }
    return link;
  }, [paymentMethod, selectedUpiId, paymentOption, total, advance, upiIds, customerName]);

  const qrUrl = upiLink ? `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(upiLink)}` : "";

  const submit = async () => {
    if (!customerName || !phone) return toast.error(t("customerRequired") || "Customer Name and Phone Number are required");
    if (selectedItems.length === 0) return toast.error(t("addItemsToBooking") || "Add at least one item to the booking");
    setBusy(true);
    
    // Create new booking or update existing
    const bookingData = {
      customer_name: customerName,
      phone: phone,
      address: place,
      booking_date: bookingDate,
      return_date: returnDate,
      function_type: functionType,
      pricing_mode: pricingMode,
      items: selectedItems,
      customer_id: selectedCustomer?.id || null,
      pricing: {
        subtotal,
        deliveryCharge: pricingMode === "Delivery" ? Number(deliveryCharge || 0) : null,
        discount: discount === "" ? null : Number(discount),
        advance: advance === "" ? null : Number(advance),
        totalAmount: total
      },
      payment_option: paymentOption,
      payment_method: paymentMethod,
      upi_id: selectedUpiId || null,
      remaining_amount: total - (paymentOption === "Full" ? total : (paymentOption === "Advance" ? Number(advance) : 0)),
      status: isEdit ? editBooking.status : "Confirmed",
      note: note,
      item_checklist: selectedItems.map(si => ({ itemName: si.name, item_id: si.item_id, returned: false, missingQty: 0 })),
      vendor_borrows: selectedItems.filter(si => si.borrow_from).map(si => ({ item_id: si.item_id, vendor_id: si.borrow_from, quantity: si.quantity }))
    };

    try {
      if (isEdit) {
        // Replenish old stock first
        const invItems = await localDataService.getAll("inventory_items");
        await Promise.all(editBooking.items.map(async (oldItem: any) => {
          const inv = invItems.find((i: any) => i.id === oldItem.item_id);
          if (inv) {
            await localDataService.update("inventory_items", inv.id, {
              available_quantity: Number(inv.available_quantity) + oldItem.quantity
            });
          }
        }));

        await localDataService.update("bookings", editBooking.id, bookingData);
      } else {
        const newBooking = await localDataService.insert("bookings", {
          ...bookingData,
          booking_id: `BKG-${Date.now().toString().slice(-4)}`,
        });
        
        // Send WhatsApp using the returned object
        if (newBooking) {
          sendWhatsappConfirmation(newBooking);
        }
      }

      // Deduct new stock
      const latestInv = await localDataService.getAll("inventory_items");
      await Promise.all(selectedItems.map(async (si) => {
        const invItem = latestInv.find(i => i.id === si.item_id);
        if (invItem) {
          await localDataService.update("inventory_items", si.item_id, {
            available_quantity: Math.max(0, Number(invItem.available_quantity) - si.quantity)
          });
        }
      }));

      toast.success(isEdit ? "Booking updated successfully!" : "Booking saved successfully!");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save booking");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[1000px] max-h-[95vh] overflow-y-auto p-0 border-none shadow-2xl">
        <div className="bg-primary p-6 text-primary-foreground flex justify-between items-center">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl font-bold tracking-tight">{t("createNewOrder")}</DialogTitle>
            <div className="flex items-center gap-2 opacity-80 text-sm mt-1">
              <Clock className="h-4 w-4" /> {new Date().toLocaleString()}
            </div>
          </DialogHeader>
          <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20">
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">{t("todayDate")}</div>
            <div className="font-bold">{new Date().toDateString()}</div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* CUSTOMER SEARCH */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                value={searchQuery} 
                onChange={(e) => handleCustomerSearch(e.target.value)} 
                placeholder={t("searchCustomerPlaceholder")} 
                className="pl-12 h-14 text-lg border-primary/20 focus:border-primary shadow-sm"
              />
            </div>
            
            {searchQuery && (
              <div className="px-4 animate-in fade-in slide-in-from-top-1">
                {selectedCustomer ? (
                  <div className="text-xs font-bold text-success flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Customer found, the details like name number and place are auto fetched, You can change them manually below
                  </div>
                ) : (
                  <div className="text-xs font-bold text-muted-foreground flex items-center gap-2 italic">
                    <AlertTriangle className="h-4 w-4 opacity-50" />
                    No customer found please try taking order with details
                  </div>
                )}
              </div>
            )}

            {pendingBalance > 0 && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-4 text-destructive animate-in slide-in-from-top-2">
                <AlertTriangle className="h-6 w-6" />
                <div className="text-sm font-bold uppercase tracking-tight">
                  {t("warningCustomerBalance")} {fmtINR(pendingBalance)}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* COLUMN 1: CUSTOMER INFO */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <User className="h-4 w-4 text-primary" />
                <h3 className="font-bold uppercase tracking-widest text-[10px]">{t("customerIdentification")}</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold opacity-70">{t("customerName")} *</Label>
                  <div className="flex gap-2">
                    <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="h-11 font-semibold" />
                    <VoiceInput onTranscript={setCustomerName} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold opacity-70">{t("phone")} *</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold opacity-70">{t("address")}</Label>
                  <div className="flex gap-2">
                    <Textarea value={place} onChange={(e) => setPlace(e.target.value)} className="min-h-[80px]" />
                    <VoiceInput onTranscript={setPlace} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold opacity-70">{t("bookingDateTime")}</Label>
                    <Input type="datetime-local" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className="h-11 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold opacity-70">{t("returnDate")}</Label>
                    <Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="h-11 text-xs" />
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN 2: FUNCTION & PRICING MODE */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <Layers className="h-4 w-4 text-primary" />
                <h3 className="font-bold uppercase tracking-widest text-[10px]">{t("orderConfiguration")}</h3>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold opacity-70">{t("functionType")}</Label>
                  <Select value={functionType} onValueChange={setFunctionType}>
                    <SelectTrigger className="h-11"><SelectValue placeholder={t("pickCategory")} /></SelectTrigger>
                    <SelectContent>
                      {functionTypes.map((f: any) => <SelectItem key={f.id} value={f.title}>{f.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-bold opacity-70">{t("pricingMode")}</Label>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setPricingMode("Takeaway")}
                      className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border-2 transition-all font-bold text-sm ${pricingMode === "Takeaway" ? "bg-primary text-primary-foreground border-primary shadow-md" : "border-muted hover:border-primary/30"}`}
                    >
                      {t("takeaway")}
                    </button>
                    <button 
                      onClick={() => setPricingMode("Delivery")}
                      className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border-2 transition-all font-bold text-sm ${pricingMode === "Delivery" ? "bg-primary text-primary-foreground border-primary shadow-md" : "border-muted hover:border-primary/30"}`}
                    >
                      {t("delivery")}
                    </button>
                  </div>
                </div>

                {pricingMode === "Delivery" && (
                  <div className="space-y-1.5 animate-in zoom-in-95">
                    <Label className="text-xs font-bold opacity-70 text-accent">{t("deliveryCharge")} (₹)</Label>
                    <Input 
                      type="number" 
                      placeholder="NULL" 
                      value={deliveryCharge} 
                      onChange={(e) => setDeliveryCharge(e.target.value)} 
                      className="h-12 text-xl font-bold border-accent/20"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold opacity-70 flex items-center gap-1.5">
                    <StickyNote className="h-3 w-3" /> {t("note")}
                  </Label>
                  <div className="flex gap-2">
                    <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Additional notes..." className="min-h-[80px]" />
                    <VoiceInput onTranscript={setNote} />
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN 3: SELECTED ITEMS LIST */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <h3 className="font-bold uppercase tracking-widest text-[10px]">{t("cartSummary")}</h3>
              </div>
              
              <Card className="p-0 border-primary/10 overflow-hidden bg-primary/5">
                <div className="max-h-[350px] overflow-y-auto divide-y divide-primary/5">
                  {selectedItems.length === 0 && (
                    <div className="py-20 text-center text-muted-foreground text-xs italic">{t("cartEmpty")}</div>
                  )}
                  {selectedItems.map((si) => (
                    <div key={si.item_id} className="p-4 space-y-3 bg-card/50">
                      <div className="flex justify-between items-start">
                        <div className="font-bold text-sm leading-tight text-foreground">{si.name}</div>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeItem(si.item_id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                      
                      {si.is_out_of_stock && (
                        <div className="bg-warning/10 p-2 rounded border border-warning/20 animate-pulse">
                          <div className="text-[9px] font-black text-warning uppercase flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> {si.name} {t("outOfStockVendor")}
                          </div>
                          <Select value={si.borrow_from || "none"} onValueChange={(v) => assignVendor(si.item_id, v)}>
                            <SelectTrigger className="h-8 text-[10px] mt-2 border-warning/30 bg-background"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{t("internalInventory")}</SelectItem>
                              {vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => updateItemQty(si.item_id, Math.max(1, si.quantity - 1))}><Minus className="h-3 w-3" /></Button>
                          <span className="text-xs font-black w-6 text-center">{si.quantity}</span>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => updateItemQty(si.item_id, si.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                        </div>
                        <div className="text-sm font-bold text-primary">{fmtINR(si.price * si.quantity)}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t-2 border-dashed border-primary/20 bg-primary/10">
                  <div className="flex justify-between items-center font-display">
                    <span className="text-xs font-bold uppercase tracking-widest opacity-60">{t("estimatedTotal")}</span>
                    <span className="text-2xl font-bold text-primary">{fmtINR(total)}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* TWO COLUMN ITEM SELECTION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-8">
            {/* COLUMN 1: Category Items */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-display font-bold flex items-center gap-2"><Layers className="h-4 w-4 text-accent" /> {t("categoryItems")}</h3>
                <Select value={selectedCatId} onValueChange={setSelectedCatId}>
                  <SelectTrigger className="w-44 h-9 shadow-sm"><SelectValue placeholder={t("pickCategory")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("chooseCategory")}</SelectItem>
                    {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {items.filter(i => i.category_id === selectedCatId && selectedCatId !== "none").map(i => (
                  <ItemCard key={i.id} item={i} mode={pricingMode} onAdd={() => addItem(i)} t={t} />
                ))}
                {(selectedCatId === "none" || items.filter(i => i.category_id === selectedCatId).length === 0) && (
                  <div className="col-span-full py-12 text-center text-muted-foreground text-xs italic">
                    {t("selectCategoryViewItems")}
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 2: Independent Items */}
            <div className="space-y-4">
              <div className="border-b pb-2 flex items-center gap-2">
                <h3 className="font-display font-bold flex items-center gap-2"><Box className="h-4 w-4 text-primary" /> {t("independentItems")}</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {items.filter(i => !i.category_id).map(i => (
                  <ItemCard key={i.id} item={i} mode={pricingMode} onAdd={() => addItem(i)} t={t} />
                ))}
              </div>
            </div>
          </div>

          {/* PRICING & PAYMENT DETAILS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-8">
            <div className="space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary">{t("financialSettlement")}</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold opacity-70">{t("discount")} (₹)</Label>
                  <Input type="number" placeholder="NULL" value={discount} onChange={(e) => setDiscount(e.target.value)} className="h-12 text-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold opacity-70">{t("advance")} (₹)</Label>
                  <Input type="number" placeholder="NULL" value={advance} onChange={(e) => setAdvance(e.target.value)} className="h-12 text-lg font-bold text-success" />
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-xs font-bold opacity-70">{t("paymentOption")}</Label>
                <div className="grid grid-cols-3 gap-3">
                  {(["Advance", "Full", "Later"] as const).map(opt => (
                    <button 
                      key={opt}
                      onClick={() => setPaymentOption(opt)}
                      className={`h-11 rounded-xl border-2 transition-all text-xs font-bold ${paymentOption === opt ? "bg-primary text-primary-foreground border-primary" : "hover:border-primary/30"}`}
                    >
                      {t(`pay${opt}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6 bg-muted/30 p-6 rounded-2xl border border-dashed border-primary/20">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-widest text-primary">{t("paymentExecution")}</h3>
                <div className="flex gap-2">
                  <button onClick={() => setPaymentMethod("Cash")} className={`px-5 py-2 rounded-full text-xs font-bold border-2 transition-all ${paymentMethod === "Cash" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-primary/20"}`}>{t("cash")}</button>
                  <button onClick={() => setPaymentMethod("UPI")} className={`px-5 py-2 rounded-full text-xs font-bold border-2 transition-all ${paymentMethod === "UPI" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-primary/20"}`}>{t("upi")}</button>
                </div>
              </div>

              {paymentMethod === "UPI" && (
                <div className="flex gap-6 animate-in fade-in slide-in-from-right-4">
                  <div className="flex-1 space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold opacity-70">{t("selectUpiId")}</Label>
                      <Select value={selectedUpiId} onValueChange={setSelectedUpiId}>
                        <SelectTrigger className="h-12"><SelectValue placeholder={t("chooseUpiId")} /></SelectTrigger>
                        <SelectContent>
                          {upiIds.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.upi_id})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedUpiId && (
                      <div className="p-4 rounded-xl bg-white border shadow-sm text-center">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">{t("receivingAccount")}</div>
                        <div className="font-bold text-sm text-primary">{upiIds.find(u => u.id === selectedUpiId)?.upi_id}</div>
                      </div>
                    )}
                  </div>
                  <div className="w-36 h-36 bg-white border-2 border-primary/10 rounded-2xl flex items-center justify-center p-2 shadow-inner">
                    {qrUrl ? (
                      <img src={qrUrl} alt="QR Code" className="w-full h-full" />
                    ) : (
                      <div className="text-center space-y-1 opacity-20">
                        <QrCode className="h-10 w-10 mx-auto" />
                        <div className="text-[8px] font-bold uppercase">No QR</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-muted p-8 flex items-center justify-between border-t shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">{t("finalBalanceDue")}</div>
            <div className="text-4xl font-display font-bold text-destructive">
              {fmtINR(total - (paymentOption === "Full" ? total : (paymentOption === "Advance" ? Number(advance) : 0)))}
            </div>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setShowBillPreview(true)} className="h-14 px-8 font-bold border-primary text-primary hover:bg-primary/5" disabled={selectedItems.length === 0}>
              <FileText className="mr-2 h-5 w-5" /> {t("previewBill")}
            </Button>
            <Button variant="ghost" onClick={onClose} className="h-14 px-8 font-bold" disabled={busy}>{t("discard")}</Button>
            <Button onClick={submit} className="bg-primary hover:bg-primary/90 h-14 px-16 font-bold shadow-2xl shadow-primary/40 text-lg" disabled={busy}>
              {busy ? t("loading") : t("confirmSaveOrder")}
            </Button>
          </div>
        </div>

        {/* BILL PREVIEW DIALOG */}
        <Dialog open={showBillPreview} onOpenChange={setShowBillPreview}>
          <DialogContent className="max-w-[850px] max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
            <BookingBill 
              onClose={() => setShowBillPreview(false)}
              booking={{
                booking_id: "PREVIEW",
                customer_name: customerName,
                phone: phone,
                address: place,
                booking_date: bookingDate,
                items: selectedItems.map(si => ({ name: si.name, quantity: si.quantity, price: si.price })),
                pricing: {
                  subtotal,
                  deliveryCharge: Number(deliveryCharge || 0),
                  discount: Number(discount || 0),
                  totalAmount: total
                }
              }} 
            />
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

const ItemCard = ({ item, mode, onAdd, t }: any) => {
  const price = mode === "Takeaway" ? (item.price_takeaway ?? item.price ?? 0) : (item.price_delivery ?? item.price ?? 0);
  const outOfStock = Number(item.available_quantity) <= 0;
  const isLow = !outOfStock && Number(item.available_quantity) <= Number(item.low_stock_threshold || 2);
  
  return (
    <div 
      className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between group ${outOfStock ? "opacity-60 grayscale" : "hover:border-primary/50 hover:bg-primary/5"}`}
      onClick={onAdd}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="font-bold text-xs line-clamp-2 leading-tight">{item.name}</div>
        {(outOfStock || isLow) && <AlertTriangle className={`h-3 w-3 shrink-0 ${isLow ? "text-warning" : "text-destructive"}`} />}
      </div>
      <div className="flex justify-between items-end">
        <div className="text-[10px] font-black text-primary">{fmtINR(price)}</div>
        <div className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${outOfStock ? "bg-destructive text-destructive-foreground" : isLow ? "bg-warning/20 text-warning border border-warning/30" : "bg-muted text-muted-foreground"}`}>
          {outOfStock ? t("out") : isLow ? `LOW: ${item.available_quantity}` : `${item.available_quantity} ${t("left")}`}
        </div>
      </div>
    </div>
  );
};

/* ---------------- BOOKING DETAIL DIALOG ---------------- */
const BookingDetailDialog = ({ booking, onClose, onEdit, t }: any) => {
  const [b, setB] = useState<any>(booking);
  const [checklist, setChecklist] = useState<any[]>(booking.item_checklist || []);
  const [showBillPreview, setShowBillPreview] = useState(false);
  const [busy, setBusy] = useState(false);

  const isReturnFlow = ["Time to Pickup", "Returned", "Pending Items + Amount Balance", "Only Pending Items", "Only Amount Balance"].includes(b.status);
  const missingItems = checklist.filter(i => !i.returned || i.missingQty > 0);
  const missingCount = missingItems.length;
  const isPaymentPending = Number(b.remaining_amount) > 0;

  const updateChecklist = (idx: number, field: string, val: any) => {
    const next = [...checklist];
    next[idx] = { ...next[idx], [field]: val };
    setChecklist(next);
  };

  const deleteBooking = async () => {
    if (!confirm("Are you sure you want to delete this booking?")) return;
    setBusy(true);
    try {
      // Replenish stock
      const invItems = await localDataService.getAll("inventory_items");
      await Promise.all(b.items.map(async (item: any) => {
        const inv = invItems.find((i: any) => i.id === item.item_id);
        if (inv) {
          await localDataService.update("inventory_items", inv.id, {
            available_quantity: Number(inv.available_quantity) + item.quantity
          });
        }
      }));
      await localDataService.delete("bookings", b.id);
      toast.success("Booking deleted and stock replenished");
      onClose();
    } catch (err) {
      toast.error("Failed to delete booking");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const originalStatus = booking.status;
      const newStatus = b.status;

      // WhatsApp Automation Logic
      if (newStatus !== originalStatus) {
        if (newStatus === "Confirmed") sendWhatsappConfirmation(b);
        else if (newStatus === "Delivered") sendWhatsappDelivered(b);
        else if (newStatus === "Complete") sendWhatsappCompletion(b);
        else if (newStatus === "Only Pending Items") sendWhatsappPendingItems(b, missingItems);
        else if (newStatus === "Only Amount Balance") sendWhatsappPendingAmount(b);
        else if (newStatus === "Pending Items + Amount Balance") sendWhatsappPendingAll(b, missingItems);
      }

      // Stock replenishment on completion/return
      const isActuallyReturned = ["Returned", "Complete", "Only Pending Items", "Only Amount Balance", "Pending Items + Amount Balance"].includes(newStatus);
      const wasAlreadyReturned = ["Returned", "Complete", "Only Pending Items", "Only Amount Balance", "Pending Items + Amount Balance"].includes(originalStatus);

      if (isActuallyReturned && !wasAlreadyReturned) {
        const invItems = await localDataService.getAll("inventory_items");
        await Promise.all(checklist.map(async (check) => {
          if (check.returned) {
            const inv = invItems.find((i: any) => i.id === check.item_id);
            if (inv) {
              const originalItem = b.items?.find((it: any) => it.item_id === check.item_id);
              const qtyToReturn = (originalItem?.quantity || 0) - (check.missingQty || 0);
              if (qtyToReturn > 0) {
                await localDataService.update("inventory_items", inv.id, {
                  available_quantity: Number(inv.available_quantity) + qtyToReturn
                });
              }
            }
          }
        }));
      }

      await localDataService.update("bookings", b.id, { 
        status: b.status, 
        item_checklist: checklist,
        remaining_amount: b.remaining_amount
      });
      toast.success(t("bookingUpdated") || "Booking updated successfully");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update booking");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-muted p-8 border-b flex justify-between items-start">
          <div className="flex-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-4">
              {t("orderManagement")}
              <div className="flex gap-2 ml-4">
                <Button variant="outline" size="xs" onClick={onEdit} className="h-7 text-[10px] bg-primary/10 text-primary border-primary/20 hover:bg-primary hover:text-white transition-all font-black">
                  EDIT ORDER
                </Button>
                <Button variant="outline" size="xs" onClick={deleteBooking} className="h-7 text-[10px] bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive hover:text-white transition-all font-black">
                  DELETE
                </Button>
              </div>
            </div>
            <DialogTitle className="font-display text-4xl font-bold tracking-tight mb-4 flex items-center gap-4">
              {b.booking_id}
              <Badge className={`text-xs uppercase font-bold py-1 px-3 ${statusTone[b.status]}`}>{t(b.status) || b.status}</Badge>
            </DialogTitle>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2"><User className="h-4 w-4 opacity-40" /> <strong>{b.customer_name}</strong></div>
              <div className="flex items-center gap-2"><PhoneIcon className="h-4 w-4 opacity-40" /> {b.phone}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{t("balanceDue")}</div>
            <div className={`text-4xl font-display font-bold ${isPaymentPending ? "text-destructive" : "text-success"}`}>
              {fmtINR(b.remaining_amount)}
            </div>
            <Button variant="outline" size="sm" className="mt-4 gap-2 border-primary text-primary font-bold shadow-sm" onClick={() => setShowBillPreview(true)}>
              <FileText className="h-4 w-4" /> {t("viewInvoice")}
            </Button>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* STATUS UPDATE */}
          <div className="space-y-4">
            <Label className="text-xs uppercase font-bold tracking-widest text-primary">{t("currentLifecycleStatus")}</Label>
            <div className="flex gap-4 flex-wrap items-center">
              <Select value={b.status} onValueChange={(s) => setB({ ...b, status: s })}>
                <SelectTrigger className="h-12 w-full md:w-[400px] text-base font-bold border-2 shadow-sm">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => (
                    <SelectItem key={s} value={s} className="font-bold py-3">{t(s) || s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                onClick={() => {
                  if (b.status === "Confirmed") sendWhatsappConfirmation(b);
                  else if (b.status === "Delivered") sendWhatsappDelivered(b);
                  else if (b.status === "Time to Pickup") sendWhatsappStatus(b);
                  else if (b.status === "Complete") sendWhatsappCompletion(b);
                  else if (b.status === "Only Pending Items") sendWhatsappPendingItems(b, missingItems);
                  else if (b.status === "Only Amount Balance") sendWhatsappPendingAmount(b);
                  else if (b.status === "Pending Items + Amount Balance") sendWhatsappPendingAll(b, missingItems);
                  else sendWhatsappStatus(b);
                }}
                className="h-12 px-6 bg-success hover:bg-success/90 font-bold gap-2 shadow-lg shadow-success/20 transition-all active:scale-95"
              >
                <MessageCircle className="h-5 w-5" />
                {b.status === "Confirmed" ? "SEND CONFIRMATION" : 
                 b.status === "Delivered" ? "SEND DELIVERY TEMPLATE" :
                 b.status === "Time to Pickup" ? "SEND PICKUP REMINDER" :
                 b.status === "Complete" ? "SEND THANK YOU" : "SEND STATUS UPDATE"}
              </Button>
            </div>
          </div>

          {/* RETURN CHECKLIST */}
          {isReturnFlow && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <Card className="border-accent/40 shadow-xl shadow-accent/5 overflow-hidden">
                <div className="bg-accent/10 px-8 py-5 border-b border-accent/20 flex justify-between items-center">
                  <h3 className="font-display text-xl font-bold flex items-center gap-3 text-accent">
                    <CheckCircle2 className="h-6 w-6" /> {t("itemReturnChecklist")}
                  </h3>
                  {missingCount > 0 && <Badge variant="destructive" className="animate-pulse px-3 py-1 font-bold">{t("missingItemsDetected")}</Badge>}
                </div>
                
                {b.vendor_borrows?.length > 0 && (
                  <div className="mx-8 mt-6 p-4 rounded-xl border-2 border-warning/40 bg-warning/5 flex items-start gap-4">
                    <AlertTriangle className="h-6 w-6 text-warning mt-0.5" />
                    <div className="text-sm">
                      <div className="font-bold text-warning-foreground uppercase tracking-tight text-[10px]">{t("vendorReturnNotice")}</div>
                      <div className="text-muted-foreground mt-1">
                        ⚠️ {t("vendorReturnNoticeHint")}
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-8 space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    {checklist.map((item, idx) => {
                      const originalItem = b.items?.find((it: any) => it.item_id === item.item_id);
                      const totalQty = originalItem?.quantity || 0;
                      
                      return (
                        <div key={idx} className="flex items-center justify-between p-4 rounded-xl border bg-card/50 hover:bg-card transition-colors shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className="flex gap-1 bg-muted p-1 rounded-lg">
                              <button 
                                onClick={() => updateChecklist(idx, 'returned', true)}
                                className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${item.returned ? "bg-success text-success-foreground shadow-sm" : "text-muted-foreground hover:bg-success/10"}`}
                              >
                                PRESENT
                              </button>
                              <button 
                                onClick={() => {
                                  updateChecklist(idx, 'returned', false);
                                  updateChecklist(idx, 'missingQty', totalQty);
                                }}
                                className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${!item.returned ? "bg-destructive text-destructive-foreground shadow-sm" : "text-muted-foreground hover:bg-destructive/10"}`}
                              >
                                ABSENT
                              </button>
                            </div>
                            <div>
                              <div className="font-bold text-base flex items-center gap-2">
                                {item.itemName}
                                <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">QTY: {totalQty}</Badge>
                              </div>
                              {!item.returned && <div className="text-[10px] text-destructive font-black uppercase tracking-[0.2em] mt-1">{t("status")}: {t("missing")}</div>}
                            </div>
                          </div>
                          
                          {!item.returned && (
                            <div className="flex items-center gap-3 animate-in slide-in-from-right-4 bg-destructive/5 p-3 rounded-xl border border-destructive/20">
                              <span className="text-[10px] font-bold text-destructive uppercase tracking-widest">{t("qtyMissing")}:</span>
                              <div className="flex items-center gap-2 bg-background p-1.5 rounded-xl border-2 border-destructive/20">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => updateChecklist(idx, 'missingQty', Math.max(0, (item.missingQty || 0) - 1))}><Minus className="h-4 w-4" /></Button>
                                <Input 
                                  type="number" 
                                  value={item.missingQty || 0} 
                                  onChange={(e) => updateChecklist(idx, 'missingQty', Math.min(totalQty, Math.max(0, Number(e.target.value))))}
                                  className="h-8 w-14 text-center font-bold border-none bg-transparent focus-visible:ring-0"
                                  placeholder={totalQty.toString()}
                                />
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => updateChecklist(idx, 'missingQty', Math.min(totalQty, (item.missingQty || 0) + 1))}><Plus className="h-4 w-4" /></Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {missingCount > 0 && (
                    <div className="p-4 rounded-xl bg-destructive/10 border-2 border-destructive/20 text-destructive text-center">
                      <div className="font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                        <AlertTriangle className="h-4 w-4" /> {t("itemsMissingHint")}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          <div className="flex gap-4 pt-8 border-t">
            <Button variant="ghost" onClick={onClose} className="h-12 px-8 font-bold text-muted-foreground">{t("cancel")}</Button>
            <div className="ml-auto flex gap-3">
              <Button onClick={save} className="bg-primary hover:bg-primary/90 h-12 px-12 font-bold shadow-2xl shadow-primary/40" disabled={busy}>
                {t("saveUpdates")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* BILL PREVIEW DIALOG */}
      <Dialog open={showBillPreview} onOpenChange={setShowBillPreview}>
        <DialogContent className="max-w-[850px] max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
          <BookingBill 
            onClose={() => setShowBillPreview(false)}
            booking={{
              booking_id: b.booking_id,
              customer_name: b.customer_name,
              phone: b.phone,
              address: b.address,
              booking_date: b.booking_date,
              items: b.items?.map((it: any) => ({ name: it.name, quantity: it.quantity, price: it.price })),
              pricing: b.pricing
            }} 
          />
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

const PhoneIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

export default Bookings;
