import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { BookingList } from "@/components/bookings/BookingList";
import { CreateBookingDialog } from "@/components/bookings/CreateBookingDialog";
import { BookingDetailDrawer } from "@/components/BookingDetailDrawer";
import { BookingBill } from "@/components/BookingBill";
import { Dialog, DialogContent } from "@/components/ui/dialog";

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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [openCreate, setOpenCreate] = useState<any>(false);
  const [detail, setDetail] = useState<any | null>(null);
  const [billBooking, setBillBooking] = useState<any | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("bookingModule")}
        subtitle={t("bookingSubtitle")}
        actions={
          <Button 
            onClick={() => setOpenCreate(true)} 
            className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="mr-2 h-4 w-4" /> {t("newBooking")}
          </Button>
        }
      />

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder={t("searchBookingPlaceholder")} 
            className="pl-9 h-11 border-primary/10 bg-card/50 backdrop-blur-sm focus:bg-card transition-all" 
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-56 h-11 border-primary/10 bg-card/50 backdrop-blur-sm">
            <SelectValue placeholder={t("allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allStatuses")}</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{t(s) || s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <BookingList 
        search={search} 
        statusFilter={statusFilter} 
        onSelect={setDetail}
        onEdit={setOpenCreate}
        onInvoice={setBillBooking}
      />

      <CreateBookingDialog 
        open={openCreate} 
        onClose={() => setOpenCreate(false)} 
      />

      <BookingDetailDrawer 
        open={!!detail} 
        onOpenChange={(o) => !o && setDetail(null)} 
        booking={detail}
      />

      <Dialog open={!!billBooking} onOpenChange={(o) => !o && setBillBooking(null)}>
        <DialogContent className="max-w-[850px] max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
          {billBooking && (
            <BookingBill 
              onClose={() => setBillBooking(null)}
              booking={billBooking} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Bookings;
