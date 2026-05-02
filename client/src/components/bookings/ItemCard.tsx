import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Package } from "lucide-react";
import { fmtINR } from "@/lib/format";

interface ItemCardProps {
  item: any;
  mode: "Takeaway" | "Delivery";
  onAdd: () => void;
  t: (k: string) => string;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, mode, onAdd, t }) => {
  const price = mode === "Takeaway" ? (item.price_takeaway ?? item.price ?? 0) : (item.price_delivery ?? item.price ?? 0);
  const isOutOfStock = Number(item.available_quantity) <= 0;

  return (
    <div 
      className={`p-3 rounded-xl border-2 transition-all group flex items-center gap-3 relative overflow-hidden ${
        isOutOfStock 
          ? "border-warning/20 bg-warning/5 opacity-80" 
          : "border-primary/5 hover:border-primary/20 bg-card hover:shadow-md cursor-pointer active:scale-95"
      }`}
      onClick={!isOutOfStock ? onAdd : undefined}
    >
      <div className={`h-12 w-12 rounded-lg flex items-center justify-center shrink-0 ${isOutOfStock ? "bg-warning/20 text-warning" : "bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors"}`}>
        <Package className="h-6 w-6" />
      </div>
      
      <div className="min-w-0 flex-1">
        <div className="font-bold text-xs truncate leading-tight mb-0.5">{item.name}</div>
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-black text-primary">{fmtINR(price)}</div>
          <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isOutOfStock ? "bg-warning text-warning-foreground" : "bg-muted text-muted-foreground"}`}>
            {isOutOfStock ? t("outOfStock") : `${item.available_quantity} ${t("left")}`}
          </div>
        </div>
      </div>

      {!isOutOfStock && (
        <div className="absolute right-0 top-0 h-full w-8 bg-primary/0 group-hover:bg-primary/10 flex items-center justify-center transition-all">
          <Plus className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all" />
        </div>
      )}
    </div>
  );
};
