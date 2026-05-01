import { useEffect, useState } from "react";
import { localDataService } from "@/services/localDataService";
import { useI18n } from "@/context/I18nContext";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link2, Copy, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { fmtDate } from "@/lib/format";

const OrderLink = () => {
  const { t } = useI18n();
  const [sessions, setSessions] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await localDataService.getAll("order_sessions");
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    setBusy(true);
    const data = await localDataService.insert("order_sessions", { session_id: Math.random().toString(36).substring(2, 15), status: 'active' });
    setBusy(false);
    toast.success("Order link created");
    load();
    const url = `${window.location.origin}/order/${data.session_id}`;
    navigator.clipboard.writeText(url);
    setCopied(data.session_id);
  };

  const copy = (sid: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/order/${sid}`);
    setCopied(sid);
    setTimeout(() => setCopied(null), 1500);
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Link2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-muted-foreground animate-pulse">{t("loading")}</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={t("orderLink")}
        subtitle="Generate a public link your customers can use to browse items and submit a booking."
        actions={<Button onClick={create} disabled={busy} className="bg-primary hover:bg-primary/90"><Plus className="mr-2 h-4 w-4" /> {t("add")}</Button>}
      />

      <Card className="p-6 mb-6 bg-gradient-soft border-accent/30">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-gradient-marigold grid place-items-center"><Link2 className="h-6 w-6 text-primary" /></div>
          <div>
            <div className="font-display text-xl">How it works</div>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Click <em>Generate link</em>. Share the URL via WhatsApp. Customers pick items, fill their details, and submit. The order arrives in your <strong>Bookings</strong> as <em>Incoming</em>, ready to confirm.
            </p>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {sessions.length === 0 && <div className="text-center text-muted-foreground py-10">No links yet. Generate your first one.</div>}
        {sessions.map((s) => {
          const url = `${window.location.origin}/order/${s.session_id}`;
          return (
            <div key={s.id} className="flex items-center gap-3 border rounded-xl bg-card p-4 shadow-card">
              <div className="flex-1 min-w-0">
                <div className="font-mono text-xs text-muted-foreground truncate">{url}</div>
                <div className="text-xs text-muted-foreground mt-1">Created {fmtDate(s.created_at)} · Status: {s.status}</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => copy(s.session_id)}>
                {copied === s.session_id ? <Check className="mr-2 h-3.5 w-3.5" /> : <Copy className="mr-2 h-3.5 w-3.5" />}
                {copied === s.session_id ? t("uploaded") : t("copy") || "Copy"}
              </Button>
              <a href={url} target="_blank" rel="noreferrer"><Button size="sm">Open</Button></a>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default OrderLink;
