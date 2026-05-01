import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { localDataService } from "@/services/localDataService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tent, ShoppingCart, Plus, Minus, Trash2, AlertTriangle, Search } from "lucide-react";
import { fmtINR } from "@/lib/format";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Mode = "Takeaway" | "Delivery";

const PublicOrder = () => {
  const { sessionId } = useParams();
  const [session, setSession] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [functionTypes, setFunctionTypes] = useState<any[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [mode, setMode] = useState<Mode>("Delivery");

  // Form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [functionTypeId, setFunctionTypeId] = useState<string | undefined>();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [eventTime, setEventTime] = useState("");

  const [submitted, setSubmitted] = useState<{ booking_id: string; reference_id: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Status lookup
  const [lookupId, setLookupId] = useState("");
  const [lookupResult, setLookupResult] = useState<any | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [sessions, inventory, cats, vends, fTypes] = await Promise.all([
          localDataService.getAll("order_sessions"),
          localDataService.getAll("inventory_items"),
          localDataService.getAll("categories"),
          localDataService.getAll("vendors"),
          localDataService.getAll("function_types")
        ]);

        const s = sessions.find((x: any) => x.session_id === sessionId);
        setSession(s);
        setItems(inventory);
        setCategories(cats);
        setVendors(vends);
        setFunctionTypes(fTypes);
      } catch (error) {
        console.error("Error loading public order data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [sessionId]);

  const priceOf = (it: any) => {
    if (mode === "Delivery") return Number(it.price_delivery ?? it.price ?? 0);
    return Number(it.price_takeaway ?? it.price ?? 0);
  };

  const isLow = (it: any) => Number(it.available_quantity || 0) <= Number(it.low_stock_threshold || 0);

  const cartItems = useMemo(() =>
    Object.entries(cart).map(([id, q]) => {
      const it = items.find((x) => x.id === id);
      return it ? {
        id, name: it.name, price: priceOf(it), quantity: q,
        max: it.available_quantity, low: isLow(it),
      } : null;
    }).filter(Boolean) as any[],
    [cart, items, mode]
  );

  const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const hasLow = cartItems.some((i) => i.low);

  const setQty = (id: string, q: number) => {
    const next = Math.max(0, q);
    setCart((c) => { const nx = { ...c }; if (next === 0) delete nx[id]; else nx[id] = next; return nx; });
  };

  const lookupOrder = async () => {
    if (!lookupId.trim()) return;
    const bookings = await localDataService.getAll("bookings");
    const data = bookings.find((b: any) => b.reference_id === lookupId.trim().toUpperCase());
    if (!data) return toast.error("No order found with that Reference ID");
    setLookupResult(data);
  };

  const submit = async () => {
    if (!name || !phone || !address || !startDate || !endDate) return toast.error("Please fill all your details");
    if (cartItems.length === 0) return toast.error("Add at least one item");
    const subtotal = total;
    const referenceId = `REF-${Math.floor(100000 + Math.random() * 900000)}`;

    const booking = await localDataService.insert("bookings", {
      customer_name: name, phone, address,
      start_date: startDate, end_date: endDate,
      event_time: eventTime || null,
      function_type_id: functionTypeId || null,
      delivery_mode: mode,
      reference_id: referenceId,
      borrow_needed: hasLow,
      items: cartItems.map((i) => ({
        item_id: i.id, name: i.name, quantity: i.quantity, price: i.price,
        sentQty: 0, returnedQty: 0, missingQty: 0, low_stock_at_order: i.low,
      })),
      pricing: { subtotal, tax: 0, discount: 0, damageCharges: 0, lateFee: 0, totalAmount: subtotal },
      payments: [], total_paid: 0, remaining_amount: subtotal, payment_status: "Unpaid",
      item_checklist: cartItems.map((i) => ({ itemName: i.name, sent: false, returned: false })),
      status: "Incoming",
    });

    if (sessionId) {
      const sessions = await localDataService.getAll("order_sessions");
      const session = sessions.find((x: any) => x.session_id === sessionId);
      if (session) {
        await localDataService.update("order_sessions", session.id, {
          status: "Submitted", customer_name: name, phone, address, event_date: startDate, items: cartItems,
        });
      }
    }
    setSubmitted({ booking_id: booking?.booking_id || "", reference_id: booking?.reference_id || referenceId });

    const lines = [
      `*New Booking Request* ${booking?.booking_id || ""}`,
      `Reference: ${booking?.reference_id || referenceId}`,
      `Name: ${name}`, `Phone: ${phone}`, `Date: ${startDate}${endDate !== startDate ? ` → ${endDate}` : ""}`,
      `Time: ${eventTime || "—"}`, `Mode: ${mode}`, `Address: ${address}`, "",
      "Items:", ...cartItems.map((i) => `• ${i.name} × ${i.quantity} — ${fmtINR(i.price * i.quantity)}`),
      "", `Total: ${fmtINR(total)}`,
      hasLow ? "⚠ Some items are low in stock — vendor borrow may be needed." : "",
    ].filter(Boolean);
    const text = encodeURIComponent(lines.join("\n"));
    setTimeout(() => { window.open(`https://wa.me/?text=${text}`, "_blank"); }, 600);
  };

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  if (!session) return <div className="min-h-screen grid place-items-center text-muted-foreground">Invalid or expired link.</div>;

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-soft grid place-items-center p-6">
        <div className="max-w-md text-center bg-card rounded-2xl border shadow-elegant p-10">
          <div className="h-16 w-16 mx-auto rounded-full bg-success/15 grid place-items-center mb-4">
            <Tent className="h-8 w-8 text-success" />
          </div>
          <h1 className="font-display text-3xl">Thank you!</h1>
          <p className="text-muted-foreground mt-2">Your order has been received. We'll confirm shortly.</p>
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Reference ID</div>
            <div className="font-mono font-display text-2xl mt-1">{submitted.reference_id}</div>
            <p className="text-xs text-muted-foreground mt-2">Save this ID to check your order status later.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="bg-gradient-hero text-primary-foreground py-10 px-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-accent/30 blur-3xl" />
        <div className="max-w-5xl mx-auto relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-gradient-marigold grid place-items-center"><Tent className="h-5 w-5 text-primary" /></div>
            <div className="font-display text-xl">Shamiyana Studio</div>
          </div>
          <h1 className="font-display text-4xl md:text-5xl max-w-2xl">Welcome! Start your order now.</h1>
          <p className="mt-3 text-primary-foreground/80 max-w-xl">Browse our catalogue, build your order, and we'll take care of the rest.</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 -mt-6">
        <Tabs defaultValue="order" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="order">New order</TabsTrigger>
            <TabsTrigger value="status">Check status</TabsTrigger>
          </TabsList>

          <TabsContent value="order">
            {/* Mode selector */}
            <div className="rounded-xl border bg-card p-5 shadow-card mb-6">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Order type</Label>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as Mode)} className="grid grid-cols-2 gap-3 mt-2">
                <label className={`border rounded-lg p-4 cursor-pointer ${mode === "Delivery" ? "border-accent bg-accent/10" : ""}`}>
                  <RadioGroupItem value="Delivery" className="sr-only" />
                  <div className="font-medium">Delivery</div>
                  <div className="text-xs text-muted-foreground">We deliver and set up at your venue.</div>
                </label>
                <label className={`border rounded-lg p-4 cursor-pointer ${mode === "Takeaway" ? "border-accent bg-accent/10" : ""}`}>
                  <RadioGroupItem value="Takeaway" className="sr-only" />
                  <div className="font-medium">Takeaway</div>
                  <div className="text-xs text-muted-foreground">Pick up from our store.</div>
                </label>
              </RadioGroup>
            </div>

            {/* Catalogue */}
            {categories.filter((c) => !c.parent_id).map((c) => {
              const subs = categories.filter((s) => s.parent_id === c.id);
              const parentItems = items.filter((i) => i.category_id === c.id);
              const groupItems = parentItems.length > 0 ? parentItems : items.filter((i) => subs.some((s) => s.id === i.category_id));
              if (groupItems.length === 0 && subs.length === 0) return null;
              return (
                <section key={c.id} className="mb-8 animate-fade-in">
                  <h2 className="font-display text-2xl mb-3">{c.name}</h2>
                  {subs.length > 0 ? (
                    subs.map((s) => {
                      const list = items.filter((i) => i.category_id === s.id);
                      if (list.length === 0) return null;
                      return (
                        <div key={s.id} className="mb-4">
                          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">{s.name}</h3>
                          <ItemGrid list={list} cart={cart} setQty={setQty} priceOf={priceOf} isLow={isLow} vendors={vendors} />
                        </div>
                      );
                    })
                  ) : (
                    <ItemGrid list={parentItems} cart={cart} setQty={setQty} priceOf={priceOf} isLow={isLow} vendors={vendors} />
                  )}
                </section>
              );
            })}

            {/* Non-category items */}
            {items.some((i) => !i.category_id) && (
              <section className="mb-8 animate-fade-in">
                <h2 className="font-display text-2xl mb-3">Other items</h2>
                <ItemGrid list={items.filter((i) => !i.category_id)} cart={cart} setQty={setQty} priceOf={priceOf} isLow={isLow} vendors={vendors} />
              </section>
            )}

            {/* Cart + form */}
            <div className="rounded-xl border bg-card shadow-card p-6 mt-8">
              <h3 className="font-display text-2xl mb-4 flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> Your order</h3>
              {cartItems.length === 0 ? (
                <div className="text-muted-foreground text-sm">No items selected yet.</div>
              ) : (
                <div className="space-y-2 mb-4">
                  {cartItems.map((i) => (
                    <div key={i.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span>{i.name} <span className="text-muted-foreground">× {i.quantity}</span></span>
                        {i.low && <AlertTriangle className="h-3.5 w-3.5 text-warning" />}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{fmtINR(i.price * i.quantity)}</span>
                        <button onClick={() => setQty(i.id, 0)} aria-label="Remove">
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-3 flex justify-between font-display text-xl">
                    <span>Total ({mode})</span><span>{fmtINR(total)}</span>
                  </div>
                  {hasLow && (
                    <div className="mt-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                      <div>
                        Some selected items are low in stock. We'll arrange them through a partner vendor — your order can still be placed.
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-3 mt-4">
                <div><Label>Your name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div><Label>Phone (WhatsApp)</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                <div className="md:col-span-2"><Label>Event address</Label><Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} /></div>
                <div>
                  <Label>Function type</Label>
                  <Select value={functionTypeId} onValueChange={setFunctionTypeId}>
                    <SelectTrigger><SelectValue placeholder="Select function" /></SelectTrigger>
                    <SelectContent>{functionTypes.map((f) => <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Time</Label><Input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} /></div>
                <div><Label>Start date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                <div><Label>End date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
              </div>

              <Button onClick={submit} className="w-full mt-5 bg-primary hover:bg-primary/90" size="lg">
                Submit order & open WhatsApp
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="status">
            <div className="rounded-xl border bg-card shadow-card p-6">
              <h3 className="font-display text-2xl mb-2">Already booked?</h3>
              <p className="text-muted-foreground text-sm mb-4">Enter your Reference ID to check your order status.</p>
              <div className="flex gap-2">
                <Input value={lookupId} onChange={(e) => setLookupId(e.target.value)} placeholder="REF-123456" className="font-mono uppercase" />
                <Button onClick={lookupOrder}><Search className="mr-2 h-4 w-4" /> Check</Button>
              </div>
              {lookupResult && (
                <div className="mt-5 border rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Order</span><span className="font-mono">{lookupResult.booking_id}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span>{lookupResult.customer_name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Event date</span><span>{lookupResult.start_date}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-medium">{lookupResult.status}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span>{lookupResult.payment_status}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-medium">{fmtINR(lookupResult.pricing?.totalAmount || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Balance</span><span className="text-destructive">{fmtINR(lookupResult.remaining_amount || 0)}</span></div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

const ItemGrid = ({ list, cart, setQty, priceOf, isLow, vendors }: any) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    {list.map((it: any) => {
      const low = isLow(it);
      return (
        <div key={it.id} className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-medium truncate">{it.name}</div>
              {it.name_kn && <div className="text-xs text-muted-foreground">{it.name_kn}</div>}
              <div className="text-sm mt-1">
                <span className="font-medium">{fmtINR(priceOf(it))}</span>
                <span className="text-muted-foreground"> · {it.available_quantity} avail.</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQty(it.id, (cart[it.id] || 0) - 1)}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-7 text-center font-medium">{cart[it.id] || 0}</span>
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQty(it.id, (cart[it.id] || 0) + 1)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
          {low && (
            <div className="mt-2 text-xs flex items-start gap-1.5 text-warning">
              <AlertTriangle className="h-3 w-3 mt-0.5" />
              <span>
                Low in stock.{vendors.length > 0 && ` We'll borrow from: ${vendors.slice(0, 2).map((v: any) => v.name).join(", ")}${vendors.length > 2 ? "…" : ""}`}
              </span>
            </div>
          )}
        </div>
      );
    })}
  </div>
);

export default PublicOrder;
