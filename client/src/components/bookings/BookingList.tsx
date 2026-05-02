import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { localDataService } from '@/services/localDataService';
import { DataTable } from '@/components/shared/DataTable';
import { StateView } from '@/components/shared/StateView';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, StickyNote, Trash2, FileText } from 'lucide-react';
import { fmtINR, fmtDate, statusTone } from '@/lib/format';
import { useI18n } from '@/context/I18nContext';
import { toast } from 'react-hot-toast';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface BookingListProps {
  search: string;
  statusFilter: string;
  onSelect: (booking: any) => void;
  onEdit: (booking: any) => void;
  onInvoice: (booking: any) => void;
}

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaymentConfirmationDialog } from "./PaymentConfirmationDialog";

export const BookingList: React.FC<BookingListProps> = ({ search, statusFilter, onSelect, onEdit, onInvoice }) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [completionTarget, setCompletionTarget] = React.useState<any | null>(null);

  const { data: bookings = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => localDataService.getAll('bookings'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (booking: any) => {
      // Restore stock
      const invItems = await localDataService.getAll("inventory_items");
      await Promise.all(booking.items.map(async (item: any) => {
        const inv = invItems.find((i: any) => i.id === item.item_id);
        if (inv) {
          await localDataService.update("inventory_items", inv.id, {
            available_quantity: Number(inv.available_quantity) + item.quantity
          });
        }
      }));
      return localDataService.delete("bookings", booking.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
      toast.success("Booking deleted and stock restored");
    },
    onError: () => {
      toast.error("Failed to delete booking");
    }
  });

  const handleStatusUpdate = async (booking: any, type: 'status' | 'payment_status', value: string) => {
    const updated = { ...booking, [type]: value };
    const allItemsReturned = (booking.item_checklist || []).every((i: any) => (i.returnedQty || 0) === (i.bookedQty || 0));
    const someItemsReturned = (booking.item_checklist || []).some((i: any) => (i.returnedQty || 0) > 0);
    const isCurrentlyPaid = booking.payment_status === "Paid";

    // 10.3 LOCK 3: Force Pending Items if items_returned = PARTIAL or NONE
    if (type === 'status' && value.startsWith("Return") && !allItemsReturned) {
      toast.error("Cannot set Return status. Some items are still pending return. Status forced to Pending Items.");
      updated.status = "Pending Items";
      value = "Pending Items";
    }

    if (type === 'status') {
      // 8.1: Transition Rules
      if (booking.status === "Complete") {
        toast.error("Booking is complete and locked.");
        return;
      }

      if (booking.status === "Return + Paid" && value !== "Complete") {
        toast.error("Only Complete transition allowed from Return + Paid.");
        return;
      }

      // 5.2: GATE 1 Validation
      if (value === 'Complete') {
        if (!allItemsReturned) {
          toast.error("Booking cannot be completed. One or more items are still pending return.");
          return;
        }

        // 5.3 & 5.4: GATE 2 Validation
        const currentBalance = Number(booking.remaining_amount || 0);
        if (currentBalance > 0 && booking.payment_status !== 'Paid') {
          setCompletionTarget(booking);
          return; 
        }
        
        updated.payment_status = "Paid";
        updated.remaining_amount = 0;
        updated.total_paid = booking.pricing?.totalAmount || booking.total_paid;
      }

      // Lock Rule & Other Statuses...
      const lockPaid = isCurrentlyPaid && !["Complete"].includes(value);
      if (value === "Return + Paid") {
        if (!allItemsReturned) {
          toast.error("Cannot set Return + Paid. Items are still pending return.");
          return;
        }
        updated.payment_status = "Paid";
        updated.remaining_amount = 0;
        updated.total_paid = booking.pricing?.totalAmount || booking.total_paid;
      } else if (value === "Return but Not Paid") {
        if (!allItemsReturned) {
          toast.error("Cannot set Return status. Items are still pending return.");
          return;
        }
        if (!lockPaid) updated.payment_status = "Pending";
      } else if (value === "Return but Half Paid") {
        if (!allItemsReturned) {
          toast.error("Cannot set Return status. Items are still pending return.");
          return;
        }
        if (!lockPaid) updated.payment_status = "Partial";
      } else if (value === "Return + Pending") {
        if (!allItemsReturned) {
          toast.error("Cannot set Return status. Items are still pending return.");
          return;
        }
        if (!lockPaid) updated.payment_status = "Partial";
      }
    }

    if (type === 'payment_status') {
      // 8.2 & 8.3: Payment Transition Rules
      if (booking.payment_status === "Paid" && value === "Pending") {
        toast.error("This payment status change is not allowed (Paid to Pending).");
        return;
      }
      if (booking.payment_status === "Partial" && value === "Pending") {
        toast.error("This payment status change is not allowed (Partial to Pending).");
        return;
      }

      if (value === 'Paid') {
        updated.remaining_amount = 0;
        updated.total_paid = booking.pricing?.totalAmount || booking.total_paid;
      }
    }

    try {
      await localDataService.update("bookings", booking.id, updated);
      toast.success("Status updated manually!");
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleConfirmCompletion = async (confirmed: boolean) => {
    if (!completionTarget) return;
    if (confirmed) {
      const updated = {
        ...completionTarget,
        status: "Complete",
        payment_status: "Paid",
        remaining_amount: 0,
        total_paid: completionTarget.pricing?.totalAmount || completionTarget.total_paid
      };
      try {
        await localDataService.update("bookings", completionTarget.id, updated);
        toast.success("Booking completed successfully!");
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
      } catch (err) {
        toast.error("Failed to complete booking");
      }
    }
    setCompletionTarget(null);
  };

  const filtered = bookings.filter((b: any) => {
    const okSearch = !search || 
      b.customer_name?.toLowerCase().includes(search.toLowerCase()) || 
      b.phone?.includes(search) || 
      b.booking_id?.toLowerCase().includes(search.toLowerCase());
    const okStatus = statusFilter === "all" || b.status === statusFilter;
    return okSearch && okStatus;
  });

  const columns: any[] = [
    {
      header: "ID",
      accessor: (b: any) => <span className="font-mono text-xs font-bold text-primary">{b.booking_id}</span>,
    },
    {
      header: t("customerDetails"),
      accessor: (b: any) => (
        <div>
          <div className="font-bold text-foreground">{b.customer_name}</div>
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">{b.phone}</div>
        </div>
      ),
    },
    {
      header: t("bookingDate"),
      accessor: (b: any) => <span className="text-muted-foreground font-medium">{fmtDate(b.booking_date)}</span>,
    },
    {
      header: t("status"),
      accessor: (b: any) => (
        <Badge variant="outline" className={`font-bold text-[10px] uppercase ${statusTone[b.status] || "bg-muted"}`}>
          {t(b.status) || b.status}
        </Badge>
      ),
    },
    {
      header: t("totalAmount"),
      align: 'right',
      accessor: (b: any) => <span className="font-display font-bold text-foreground">{fmtINR(b.pricing?.totalAmount || 0)}</span>,
    },
    {
      header: t("remaining"),
      align: 'right',
      accessor: (b: any) => (
        <div className="flex items-center justify-end gap-3">
          <span className={Number(b.remaining_amount) > 0 ? "text-destructive font-bold mr-4" : "text-success font-bold mr-4"}>
            {fmtINR(b.remaining_amount || 0)}
          </span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-primary hover:bg-primary/10"
              onClick={(e) => { e.stopPropagation(); onEdit(b); }}
            >
              <StickyNote className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
              onClick={(e) => { e.stopPropagation(); setDeleteId(b.id); }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground ml-2" />
        </div>
      ),
    }
  ];

  return (
    <>
      <StateView
        isLoading={isLoading}
        isError={isError}
        isEmpty={filtered.length === 0}
        emptyTitle={t("noBookingsMatch")}
        onRetry={refetch}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((b: any) => (
            <div 
              key={b.id} 
              onClick={() => onSelect(b)}
              className="group relative bg-card hover:bg-card/80 border border-primary/5 hover:border-primary/30 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer overflow-hidden"
            >
              {/* Status Glow Overlay */}
              <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full blur-3xl opacity-10 transition-opacity group-hover:opacity-20 ${statusTone[b.status] || "bg-primary"}`} />

              <div className="relative space-y-5">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] font-black uppercase tracking-widest text-primary/60">{b.booking_id}</span>
                    <h3 className="font-display font-bold text-lg leading-none">{b.customer_name}</h3>
                    <div className="text-xs text-muted-foreground font-medium">{b.phone}</div>
                  </div>
                  <div className="flex flex-col gap-1.5 items-end">
                    <Select 
                      value={b.status} 
                      onValueChange={(val) => handleStatusUpdate(b, 'status', val)}
                      disabled={b.status === "Complete"}
                    >
                      <SelectTrigger className={`h-7 px-3 text-[10px] font-black uppercase border-2 min-w-[110px] ${statusTone[b.status] || "bg-muted"}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Confirmed", "Delivered", "Return + Paid", "Return + Pending", "Return but Not Paid", "Return but Half Paid", "Pending Items", "Complete"].map(s => (
                          <SelectItem key={s} value={s} className="text-[10px] font-bold uppercase">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select 
                      value={b.payment_status} 
                      onValueChange={(val) => handleStatusUpdate(b, 'payment_status', val)}
                      disabled={b.status === "Complete"}
                    >
                      <SelectTrigger className={`h-7 px-3 text-[10px] font-black uppercase border-2 min-w-[110px] ${statusTone[b.payment_status] || "bg-muted"}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Paid", "Partial", "Pending"].map(s => (
                          <SelectItem key={s} value={s} className="text-[10px] font-bold uppercase">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-3 border-y border-primary/5">
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground opacity-60">{t("bookingDate")}</div>
                    <div className="text-sm font-semibold">{fmtDate(b.booking_date)}</div>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground opacity-60">{t("items") || "Items"}</div>
                    <div className="text-sm font-semibold">{b.items?.length || 0} Records</div>
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground opacity-60">{t("remainingBalance") || "Remaining Balance"}</div>
                    <div className={`text-xl font-display font-black ${Number(b.remaining_amount) > 0 ? "text-destructive" : "text-success"}`}>
                      {fmtINR(b.payment_status === "Paid" ? 0 : (b.remaining_amount || 0))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground opacity-60">{t("totalAmount")}</div>
                    <div className="text-lg font-display font-bold opacity-80">{fmtINR(b.pricing?.totalAmount || 0)}</div>
                  </div>
                </div>

                <div className="pt-2 flex justify-between items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                  <div className="flex gap-2">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="h-9 px-4 font-bold bg-white text-primary border border-primary/20 hover:bg-muted"
                      onClick={(e) => { e.stopPropagation(); onInvoice(b); }}
                    >
                      <FileText className="h-4 w-4 mr-2" /> Invoice
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="h-9 px-4 font-bold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                      onClick={(e) => { e.stopPropagation(); onEdit(b); }}
                      disabled={b.status === "Complete"}
                    >
                      <StickyNote className="h-4 w-4 mr-2" /> {t("edit") || "Edit"}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(b.id); }}
                      disabled={b.status === "Complete"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-primary font-bold text-xs flex items-center gap-1">
                    Details <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </StateView>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete Booking?"
        description="This will delete the booking and restore items back to inventory. This action cannot be undone."
        variant="destructive"
        confirmLabel="Delete Booking"
        onConfirm={() => {
          const booking = bookings.find((b: any) => b.id === deleteId);
          if (booking) deleteMutation.mutate(booking);
        }}
      />

      <PaymentConfirmationDialog 
        open={!!completionTarget}
        balance={completionTarget?.remaining_amount || 0}
        onClose={handleConfirmCompletion}
      />
    </>
  );
};
