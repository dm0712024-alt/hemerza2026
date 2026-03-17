import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ShoppingBag, Package, Clock, CheckCircle2, Truck, XCircle, ChevronDown, ChevronUp, RefreshCw, Share2, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/context/UserContext";
import UserLoginModal from "@/components/UserLoginModal";

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
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pendiente:   { label: "Pendiente de confirmación", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: Clock },
  confirmado:  { label: "Confirmado — pago verificado", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", icon: CheckCircle2 },
  enviado:     { label: "Enviado / En camino", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", icon: Truck },
  completado:  { label: "Completado", color: "text-accent", bg: "bg-accent/10 border-accent/20", icon: CheckCircle2 },
  cancelado:   { label: "Cancelado", color: "text-destructive", bg: "bg-destructive/10 border-destructive/20", icon: XCircle },
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pendiente;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${cfg.color} ${cfg.bg}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
};

const MisPedidos = () => {
  const { user, showLoginModal, setShowLoginModal, requireLogin } = useUser();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  const handleShareOrder = async (orderNumber: string, orderId: string) => {
    const url = `${window.location.origin}/pedido/${orderNumber}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedOrderId(orderId);
      setTimeout(() => setCopiedOrderId(null), 2500);
    } catch {
      // fallback for older browsers
      window.open(url, "_blank");
    }
  };

  const fetchOrders = async (phone: string) => {
    setLoading(true);
    // Find customer by phone
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (!customer) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false });

    if (!ordersData) { setLoading(false); return; }

    // Fetch items for all orders
    const orderIds = ordersData.map(o => o.id);
    const { data: itemsData } = await supabase
      .from("order_items")
      .select("*")
      .in("order_id", orderIds);

    const ordersWithItems = ordersData.map(order => ({
      ...order,
      items: itemsData?.filter(i => i.order_id === order.id) ?? [],
    }));

    setOrders(ordersWithItems);
    setLoading(false);
  };

  const handleRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await fetchOrders(user.phone);
    setRefreshing(false);
  };

  useEffect(() => {
    if (user) {
      fetchOrders(user.phone);
    } else {
      // Trigger login
      requireLogin(() => {});
    }
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
            <Package className="h-7 w-7 text-accent" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-foreground mb-2">Mis Pedidos</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Ingresa tu información para ver el historial de tus pedidos
          </p>
          <button
            onClick={() => setShowLoginModal(true)}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground hover:-translate-y-0.5 hover:shadow-glow-gold transition-all"
          >
            Ingresar mis datos
          </button>
          <a href="/" className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3 w-3" /> Volver a la tienda
          </a>
        </div>
        <UserLoginModal />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm hidden sm:inline">Volver a la tienda</span>
            </button>
            <div className="h-5 w-px bg-border hidden sm:block" />
            <div>
              <h1 className="font-serif text-xl font-bold text-foreground">Mis Pedidos</h1>
              <p className="text-xs text-muted-foreground">{user.name}</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-2xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-accent mb-3" />
            <p className="text-sm text-muted-foreground">Cargando tus pedidos...</p>
          </div>
        ) : orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted/50">
              <ShoppingBag className="h-9 w-9 text-muted-foreground/30" />
            </div>
            <h3 className="font-serif text-xl font-bold text-foreground mb-2">Sin pedidos aún</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Cuando realices tu primer pedido, lo verás aquí con su estado actualizado.
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-6 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground hover:-translate-y-0.5 hover:shadow-glow-gold transition-all"
            >
              Ver productos
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-6">
              {orders.length} {orders.length === 1 ? "pedido" : "pedidos"} registrados
            </p>

            {orders.map((order, index) => {
              const isExpanded = expandedOrder === order.id;
              const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pendiente;
              const StatusIcon = statusCfg.icon;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
                >
                  {/* Order header */}
                  <div
                    className="flex cursor-pointer items-start justify-between gap-4 p-5 hover:bg-muted/20 transition-colors"
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-mono text-sm font-bold text-foreground">{order.order_number}</span>
                        <StatusBadge status={order.status} />
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{new Date(order.created_at).toLocaleDateString("es-PA", { day: "2-digit", month: "long", year: "numeric" })}</span>
                        <span className="capitalize">{order.payment_method}</span>
                        <span>{order.items?.length ?? 0} {(order.items?.length ?? 0) === 1 ? "producto" : "productos"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-serif text-lg font-bold text-foreground">${order.total}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleShareOrder(order.order_number, order.id); }}
                        className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-all ${
                          copiedOrderId === order.id
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border text-muted-foreground hover:border-accent hover:text-accent"
                        }`}
                        aria-label="Compartir pedido"
                      >
                        {copiedOrderId === order.id ? <Check className="h-3 w-3" /> : <Share2 className="h-3 w-3" />}
                        {copiedOrderId === order.id ? "¡Copiado!" : "Compartir"}
                      </button>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Status info bar */}
                  <div className={`mx-5 mb-4 rounded-xl border p-3 ${statusCfg.bg}`}>
                    <div className="flex items-start gap-2">
                      <StatusIcon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${statusCfg.color}`} />
                      <div>
                        <p className={`text-xs font-semibold ${statusCfg.color}`}>{statusCfg.label}</p>
                        {order.status === "pendiente" && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Tu pedido está siendo revisado. Te contactaremos por WhatsApp o Instagram para confirmar el pago.
                          </p>
                        )}
                        {order.status === "confirmado" && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            ¡Pago confirmado! Estamos preparando tu pedido.
                          </p>
                        )}
                        {order.status === "enviado" && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Tu pedido está en camino. Te contactaremos cuando llegue.
                          </p>
                        )}
                        {order.status === "completado" && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            ¡Pedido entregado! Gracias por tu compra en Hemerza 🌟
                          </p>
                        )}
                        {order.notes && (
                          <p className="text-[11px] text-muted-foreground mt-1 italic">Nota: {order.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded items */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-border mx-0 px-5 py-4 bg-muted/20 space-y-3">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Productos</p>
                          {order.items?.map(item => (
                            <div key={item.id} className="flex items-center gap-3 rounded-xl bg-background p-3">
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
                                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                    Talla {item.size}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">×{item.quantity}</span>
                                </div>
                              </div>
                              <p className="text-sm font-bold text-foreground flex-shrink-0">${item.price * item.quantity}</p>
                            </div>
                          ))}
                          <div className="flex items-center justify-between border-t border-border pt-3">
                            <span className="text-sm text-muted-foreground">Total del pedido</span>
                            <span className="font-serif text-lg font-bold text-accent">${order.total} USD</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      <UserLoginModal />
    </div>
  );
};

export default MisPedidos;
