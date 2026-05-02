import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { fmtINR } from "@/lib/format";

interface PaymentConfirmationDialogProps {
  open: boolean;
  onClose: (confirmed: boolean) => void;
  balance: number;
}

export const PaymentConfirmationDialog: React.FC<PaymentConfirmationDialogProps> = ({ open, onClose, balance }) => {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md border-2 border-warning/20 shadow-2xl animate-in zoom-in-95">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-warning font-black tracking-tight text-xl">
            <AlertTriangle className="h-6 w-6" />
            ⚠️ Pending Balance Exists
          </DialogTitle>
        </DialogHeader>

        <div className="py-6 space-y-4">
          <p className="text-muted-foreground font-medium text-center px-4">
            This customer has a pending balance of <span className="text-foreground font-black text-lg">{fmtINR(balance)}</span>. 
            <br />
            Has the customer paid in full?
          </p>
        </div>

        <DialogFooter className="grid grid-cols-2 gap-3 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={() => onClose(false)}
            className="h-12 border-destructive/20 text-destructive hover:bg-destructive/10 font-bold"
          >
            <XCircle className="h-4 w-4 mr-2" />
            NO, Cancel
          </Button>
          <Button 
            onClick={() => onClose(true)}
            className="h-12 bg-success hover:bg-success/90 text-white font-black shadow-lg shadow-success/20"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            YES, Mark as Paid
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
