import { useQuery } from "@tanstack/react-query";
import { Layout } from "../components/Layout";
import { Package2, Truck, MapPin, CheckCircle2, ExternalLink, Search, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const CARRIERS: Record<string, { color: string; trackUrl: (n: string) => string }> = {
  FedEx: { color: "#4D148C", trackUrl: (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}` },
  UPS: { color: "#351C15", trackUrl: (n) => `https://www.ups.com/track?tracknum=${n}` },
  USPS: { color: "#004B87", trackUrl: (n) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}` },
  DHL: { color: "#D40511", trackUrl: (n) => `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${n}` },
};

const STEPS = [
  { key: "ordered", label: "Ordered", icon: Package2 },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "out_for_delivery", label: "Out for Delivery", icon: MapPin },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
] as const;

function TrackingBar({ status }: { status: string }) {
  const activeIdx = STEPS.findIndex((s) => s.key === status);
  return (
    <div className="flex items-center w-full">
      {STEPS.map((step, idx) => {
        const done = idx <= activeIdx;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              <step.icon className="w-4 h-4" />
            </div>
            {idx < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${idx < activeIdx ? "bg-primary" : "bg-muted"}`} />}
          </div>
        );
      })}
    </div>
  );
}

export default function OrderTracking() {
  const [search, setSearch] = useState("");
  const { data: items = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/items"],
    queryFn: async () => (await fetch("/api/items", { credentials: "include" })).json(),
  });

  const tracked = items.filter((i: any) => i.trackingNumber);
  const filtered = tracked.filter((i: any) =>
    !search || [i.name, i.trackingNumber, i.carrier, i.vendor].some((v) => v?.toLowerCase().includes(search.toLowerCase()))
  );

  const counts = {
    total: tracked.length,
    ordered: tracked.filter((i: any) => i.trackingStatus === "ordered").length,
    inTransit: tracked.filter((i: any) => ["shipped", "out_for_delivery"].includes(i.trackingStatus)).length,
    delivered: tracked.filter((i: any) => i.trackingStatus === "delivered").length,
  };

  return (
    <Layout>
      <div>
        <h1 className="text-3xl font-display font-bold text-primary">Order Tracking</h1>
        <p className="text-muted-foreground mt-1">Track all your orders in one place</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[["Total", counts.total], ["Ordered", counts.ordered], ["In Transit", counts.inTransit], ["Delivered", counts.delivered]].map(([label, val]) => (
          <div key={label} className="bg-white border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold">{val}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders..."
          className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
          {tracked.length === 0
            ? "No items with tracking numbers. Add tracking info to inventory items to see them here."
            : "No orders match your search."}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((item: any) => {
            const carrier = CARRIERS[item.carrier];
            const trackUrl = carrier ? carrier.trackUrl(item.trackingNumber) : null;
            return (
              <div key={item.id} className="bg-white border border-border rounded-xl p-5">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-secondary shrink-0 overflow-hidden flex items-center justify-center">
                    {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" /> : <Package2 className="w-5 h-5 text-muted-foreground/40" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.vendor}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {item.carrier && (
                        <span className="px-2 py-0.5 rounded text-white text-xs font-bold" style={{ backgroundColor: carrier?.color || "#666" }}>
                          {item.carrier}
                        </span>
                      )}
                      {trackUrl ? (
                        <a href={trackUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs font-mono text-primary hover:underline flex items-center gap-1">
                          {item.trackingNumber} <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-xs font-mono text-muted-foreground">{item.trackingNumber}</span>
                      )}
                    </div>
                  </div>
                </div>
                <TrackingBar status={item.trackingStatus || "ordered"} />
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-muted-foreground capitalize">{(item.trackingStatus || "ordered").replace(/_/g, " ")}</p>
                  <Link href={`/inventory`} className="text-xs text-primary hover:underline">Edit item</Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
