import React, { useEffect, useState, useMemo } from "react";
import { localDataService } from "@/services/localDataService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { 
  Plus, Search, AlertTriangle, FileText, 
  User, Layers, Box, CheckCircle2,
  Minus, QrCode, StickyNote, Clock, Trash2
} from "lucide-react";
import { fmtINR } from "@/lib/format";
import { sendWhatsappConfirmation } from "@/lib/whatsapp";
import { useI18n } from "@/context/I18nContext";
import { VoiceInput } from "@/components/VoiceInput";
import { toast } from "react-hot-toast";
import { BookingBill } from "@/components/BookingBill";
import { ItemCard } from "./ItemCard";
import { useQueryClient } from "@tanstack/react-query";

interface CreateBookingDialogProps {
  open: any;
  onClose: () => void;
}

export const CreateBookingDialog: React.FC<CreateBookingDialogProps> = ({ open, onClose }) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [functionTypes, setFunctionTypes] = useState<any[]>([]);
  const [upiIds, setUpiIds] = useState<any[]>([]);

  // Form State
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
  const [paymentOption, setPaymentOption] = useState<"Full Now" | "Pay Later" | "Half Now">(editBooking?.payment_option || "Full Now");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "UPI">(editBooking?.payment_method || "Cash");
  const [selectedUpiId, setSelectedUpiId] = useState<string>(editBooking?.upi_id || "");
  const [numberOfDays, setNumberOfDays] = useState<number>(editBooking?.number_of_days || 1);
  const [extraCharges, setExtraCharges] = useState<string>(editBooking?.extra_charges?.toString() || "");

  const [showBillPreview, setShowBillPreview] = useState(false);
  const [busy, setBusy] = useState(false);

  const isComplete = editBooking?.status === "Complete";

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
      setPaymentOption("Full Now");
      setPaymentMethod("Cash");
      setSelectedUpiId("");
      setNumberOfDays(1);
      setExtraCharges("");
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
      setNumberOfDays(editBooking.number_of_days || 1);
      setExtraCharges(editBooking.extra_charges?.toString() || "");
    }
  }, [open, isEdit]);

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
    } else {
      setSelectedCustomer(null);
      setPendingBalance(0);
      
      // If no customer found, and the search query looks like a phone number,
      // auto-populate the phone field for the new customer.
      const isNumeric = /^\d+$/.test(query);
      if (isNumeric && query.length >= 10) {
        setPhone(query);
      }
    }
  };

  const addItem = (it: any) => {
    if (selectedItems.find(si => si.item_id === it.id)) return;
    const price = pricingMode === "Takeaway" ? (it.price_takeaway ?? it.price ?? 0) : (it.price_delivery ?? it.price ?? 0);
    const available = Number(it.available_quantity || 0);
    setSelectedItems([...selectedItems, { 
      item_id: it.id, 
      name: it.name, 
      quantity: 1, 
      price, 
      borrow_from: null,
      is_out_of_stock: 1 > available,
      available_qty: available
    }]);
  };

  const updateItemQty = (id: string, q: number) => {
    setSelectedItems(selectedItems.map(si => {
      if (si.item_id === id) {
        const available = si.available_qty || 0;
        return { ...si, quantity: q, is_out_of_stock: q > available };
      }
      return si;
    }));
  };

  const removeItem = (id: string) => {
    setSelectedItems(selectedItems.filter(si => si.item_id !== id));
  };

  const assignVendor = (itemId: string, vendorId: string) => {
    setSelectedItems(selectedItems.map(si => si.item_id === itemId ? { ...si, borrow_from: vendorId === "none" ? null : vendorId } : si));
  };

  const subtotal = selectedItems.reduce((sum, si) => sum + (si.quantity * si.price * numberOfDays), 0);
  const total = subtotal + Number(deliveryCharge || 0) + Number(extraCharges || 0) - Number(discount || 0);

  const calculatedReturnDate = useMemo(() => {
    if (!bookingDate) return "";
    const d = new Date(bookingDate);
    d.setDate(d.getDate() + numberOfDays);
    return d.toISOString().split('T')[0];
  }, [bookingDate, numberOfDays]);

  useEffect(() => {
    setReturnDate(calculatedReturnDate);
  }, [calculatedReturnDate]);
  
  const upiLink = useMemo(() => {
    if (paymentMethod !== "UPI" || !selectedUpiId) return "";
    const upi = upiIds.find(u => u.id === selectedUpiId);
    if (!upi) return "";
    const amountToPay = paymentOption === "Full Now" ? total : (paymentOption === "Half Now" ? Number(advance) : 0);
    const payeeName = encodeURIComponent("ShivaShakti Shamiyana");
    const upiNote = encodeURIComponent(`Booking Payment - ${customerName || "Customer"}`);
    let link = `upi://pay?pa=${upi.upi_id}&pn=${payeeName}&cu=INR&tn=${upiNote}`;
    if (amountToPay > 0) link += `&am=${amountToPay}`;
    return link;
  }, [paymentMethod, selectedUpiId, paymentOption, total, advance, upiIds, customerName]);

  const qrUrl = upiLink ? `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(upiLink)}` : "";

  const submit = async () => {
    if (!customerName || !phone) return toast.error(t("customerRequired") || "Customer Name and Phone Number are required");
    if (selectedItems.length === 0) return toast.error(t("addItemsToBooking") || "Add at least one item to the booking");
    setBusy(true);
    
    if (!paymentOption) return toast.error("Please select a payment choice.");

    let payment_status = "Pending";
    if (paymentOption === "Full Now") payment_status = "Paid";
    else if (paymentOption === "Half Now") payment_status = "Partial";
    else if (paymentOption === "Pay Later") payment_status = "Pending";

    const bookingData = {
      customer_name: customerName,
      phone: phone,
      address: place,
      booking_date: bookingDate,
      expected_return_date: returnDate,
      number_of_days: numberOfDays,
      extra_charges: Number(extraCharges || 0),
      function_type: functionType,
      pricing_mode: pricingMode,
      items: selectedItems,
      customer_id: selectedCustomer?.id || null,
      pricing: {
        subtotal,
        deliveryCharge: pricingMode === "Delivery" ? Number(deliveryCharge || 0) : null,
        extraCharges: Number(extraCharges || 0),
        discount: discount === "" ? null : Number(discount),
        advance: advance === "" ? null : Number(advance),
        totalAmount: total
      },
      payment_option: paymentOption,
      payment_method: paymentMethod,
      upi_id: selectedUpiId || null,
      remaining_amount: total - (paymentOption === "Full Now" ? total : (paymentOption === "Half Now" ? Number(advance) : 0)),
      total_paid: paymentOption === "Full Now" ? total : (paymentOption === "Half Now" ? Number(advance) : 0),
      status: isEdit ? editBooking.status : "Confirmed",
      payment_status: payment_status,
      note: note,
      item_checklist: selectedItems.map(si => ({ itemName: si.name, item_id: si.item_id, bookedQty: si.quantity, returnedQty: 0, returned: false })),
      vendor_borrows: selectedItems.filter(si => si.borrow_from).map(si => ({ item_id: si.item_id, vendor_id: si.borrow_from, quantity: si.quantity }))
    };

    // Auto-status logic: if items returned, assign the correct intermediate status
    const allReturnedInChecklist = isEdit ? (editBooking.item_checklist || []).every((i: any) => i.returned) : false;
    if (isEdit) {
      if (!allReturnedInChecklist) {
        bookingData.status = "Pending Items";
      } else {
        if (bookingData.payment_status === "Paid") bookingData.status = "Return + Paid";
        else if (bookingData.payment_status === "Pending") bookingData.status = "Return but Not Paid";
        else if (bookingData.payment_status === "Partial") {
          if (bookingData.payment_option === "Half Now") bookingData.status = "Return + Pending";
          else bookingData.status = "Return but Half Paid";
        }
      }
    }

    if (isEdit && editBooking.payment_status === "Paid" && Number(extraCharges || 0) > (editBooking.extra_charges || 0)) {
      if (!confirm("Extra charges have been added. Has the customer paid this balance?")) {
        bookingData.payment_status = "Partial";
        bookingData.payment_option = "Half Now";
        if (allReturnedInChecklist) bookingData.status = "Return but Half Paid";
      }
    }

    try {
      if (isEdit) {
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
        if (newBooking) {
          sendWhatsappConfirmation(newBooking);
          // Handle Vendor Transactions for borrowing
          if (bookingData.vendor_borrows.length > 0) {
            await Promise.all(bookingData.vendor_borrows.map(async (v: any) => {
              await localDataService.insert("vendor_transactions", {
                vendor_id: v.vendor_id,
                booking_id: newBooking.id,
                type: "borrow",
                items: [{
                  item_id: v.item_id,
                  name: selectedItems.find(si => si.item_id === v.item_id)?.name || "Item",
                  quantity: v.quantity
                }],
                created_at: new Date().toISOString()
              });
            }));
          }
        }
      }

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
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save booking");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[1000px] w-[95vw] max-h-[95vh] overflow-y-auto p-0 border-none shadow-2xl">
        <div className="bg-primary p-6 text-primary-foreground flex justify-between items-center sticky top-0 z-10">
          <DialogHeader className="flex-1">
            <DialogTitle className="font-display text-3xl font-bold tracking-tight">{isEdit ? t("editBooking") : t("createNewOrder")}</DialogTitle>
            <div className="flex items-center gap-2 opacity-80 text-sm mt-1">
              <Clock className="h-4 w-4" /> {new Date().toLocaleString()}
            </div>
          </DialogHeader>
          <div className="hidden sm:block bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20 mr-4">
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">{t("todayDate")}</div>
            <div className="font-bold">{new Date().toDateString()}</div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-primary-foreground hover:bg-white/20 rounded-full h-10 w-10 shrink-0"
          >
            <Plus className="h-6 w-6 rotate-45" />
          </Button>
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
                className="pl-12 pr-12 h-14 text-lg border-primary/20 focus:border-primary shadow-sm"
              />
              {searchQuery && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleCustomerSearch("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-4 w-4 rotate-45" />
                </Button>
              )}
            </div>
            {searchQuery && (
              <div className="px-4 animate-in fade-in slide-in-from-top-1">
                {selectedCustomer ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20 text-success text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>
                      Customer found: <strong>{selectedCustomer.name}</strong>. Details have been auto-populated.
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border border-border text-muted-foreground text-sm font-medium">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>
                      No matching customer found. Please enter details for a new customer.
                    </span>
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                    <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="h-11 font-semibold" disabled={isComplete} />
                    {!isComplete && <VoiceInput onTranscript={setCustomerName} />}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold opacity-70">{t("phone")} *</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11" disabled={isComplete} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold opacity-70">{t("address")}</Label>
                  <div className="flex gap-2">
                    <Textarea value={place} onChange={(e) => setPlace(e.target.value)} className="min-h-[80px]" disabled={isComplete} />
                    {!isComplete && <VoiceInput onTranscript={setPlace} />}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold opacity-70">{t("bookingDateTime")}</Label>
                    <Input type="datetime-local" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className="h-11 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold opacity-70">Duration (Days)</Label>
                    <Input type="number" min="1" value={numberOfDays} onChange={(e) => setNumberOfDays(Math.max(1, parseInt(e.target.value) || 1))} className="h-11 font-bold" disabled={isComplete} />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs font-bold opacity-70">{t("returnDate")} (Read-only)</Label>
                    <Input type="date" value={returnDate} readOnly className="h-11 text-xs bg-muted/50 cursor-not-allowed" />
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
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Additional notes..." className="min-h-[80px] flex-1" />
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
                        <div className="bg-warning/10 p-2 rounded border border-warning/20">
                          <div className="text-[9px] font-black text-warning uppercase flex items-center gap-1 mb-2">
                            <AlertTriangle className="h-3 w-3" /> {t("outOfStockVendor")}
                          </div>
                          <Select value={si.borrow_from || "none"} onValueChange={(v) => assignVendor(si.item_id, v)}>
                            <SelectTrigger className="h-8 text-[10px] border-warning/30 bg-background"><SelectValue /></SelectTrigger>
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
                        <div className="text-sm font-bold text-primary">
                          <span className="text-[10px] opacity-40 font-normal mr-2">{si.price}×{si.quantity}×{numberOfDays}d</span>
                          {fmtINR(si.price * si.quantity * numberOfDays)}
                        </div>
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

          {/* ITEM SELECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t pt-8">
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
              </div>
            </div>

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

          {/* PRICING & PAYMENT */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t pt-8">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <Button 
                    variant={paymentOption === "Full Now" ? "default" : "outline"} 
                    className={`flex-1 text-[10px] font-black uppercase h-10 ${paymentOption === "Full Now" ? "bg-success hover:bg-success/90" : ""}`}
                    onClick={() => { setPaymentOption("Full Now"); setAdvance(total.toString()); }}
                  >
                    Pay Full Amount Now
                  </Button>
                  <Button 
                    variant={paymentOption === "Half Now" ? "default" : "outline"} 
                    className={`flex-1 text-[10px] font-black uppercase h-10 ${paymentOption === "Half Now" ? "bg-warning hover:bg-warning/90" : ""}`}
                    onClick={() => setPaymentOption("Half Now")}
                  >
                    Pay Half Now, Half at Return
                  </Button>
                  <Button 
                    variant={paymentOption === "Pay Later" ? "default" : "outline"} 
                    className={`flex-1 text-[10px] font-black uppercase h-10 ${paymentOption === "Pay Later" ? "bg-destructive hover:bg-destructive/90" : ""}`}
                    onClick={() => { setPaymentOption("Pay Later"); setAdvance("0"); }}
                  >
                    Pay Full Amount at Return
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold opacity-70">Extra / Late Return Charges (if any) (₹)</Label>
                    <Input type="number" placeholder="0" value={extraCharges} onChange={(e) => setExtraCharges(e.target.value)} className="h-12 text-lg border-accent/20" disabled={isComplete} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold opacity-70">{t("discount")} (₹)</Label>
                    <Input type="number" placeholder="0" value={discount} onChange={(e) => setDiscount(e.target.value)} className="h-12 text-lg" disabled={isComplete} />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs font-bold opacity-70">{t("advance")} (₹)</Label>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      value={advance} 
                      onChange={(e) => {
                        setAdvance(e.target.value);
                        if (Number(e.target.value) >= total) setPaymentOption("Full Now");
                        else if (Number(e.target.value) > 0) setPaymentOption("Half Now");
                        else setPaymentOption("Pay Later");
                      }} 
                      className="h-12 text-lg font-bold text-success" 
                    />
                  </div>
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
                <div className="flex flex-col sm:flex-row gap-6 animate-in fade-in slide-in-from-right-4">
                  <div className="flex-1 space-y-4">
                    <Select value={selectedUpiId} onValueChange={setSelectedUpiId}>
                      <SelectTrigger className="h-12"><SelectValue placeholder={t("chooseUpiId")} /></SelectTrigger>
                      <SelectContent>
                        {upiIds.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.upi_id})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full sm:w-36 h-36 bg-white border rounded-2xl flex items-center justify-center p-2 shadow-sm">
                    {qrUrl ? <img src={qrUrl} alt="QR" className="w-full h-full object-contain" /> : <QrCode className="h-10 w-10 opacity-20" />}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-muted p-4 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 border-t sticky bottom-0 z-10 backdrop-blur-md">
          <div className="text-center sm:text-left w-full sm:w-auto">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{t("finalBalanceDue")}</div>
            <div className="text-3xl sm:text-4xl font-display font-bold text-destructive">
              {fmtINR(total - (paymentOption === "Full Now" ? total : (paymentOption === "Half Now" ? Number(advance) : 0)))}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button variant="outline" onClick={() => setShowBillPreview(true)} className="h-12 sm:h-14 px-6 font-bold flex-1" disabled={selectedItems.length === 0}>
              <FileText className="mr-2 h-5 w-5" /> {t("previewBill")}
            </Button>
            <div className="flex gap-2 flex-1">
              <Button variant="ghost" onClick={onClose} className="h-12 sm:h-14 flex-1 font-bold" disabled={busy}>{t("discard")}</Button>
              <Button onClick={submit} className="bg-primary hover:bg-primary/90 h-12 sm:h-14 px-8 sm:px-16 font-bold shadow-2xl shadow-primary/40 text-base sm:text-lg flex-[2]" disabled={busy}>
                {busy ? t("loading") : t("confirmSaveOrder")}
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
              booking_id: isEdit ? editBooking.booking_id : "TEMP",
              customer_name: customerName,
              phone: phone,
              address: place,
              booking_date: bookingDate,
              items: selectedItems,
              pricing: { 
                subtotal, 
                deliveryCharge: Number(deliveryCharge || 0), 
                discount: Number(discount || 0), 
                advance: Number(advance || 0), 
                totalAmount: total 
              }
            }} 
          />
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
