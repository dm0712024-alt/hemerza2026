import { useState, useEffect, useRef, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Users, ShoppingBag, DollarSign, TrendingUp, Download, RefreshCw, ArrowLeft, Search, ChevronDown, ChevronUp, FileSpreadsheet, Lock, Eye, EyeOff, LogOut, FileText, Filter } from "lucide-react";
import * as XLSX from "xlsx";

const ADMIN_PASSWORD = "hemerza2026";

interface Customer {
  id: string;
  name: string;
  phone: string;
  instagram: string;
  email: string | null;
  created_at: string;
}

interface Order {
  id: string;
  customer_id: string;
  order_number: string;
  payment_method: string;
  status: string;
  total: number;
  created_at: string;
  customers?: Customer;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  size: string;
  quantity: number;
  price: number;
}

const COLORS = ["hsl(43,74%,49%)", "hsl(217,91%,50%)", "hsl(142,70%,40%)", "hsl(0,84%,60%)", "hsl(280,60%,50%)"];

const StatCard = ({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: string | number; sub?: string }) => (
  <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
    <div className="flex items-center gap-3 mb-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
        <Icon className="h-5 w-5 text-accent" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
    </div>
    <p className="text-3xl font-bold text-foreground font-serif">{value}</p>
    {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
  </div>
);

// Excel export utility
const downloadExcel = (filename: string, sheetsData: { name: string; headers: string[]; rows: string[][] }[]) => {
  const wb = XLSX.utils.book_new();
  sheetsData.forEach(({ name, headers, rows }) => {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    // Style header row width
    ws["!cols"] = headers.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  });
  XLSX.writeFile(wb, filename);
};

// CSV export utility
const downloadCsv = (filename: string, headers: string[], rows: string[][]) => {
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${(cell ?? "").replace(/"/g, '""')}"`).join(","))
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// Login Screen
const AdminLogin = ({ onLogin }: { onLogin: () => void }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem("hemerza-admin", "true");
      onLogin();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-elegant">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
            <Lock className="h-7 w-7 text-accent" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Hemerza Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ingresa la contraseña para continuar</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              autoFocus
              className={`w-full rounded-xl border bg-muted/30 py-3 pl-4 pr-12 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 ${
                error ? "border-destructive focus:ring-destructive" : "border-border focus:border-accent focus:ring-accent"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p className="text-xs text-destructive text-center">Contraseña incorrecta</p>}
          <button
            type="submit"
            className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-accent-foreground transition-all hover:-translate-y-0.5 hover:shadow-glow-gold"
          >
            Entrar
          </button>
        </form>
        <a href="/" className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3 w-3" /> Volver a la tienda
        </a>
      </div>
    </div>
  );
};

const Admin = () => {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem("hemerza-admin") === "true");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [paymentFilter, setPaymentFilter] = useState("todos");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    setLoading(true);
    const [custRes, ordRes, itemRes] = await Promise.all([
      supabase.from("customers").select("*").order("created_at", { ascending: false }),
      supabase.from("orders").select("*, customers(*)").order("created_at", { ascending: false }),
      supabase.from("order_items").select("*"),
    ]);
    setCustomers(custRes.data || []);
    setOrders((ordRes.data as unknown as Order[]) || []);
    setOrderItems(itemRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (authenticated) fetchData();
  }, [authenticated]);

  const handleLogout = () => {
    sessionStorage.removeItem("hemerza-admin");
    setAuthenticated(false);
  };

  const getOrdersForExport = (ordersToExport: Order[]) => {
    const headers = ["Orden", "Cliente", "Teléfono", "Instagram", "Método de pago", "Total (USD)", "Estado", "Fecha", "Productos"];
    const rows = ordersToExport.map(order => {
      const customer = (order as any).customers;
      const items = orderItems.filter(i => i.order_id === order.id);
      const productsList = items.map(i => `${i.product_name} (${i.size} x${i.quantity})`).join("; ");
      return [
        order.order_number,
        customer?.name || "",
        customer?.phone || "",
        customer?.instagram ? `@${customer.instagram}` : "",
        order.payment_method,
        order.total.toString(),
        order.status,
        new Date(order.created_at).toLocaleDateString("es-PA"),
        productsList,
      ];
    });
    return { headers, rows };
  };

  // Export functions
  const exportCustomersCsv = () => {
    const headers = ["Nombre", "Teléfono", "Instagram", "Email", "Fecha de registro"];
    const rows = customers.map(c => [
      c.name, c.phone, `@${c.instagram}`, c.email || "", new Date(c.created_at).toLocaleDateString("es-PA"),
    ]);
    downloadCsv(`hemerza-clientes-${new Date().toISOString().split("T")[0]}.csv`, headers, rows);
  };

  const exportCustomersExcel = () => {
    const headers = ["Nombre", "Teléfono", "Instagram", "Email", "Fecha de registro"];
    const rows = customers.map(c => [
      c.name, c.phone, `@${c.instagram}`, c.email || "", new Date(c.created_at).toLocaleDateString("es-PA"),
    ]);
    downloadExcel(`hemerza-clientes-${new Date().toISOString().split("T")[0]}.xlsx`, [
      { name: "Clientes", headers, rows }
    ]);
  };

  const exportOrdersCsv = () => {
    const { headers, rows } = getOrdersForExport(filteredOrders);
    downloadCsv(`hemerza-pedidos-${new Date().toISOString().split("T")[0]}.csv`, headers, rows);
  };

  const exportOrdersExcel = () => {
    const { headers, rows } = getOrdersForExport(filteredOrders);
    downloadExcel(`hemerza-pedidos-${new Date().toISOString().split("T")[0]}.xlsx`, [
      { name: "Pedidos", headers, rows }
    ]);
  };

  const exportAllExcel = () => {
    const custHeaders = ["Nombre", "Teléfono", "Instagram", "Email", "Fecha de registro"];
    const custRows = customers.map(c => [c.name, c.phone, `@${c.instagram}`, c.email || "", new Date(c.created_at).toLocaleDateString("es-PA")]);
    const { headers: ordHeaders, rows: ordRows } = getOrdersForExport(orders);
    downloadExcel(`hemerza-completo-${new Date().toISOString().split("T")[0]}.xlsx`, [
      { name: "Pedidos", headers: ordHeaders, rows: ordRows },
      { name: "Clientes", headers: custHeaders, rows: custRows },
    ]);
  };

  const exportAllCsv = () => {
    exportCustomersCsv();
    setTimeout(() => exportOrdersCsv(), 500);
  };

  if (!authenticated) {
    return <AdminLogin onLogin={() => setAuthenticated(true)} />;
  }

  // Stats
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const avgOrder = orders.length ? totalRevenue / orders.length : 0;

  const paymentData = ["efectivo", "yappy", "transferencia"].map(method => ({
    name: method.charAt(0).toUpperCase() + method.slice(1),
    value: orders.filter(o => o.payment_method === method).length,
  })).filter(d => d.value > 0);

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });
  const ordersByDay = last7.map(date => ({
    date: new Date(date).toLocaleDateString("es-PA", { day: "2-digit", month: "short" }),
    pedidos: orders.filter(o => o.created_at.startsWith(date)).length,
    ingresos: orders.filter(o => o.created_at.startsWith(date)).reduce((s, o) => s + o.total, 0),
  }));

  const productCounts: Record<string, { name: string; qty: number; revenue: number }> = {};
  orderItems.forEach(item => {
    if (!productCounts[item.product_id]) {
      productCounts[item.product_id] = { name: item.product_name, qty: 0, revenue: 0 };
    }
    productCounts[item.product_id].qty += item.quantity;
    productCounts[item.product_id].revenue += item.price * item.quantity;
  });
  const topProducts = Object.values(productCounts).sort((a, b) => b.qty - a.qty).slice(0, 5);

  const statusData = ["pendiente", "confirmado", "enviado", "completado", "cancelado"].map(s => ({
    name: s.charAt(0).toUpperCase() + s.slice(1),
    value: orders.filter(o => o.status === s).length,
  })).filter(d => d.value > 0);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.instagram.toLowerCase().includes(search.toLowerCase())
  );

  const filteredOrders = orders.filter(o => {
    const customer = (o as any).customers;
    const matchesSearch = !orderSearch ||
      o.order_number.toLowerCase().includes(orderSearch.toLowerCase()) ||
      customer?.name?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      customer?.instagram?.toLowerCase().includes(orderSearch.toLowerCase());
    const matchesStatus = statusFilter === "todos" || o.status === statusFilter;
    const matchesPayment = paymentFilter === "todos" || o.payment_method === paymentFilter;
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const generatePdf = async (customer: Customer) => {
    setGeneratingPdf(customer.id);
    const customerOrders = orders.filter(o => o.customer_id === customer.id);
    const printWindow = window.open("", "_blank");
    if (!printWindow) { setGeneratingPdf(null); return; }

    const itemsHtml = customerOrders.map(order => {
      const items = orderItems.filter(i => i.order_id === order.id);
      return `
        <div style="margin-bottom:20px;border:1px solid #e5e5e5;border-radius:12px;padding:16px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <strong>${order.order_number}</strong>
            <span style="background:#fef3c7;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;color:#d97706;">${order.status.toUpperCase()}</span>
          </div>
          <p style="font-size:13px;color:#666;">Fecha: ${new Date(order.created_at).toLocaleDateString("es-PA")}</p>
          <p style="font-size:13px;color:#666;">Método de pago: ${order.payment_method}</p>
          <table style="width:100%;border-collapse:collapse;margin-top:10px;">
            <thead><tr style="border-bottom:1px solid #e5e5e5;">
              <th style="text-align:left;padding:6px 0;font-size:12px;color:#888;">Producto</th>
              <th style="text-align:center;padding:6px 0;font-size:12px;color:#888;">Talla</th>
              <th style="text-align:center;padding:6px 0;font-size:12px;color:#888;">Cant.</th>
              <th style="text-align:right;padding:6px 0;font-size:12px;color:#888;">Precio</th>
            </tr></thead>
            <tbody>${items.map(i => `
              <tr style="border-bottom:1px solid #f5f5f5;">
                <td style="padding:6px 0;font-size:13px;">${i.product_name}</td>
                <td style="text-align:center;padding:6px 0;font-size:13px;">${i.size}</td>
                <td style="text-align:center;padding:6px 0;font-size:13px;">${i.quantity}</td>
                <td style="text-align:right;padding:6px 0;font-size:13px;">$${i.price * i.quantity}</td>
              </tr>`).join("")}</tbody>
          </table>
          <p style="text-align:right;font-weight:bold;margin-top:8px;font-size:16px;">Total: $${order.total} USD</p>
        </div>`;
    }).join("");

    printWindow.document.write(`<!DOCTYPE html><html><head><title>Hemerza - ${customer.name}</title>
      <style>body{font-family:'Segoe UI',Arial,sans-serif;padding:40px;color:#222;max-width:700px;margin:0 auto}h1{font-size:28px;margin-bottom:4px}.subtitle{color:#b8860b;font-size:14px;letter-spacing:2px;margin-bottom:30px}.client-info{background:#fafafa;border-radius:12px;padding:16px;margin-bottom:24px}.client-info p{margin:4px 0;font-size:14px}.label{color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;font-weight:600}@media print{body{padding:20px}}</style>
      </head><body>
        <h1>HEMERZA</h1><p class="subtitle">SWIMWEAR & ACTIVEWEAR</p>
        <p class="label">Datos del cliente</p>
        <div class="client-info">
          <p><strong>Nombre:</strong> ${customer.name}</p>
          <p><strong>Teléfono:</strong> ${customer.phone}</p>
          <p><strong>Instagram:</strong> @${customer.instagram}</p>
          ${customer.email ? `<p><strong>Email:</strong> ${customer.email}</p>` : ""}
          <p><strong>Registrado:</strong> ${new Date(customer.created_at).toLocaleDateString("es-PA")}</p>
        </div>
        <p class="label">Pedidos (${customerOrders.length})</p>
        ${customerOrders.length === 0 ? "<p style='color:#888;'>Sin pedidos registrados.</p>" : itemsHtml}
        <hr style="margin-top:30px;border:none;border-top:1px solid #e5e5e5;">
        <p style="text-align:center;font-size:11px;color:#aaa;margin-top:10px;">Generado el ${new Date().toLocaleDateString("es-PA")} — Hemerza Admin</p>
      </body></html>`);
    printWindow.document.close();
    printWindow.print();
    setGeneratingPdf(null);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <RefreshCw className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </a>
            <div>
              <h1 className="font-serif text-2xl font-bold text-foreground">Hemerza Admin</h1>
              <p className="text-xs text-muted-foreground">Panel de administración</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground transition-all">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
            <button onClick={handleLogout} className="flex items-center gap-1.5 rounded-full border border-destructive/30 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-all" title="Cerrar sesión">
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="Clientes" value={customers.length} sub="Registrados" />
          <StatCard icon={ShoppingBag} label="Pedidos" value={orders.length} sub="Total de pedidos" />
          <StatCard icon={DollarSign} label="Ingresos" value={`$${totalRevenue.toFixed(2)}`} sub="Total vendido" />
          <StatCard icon={TrendingUp} label="Ticket Promedio" value={`$${avgOrder.toFixed(2)}`} sub="Por pedido" />
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h3 className="mb-4 font-serif text-lg font-bold text-foreground">Pedidos últimos 7 días</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={ordersByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Line type="monotone" dataKey="pedidos" stroke="hsl(43,74%,49%)" strokeWidth={2} dot={{ fill: "hsl(43,74%,49%)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h3 className="mb-4 font-serif text-lg font-bold text-foreground">Métodos de pago</h3>
            {paymentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                    {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-[250px] items-center justify-center text-muted-foreground">Sin datos</p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h3 className="mb-4 font-serif text-lg font-bold text-foreground">Productos más vendidos</h3>
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Bar dataKey="qty" fill="hsl(43,74%,49%)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-[250px] items-center justify-center text-muted-foreground">Sin datos</p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h3 className="mb-4 font-serif text-lg font-bold text-foreground">Estado de pedidos</h3>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-[250px] items-center justify-center text-muted-foreground">Sin datos</p>
            )}
          </div>
        </div>

        {/* Customers Table */}
        <div className="rounded-2xl border border-border bg-card shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
            <h3 className="font-serif text-lg font-bold text-foreground">Clientes registrados</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="rounded-full border border-border bg-muted/30 py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <button onClick={exportCustomersExcel} className="flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent hover:bg-accent/20 transition-colors">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Excel
              </button>
              <button onClick={exportCustomersCsv} className="flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground transition-colors">
                <FileText className="h-3.5 w-3.5" />
                CSV
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Teléfono</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Instagram</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">PDF</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-xs font-mono text-muted-foreground">{customer.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{customer.name}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{customer.phone}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">@{customer.instagram}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{customer.email || "—"}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{new Date(customer.created_at).toLocaleDateString("es-PA")}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => generatePdf(customer)}
                        disabled={generatingPdf === customer.id}
                        className="flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
                      >
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                      {customers.length === 0 ? "No hay clientes registrados aún" : "No se encontraron resultados"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Orders Table */}
        <div className="rounded-2xl border border-border bg-card shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-foreground">Pedidos</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{filteredOrders.length} de {orders.length} pedidos</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar pedido..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="rounded-full border border-border bg-muted/30 py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent w-40"
                />
              </div>
              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="todos">Todos los estados</option>
                {["pendiente", "confirmado", "enviado", "completado", "cancelado"].map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
              {/* Payment filter */}
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="todos">Todos los pagos</option>
                {["efectivo", "yappy", "transferencia"].map(p => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
              {/* Export buttons */}
              <button onClick={exportOrdersExcel} className="flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent hover:bg-accent/20 transition-colors">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Excel
              </button>
              <button onClick={exportOrdersCsv} className="flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-2 text-xs font-semibold text-accent hover:bg-accent/20 transition-colors">
                <FileText className="h-3.5 w-3.5" />
                CSV
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Orden</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pago</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <Fragment key={order.id}>
                    <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>
                      <td className="px-6 py-4 text-xs font-mono text-muted-foreground">{order.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-6 py-4 text-sm font-medium text-foreground">{order.order_number}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{(order as any).customers?.name || "—"}</td>
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent capitalize">{order.payment_method}</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-foreground">${order.total}</td>
                      <td className="px-6 py-4">
                        <select
                          value={order.status}
                          onChange={(e) => { e.stopPropagation(); updateOrderStatus(order.id, e.target.value); }}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                        >
                          {["pendiente", "confirmado", "enviado", "completado", "cancelado"].map(s => (
                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{new Date(order.created_at).toLocaleDateString("es-PA")}</td>
                      <td className="px-6 py-4">
                        {expandedOrder === order.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </td>
                    </tr>
                    {expandedOrder === order.id && (
                      <tr>
                        <td colSpan={8} className="bg-muted/20 px-6 py-4">
                          <div className="space-y-2">
                            {orderItems.filter(i => i.order_id === order.id).map(item => (
                              <div key={item.id} className="flex items-center gap-3 rounded-lg bg-background p-3">
                                {item.product_image && (
                                  <img src={item.product_image} alt={item.product_name} className="h-10 w-8 rounded object-cover" />
                                )}
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-foreground">{item.product_name}</p>
                                  <p className="text-xs text-muted-foreground">Talla: {item.size} — Cant: {item.quantity}</p>
                                </div>
                                <p className="text-sm font-semibold text-foreground">${item.price * item.quantity}</p>
                              </div>
                            ))}
                            {orderItems.filter(i => i.order_id === order.id).length === 0 && (
                              <p className="text-sm text-muted-foreground">Sin productos</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                      {orders.length === 0 ? "No hay pedidos registrados aún" : "No se encontraron resultados con los filtros aplicados"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customers table export buttons - add excel */}
      </main>

      <div ref={pdfRef} className="hidden" />
    </div>
  );
};

export default Admin;
