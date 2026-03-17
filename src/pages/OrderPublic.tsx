import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Package, Clock, CheckCircle2, Truck, XCircle, Share2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface OrderItem {
  id: string;
  product_name: string;
  product_image: string | null;
  size: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  order_number: string;
  payment_method: string;
  status: string;
  total: number;
  created_at: string;
  notes: string | null;
  items?: OrderItem[];
  customer?: {
    name: string;
    instagram: string;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pendiente:  { label: "Pendiente de confirmación", color: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/20", icon: Clock },
  confirmado: { label: "Confirmado — pago verificado", color: "text-blue-600", bg: "bg-blue-500/10 border-blue-500/20", icon: CheckCircle2 },
  enviado:    { label: "Enviado / En camino", color: "text-violet-600", bg: "bg-violet-500/10 border-violet-500/20", icon: Truck },
  completado: { label: "Completado", color: "text-accent", bg: "bg-accent/10 border-accent/20", icon: CheckCircle2 },
  cancelado:  { label: "Cancelado", color: "text-destructive", bg: "bg-destructive/10 border-destructive/20", icon: XCircle },
};

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  yappy: "Yappy",
  transferencia: "Transferencia bancaria",
};

const OrderPublic = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderNumber) { setNotFound(true); setLoading(false); return; }

      const { data: orderData } = await supabase
        .from("orders")
        .select("*, customers(name, instagram)")
        .eq("order_number", orderNumber)
        .maybeSingle();

      if (!orderData) { setNotFound(true); setLoading(false); return; }

      const { data: itemsData } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderData.id);

      setOrder({
        ...orderData,
        customer: Array.isArray(orderData.customers) ? orderData.customers[0] : orderData.customers,
        items: itemsData ?? [],
      });
      setLoading(false);
    };

    fetchOrder();
  }, [orderNumber]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-sm text-muted-foreground">Cargando pedido...</p>
        </div>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
            <Package className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-foreground mb-2">Pedido no encontrado</h2>
          <p className="text-sm text-muted-foreground mb-6">
            El pedido <strong>{orderNumber}</strong> no existe o el enlace es incorrecto.
          </p>
          <button
            onClick={() => navigate("/")}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground hover:-translate-y-0.5 transition-all"
          >
            Ir a la tienda
          </button>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pendiente;
  const StatusIcon = statusCfg.icon;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Hemerza</span>
          </button>
          <button
            onClick={handleShare}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all ${
              copied
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted-foreground hover:border-accent hover:text-accent"
            }`}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
            {copied ? "¡Enlace copiado!" : "Compartir pedido"}
          </button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-lg">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Brand */}
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl font-bold tracking-widest text-foreground">HEMERZA</h1>
            <p className="text-xs text-muted-foreground tracking-widest uppercase mt-1">Swimwear & Activewear</p>
          </div>

          {/* Order Card */}
          <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
            {/* Top gradient */}
            <div className="bg-gradient-to-r from-accent/20 to-accent/5 px-6 py-5 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Pedido</p>
                  <p className="font-mono text-2xl font-bold text-foreground">{order.order_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Total</p>
                  <p className="font-serif text-2xl font-bold text-accent">${order.total} USD</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{new Date(order.created_at).toLocaleDateString("es-PA", { day: "2-digit", month: "long", year: "numeric" })}</span>
                <span>·</span>
                <span>{PAYMENT_LABELS[order.payment_method] ?? order.payment_method}</span>
                {order.customer && (
                  <>
                    <span>·</span>
                    <span>{order.customer.name}</span>
                  </>
                )}
              </div>
            </div>

            {/* Status */}
            <div className={`mx-5 my-4 rounded-xl border p-3.5 ${statusCfg.bg}`}>
              <div className="flex items-center gap-2">
                <StatusIcon className={`h-4 w-4 flex-shrink-0 ${statusCfg.color}`} />
                <p className={`text-sm font-semibold ${statusCfg.color}`}>{statusCfg.label}</p>
              </div>
              {order.notes && (
                <p className="text-xs text-muted-foreground mt-1.5 ml-6">{order.notes}</p>
              )}
            </div>

            {/* Items */}
            <div className="px-5 pb-5 space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Productos</p>
              {order.items?.map(item => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl bg-muted/30 p-3">
                  {item.product_image && (
                    <img
                      src={item.product_image}
                      alt={item.product_name}
                      className="h-14 w-12 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.product_name}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="rounded-md bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border border-border">
                        Talla {item.size}
                      </span>
                      <span className="text-[10px] text-muted-foreground">×{item.quantity}</span>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-foreground flex-shrink-0">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}

              {/* Total row */}
              <div className="flex items-center justify-between border-t border-border pt-4 mt-2">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="font-serif text-xl font-bold text-accent">${order.total} USD</span>
              </div>
            </div>
          </div>

          {/* Share CTA */}
          <div className="mt-6 text-center">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground hover:-translate-y-0.5 hover:shadow-lg transition-all"
            >
              {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              {copied ? "¡Enlace copiado al portapapeles!" : "Compartir este pedido"}
            </button>
            <p className="text-xs text-muted-foreground mt-2">
              Cualquier persona con este enlace puede ver el pedido
            </p>
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => navigate("/")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Ir a la tienda
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default OrderPublic;
