// Currency / date helpers (IST)
export const fmtINR = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n || 0));

export const fmtDate = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(date);
};

export const fmtDateTime = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(date);
};

export const todayISO = () => new Date().toISOString().slice(0, 10);
export const monthStartISO = () => {
  const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10);
};

export const statusTone: Record<string, string> = {
  Confirmed: "bg-accent/20 text-accent-foreground border-accent/40",
  Delivered: "bg-success/15 text-success border-success/30",
  "Pending Items": "bg-warning/20 text-warning-foreground border-warning/40",
  "Return + Paid": "bg-success/20 text-success border-success/40",
  "Return + Pending": "bg-warning/20 text-warning-foreground border-warning/40",
  "Return but Not Paid": "bg-destructive/15 text-destructive border-destructive/30",
  "Return but Half Paid": "bg-warning/20 text-warning-foreground border-warning/40",
  Complete: "bg-success/20 text-success font-black border-success/40 shadow-sm",
  // Payment Statuses
  Paid: "bg-success/15 text-success border-success/30",
  Partial: "bg-warning/20 text-warning-foreground border-warning/40",
  Pending: "bg-destructive/15 text-destructive border-destructive/30",
};
