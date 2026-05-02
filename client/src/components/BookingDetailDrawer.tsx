import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageCircle, FileText, ChevronDown, RefreshCcw, CheckCircle2 } from "lucide-react";
import { fmtINR, fmtDate, statusTone } from "@/lib/format";
import { useI18n } from "@/context/I18nContext";
import { localDataService } from "@/services/localDataService";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { generateInvoicePDF } from "@/lib/invoice";
import {
  sendWhatsappConfirmation, sendWhatsappBalance, sendWhatsappStatus,
} from "@/lib/whatsapp";
import { PaymentRatingBadge } from "@/components/PaymentRatingBadge";
import { BookingBill } from "@/components/BookingBill";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ReturnItemsDialog } from "@/components/bookings/ReturnItemsDialog";
import { PaymentConfirmationDialog } from "@/components/bookings/PaymentConfirmationDialog";

export const BookingDetailDrawer = ({
  open, onOpenChange, booking,
}: { open: boolean; onOpenChange: (v: boolean) => void; booking: any | null }) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [showBillPreview, setShowBillPreview] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showPaymentCheck, setShowPaymentCheck] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleDeliver = async () => {
    if (!booking) return;
    setBusy(true);
    try {
      await localDataService.update("bookings", booking.id, { ...booking, status: "Delivered" });
      toast.success("Items marked as delivered!");
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    } catch (err) {
      toast.error("Failed to update status");
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = async () => {
    if (!booking) return;

    // Step 1: Check items pending return
    const pendingItems = (booking.item_checklist || []).some((i: any) => !i.returned);
    if (pendingItems) {
      return toast.error("Cannot complete. Items are still pending return.");
    }

    const finalize = async () => {
      setBusy(true);
      try {
        const updated = {
          ...booking,
          status: "Complete",
          payment_status: "Paid",
          remaining_amount: 0,
          total_paid: booking.pricing?.totalAmount || booking.total_paid
        };
        await localDataService.update("bookings", booking.id, updated);
        toast.success("Booking completed successfully!");
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
        onOpenChange(false);
      } catch (err) {
        toast.error("Failed to complete booking");
      } finally {
        setBusy(false);
      }
    };

    // Step 2: Check payment balance
    const currentBalance = Number(booking.remaining_amount || 0);
    if (currentBalance > 0 && booking.payment_status !== 'Paid') {
      setShowPaymentCheck(true);
      return;
    }

    // Step 3: All returned and paid
    await finalize();
  };

  const handleConfirmCompletion = async (confirmed: boolean) => {
    if (confirmed) {
      setBusy(true);
      try {
        const updated = {
          ...booking,
          status: "Complete",
          payment_status: "Paid",
          remaining_amount: 0,
          total_paid: booking.pricing?.totalAmount || booking.total_paid
        };
        await localDataService.update("bookings", booking.id, updated);
        toast.success("Booking completed successfully!");
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
        onOpenChange(false);
      } catch (err) {
        toast.error("Failed to complete booking");
      } finally {
        setBusy(false);
      }
    }
    setShowPaymentCheck(false);
  };
  if (!booking) return null;
  const items: any[] = booking.items || [];
  const payments: any[] = booking.payments || [];
  const total = booking.pricing?.totalAmount || 0;
  const paid = Number(booking.total_paid || 0);
  const balance = Number(booking.remaining_amount ?? Math.max(0, total - paid));
  const allReturned = (booking.item_checklist || []).every((i: any) => i.returned);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl flex items-center gap-3 flex-wrap">
            {booking.booking_id}
            <Badge variant="outline" className={statusTone[booking.status] || ""}>{t(booking.status) || booking.status}</Badge>
            {booking.payment_rating && <PaymentRatingBadge rating={booking.payment_rating} reason={booking.rating_reason} size="md" />}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowBillPreview(true)} className="bg-white hover:bg-muted font-bold border-primary/10">
            <FileText className="h-4 w-4 mr-1.5 text-primary" /> View Invoice
          </Button>
          {booking.status === "Confirmed" && (
            <Button size="sm" variant="outline" className="bg-info/10 text-info border-info/20 hover:bg-info/20" onClick={handleDeliver} disabled={busy}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Mark Delivered
            </Button>
          )}
          {!allReturned && (
            <Button size="sm" variant="outline" className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" onClick={() => setShowReturnDialog(true)}>
              <RefreshCcw className="h-4 w-4 mr-1.5" /> {t("markReturns") || "Mark Returns"}
            </Button>
          )}
          {booking.status !== "Complete" && booking.status !== "Confirmed" && (
            <Button size="sm" className="bg-primary hover:bg-primary/90 font-bold" onClick={handleComplete} disabled={busy}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Complete Booking
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90">
                <MessageCircle className="h-4 w-4 mr-1.5" /> {t("sendWhatsApp")}
                <ChevronDown className="h-3.5 w-3.5 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => sendWhatsappConfirmation(booking)}>
                {t("whatsappConfirmation")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => sendWhatsappBalance(booking)}>
                {t("whatsappBalance")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => sendWhatsappStatus(booking)}>
                {t("whatsappStatus")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-5 space-y-5 text-sm">
          <div className="bg-muted/40 p-5 rounded-2xl border border-primary/5 space-y-5">
            <section>
              <div className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-2">{t("customer")}</div>
              <div className="font-display text-xl font-bold">{booking.customer_name}</div>
              <div className="text-muted-foreground font-medium">{booking.phone}</div>
              <div className="text-muted-foreground mt-2 text-xs leading-relaxed whitespace-pre-line bg-white/50 p-3 rounded-xl border border-white/80">{booking.address || "No address provided."}</div>
            </section>

            <Separator className="bg-primary/5" />

            <section className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-1">{t("eventDates")}</div>
                <div className="font-bold text-sm">{fmtDate(booking.start_date)}</div>
                <div className="text-[10px] opacity-60">To {fmtDate(booking.expected_return_date || booking.return_date)}</div>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-1">{t("pricingMode")}</div>
                <Badge variant="secondary" className="font-bold uppercase text-[10px]">{booking.pricing_mode || "Takeaway"}</Badge>
              </div>
            </section>
          </div>

          <Separator />

          <section>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Items ({items.length})
            </div>
            <div className="space-y-1">
              {items.map((it: any, i: number) => (
                <div key={i} className="flex justify-between border-b py-1">
                  <span>{it.name} × {it.quantity}</span>
                  <span className="font-medium">{fmtINR((it.price || 0) * (it.quantity || 0))}</span>
                </div>
              ))}
              {items.length === 0 && <div className="text-muted-foreground">—</div>}
            </div>
          </section>

          <Separator />

          <section className="space-y-2 bg-primary/5 p-4 rounded-xl border border-primary/10">
            <div className="flex justify-between text-xs font-medium opacity-60"><span>Subtotal</span><span>{fmtINR(booking.pricing?.subtotal || 0)}</span></div>
            {Number(booking.pricing?.deliveryCharge) > 0 && (
              <div className="flex justify-between text-xs font-medium opacity-60"><span>Delivery Charge</span><span>{fmtINR(booking.pricing.deliveryCharge)}</span></div>
            )}
            {Number(booking.pricing?.discount) > 0 && (
              <div className="flex justify-between text-xs font-medium text-destructive"><span>Discount (-)</span><span>{fmtINR(booking.pricing.discount)}</span></div>
            )}
            <Separator className="bg-primary/10 my-1" />
            <div className="flex justify-between font-bold text-base"><span>{t("total")}</span><span className="text-primary">{fmtINR(total)}</span></div>
            <div className="flex justify-between font-bold"><span>{t("paid")}</span><span className="text-success">{fmtINR(paid || (total - balance))}</span></div>
            <div className="flex justify-between font-bold"><span>{t("balance")}</span><span className="text-destructive">{fmtINR(balance)}</span></div>
          </section>

          <section className="space-y-2">
            <div className="flex justify-between items-center pt-1">
              <span className="text-xs uppercase text-muted-foreground">{t("payment")}</span>
              <Badge variant="outline" className={statusTone[booking.payment_status] || ""}>{t(booking.payment_status) || booking.payment_status}</Badge>
            </div>
            {booking.payment_rating && (
              <div className="flex justify-between items-center pt-1">
                <span className="text-xs uppercase text-muted-foreground">{t("paymentRating")}</span>
                <PaymentRatingBadge rating={booking.payment_rating} reason={booking.rating_reason} />
              </div>
            )}
            {booking.rating_reason && (
              <div className="text-xs text-muted-foreground italic">{t("ratingReason")}: {booking.rating_reason}</div>
            )}
          </section>

          {payments.length > 0 && (
            <>
              <Separator />
              <section>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t("payments")}</div>
                {payments.map((p: any, i: number) => (
                  <div key={i} className="flex justify-between border-b py-1">
                    <span>{fmtDate(p.date)} · {p.method || "—"}</span>
                    <span className="font-medium">{fmtINR(p.amount)}</span>
                  </div>
                ))}
              </section>
            </>
          )}

          {booking.notes && (
            <>
              <Separator />
              <section>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t("notes")}</div>
                <div className="whitespace-pre-line text-muted-foreground">{booking.notes}</div>
              </section>
            </>
          )}
        </div>
      </SheetContent>

      <Dialog open={showBillPreview} onOpenChange={setShowBillPreview}>
        <DialogContent className="max-w-[850px] max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
          <BookingBill 
            onClose={() => setShowBillPreview(false)}
            booking={booking} 
          />
        </DialogContent>
      </Dialog>

      <ReturnItemsDialog 
        open={showReturnDialog}
        onClose={() => setShowReturnDialog(false)}
        booking={booking}
      />

      <PaymentConfirmationDialog 
        open={showPaymentCheck}
        balance={Number(booking.remaining_amount || 0)}
        onClose={handleConfirmCompletion}
      />
    </Sheet>
  );
};
