import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertTriangle, User, RefreshCcw, CheckCircle2 } from "lucide-react";
import { localDataService } from "@/services/localDataService";
import { useI18n } from "@/context/I18nContext";
import { toast } from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

interface ReturnItemsDialogProps {
  open: boolean;
  onClose: () => void;
  booking: any;
}

export const ReturnItemsDialog: React.FC<ReturnItemsDialogProps> = ({ open, onClose, booking }) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [checklist, setChecklist] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && booking) {
      setChecklist(booking.item_checklist || []);
      localDataService.getAll("vendors").then(setVendors);
    }
  }, [open, booking]);

  const updateQty = (idx: number, val: number) => {
    const next = [...checklist];
    const item = next[idx];
    const max = item.bookedQty || 0;
    const finalVal = Math.min(max, Math.max(0, val));
    next[idx].returnedQty = finalVal;
    next[idx].returned = finalVal === max;
    setChecklist(next);
  };

  const borrowedItems = booking?.vendor_borrows || [];
  const hasBorrows = borrowedItems.length > 0;

  const handleSave = async () => {
    setBusy(true);
    try {
      const allReturned = checklist.every(i => (i.returnedQty || 0) === (i.bookedQty || 1));
      const someReturned = checklist.some(i => (i.returnedQty || 0) > 0);
      
      let newStatus = booking.status;

      if (!someReturned) {
        // items_returned = NONE
        newStatus = "Pending Items";
      } else if (!allReturned) {
        // items_returned = PARTIAL
        newStatus = "Pending Items";
      } else {
        // items_returned = ALL
        if (booking.payment_status === "Paid") {
          newStatus = "Return + Paid";
        } else if (booking.payment_status === "Pending") {
          if (booking.payment_option === "Pay Later") {
            newStatus = "Return but Not Paid";
          } else if (booking.payment_option === "Half Now") {
            newStatus = "Return + Pending";
          } else {
            newStatus = "Return but Not Paid";
          }
        } else if (booking.payment_status === "Partial") {
          newStatus = "Return but Half Paid";
        }
      }
      
      const updatedBooking = {
        ...booking,
        item_checklist: checklist,
        status: newStatus
      };

      await localDataService.update("bookings", booking.id, updatedBooking);
      
      // Update inventory for returned items
      const invItems = await localDataService.getAll("inventory_items");
      await Promise.all(checklist.map(async (ci, idx) => {
        const oldReturnedQty = booking.item_checklist[idx]?.returnedQty || 0;
        const newReturnedQty = ci.returnedQty || 0;
        const diff = newReturnedQty - oldReturnedQty;

        if (diff !== 0) {
          const inv = invItems.find((i: any) => i.id === ci.item_id);
          if (inv) {
            await localDataService.update("inventory_items", inv.id, {
              available_quantity: Number(inv.available_quantity) + diff
            });
          }
        }
      }));

      toast.success("Return status updated!");
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update returns");
    } finally {
      setBusy(false);
    }
  };

  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCcw className="h-5 w-5 text-primary" />
            Mark Item Returns
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* VENDOR BORROW ALERT */}
          {hasBorrows && (
            <div className="p-4 rounded-xl bg-warning/10 border border-warning/20 space-y-3">
              <div className="flex items-center gap-2 text-warning font-bold text-sm">
                <AlertTriangle className="h-5 w-5" />
                VENDORS BORROW ALERT
              </div>
              <div className="space-y-2">
                {borrowedItems.map((b: any, i: number) => {
                  const vendor = vendors.find(v => v.id === b.vendor_id);
                  const item = booking.items.find((it: any) => it.item_id === b.item_id);
                  return (
                    <div key={i} className="flex items-center justify-between bg-white/50 p-2 rounded text-xs">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 opacity-60" />
                        <span className="font-bold">{vendor?.name || "Unknown Vendor"}</span>
                      </div>
                      <div className="font-medium text-muted-foreground">
                        Return {b.quantity} {item?.name}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                * Please go to the Vendor Module to mark these as returned and settle payment.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Item Checklist</Label>
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {checklist.map((item, idx) => (
                <div key={idx} className="p-4 rounded-2xl border bg-card/50 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold text-sm leading-tight">{item.itemName}</Label>
                    <div className="text-[10px] font-black uppercase text-primary/40">
                      Booked: {item.bookedQty || 0}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 bg-white/80 p-2 rounded-xl border border-primary/5">
                    <div className="flex-1 text-[10px] font-bold text-muted-foreground uppercase">
                      Returned Quantity:
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 rounded-full"
                        onClick={() => updateQty(idx, (item.returnedQty || 0) - 1)}
                      >
                        -
                      </Button>
                      <Input 
                        type="number" 
                        className="w-16 h-8 text-center font-bold text-sm border-primary/10" 
                        value={item.returnedQty || 0}
                        onChange={(e) => updateQty(idx, parseInt(e.target.value) || 0)}
                      />
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 rounded-full"
                        onClick={() => updateQty(idx, (item.returnedQty || 0) + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                  
                  {(item.returnedQty || 0) === (item.bookedQty || 0) ? (
                    <div className="text-[10px] font-black text-success uppercase flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Fully Returned
                    </div>
                  ) : (
                    <div className="text-[10px] font-black text-warning uppercase flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Pending: {(item.bookedQty || 0) - (item.returnedQty || 0)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={handleSave} disabled={busy} className="bg-primary hover:bg-primary/90 px-8 font-bold shadow-lg shadow-primary/20">
            {busy ? "Saving..." : "Update Returns"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
