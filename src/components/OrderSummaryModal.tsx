import { motion, AnimatePresence } from "framer-motion";
import { X, Instagram, User, Phone, AtSign, Mail, Banknote, Smartphone, Building2, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { CartItem } from "@/context/CartContext";
import { UserInfo } from "@/context/UserContext";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type PaymentMethod = "efectivo" | "yappy" | "transferencia";

interface OrderSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  totalPrice: number;
  user: UserInfo;
  onComplete: () => void;
}

const INSTAGRAM_URL = "https://www.instagram.com/hemerza";
const WHATSAPP_NUMBER = "50760000000";

const paymentOptions: { value: PaymentMethod; labelEs: string; labelEn: string; icon: typeof Banknote; desc: { es: string; en: string } }[] = [
  { value: "efectivo", labelEs: "Efectivo", labelEn: "Cash", icon: Banknote, desc: { es: "Pago en efectivo al recibir", en: "Cash on delivery" } },
  { value: "yappy", labelEs: "Yappy", labelEn: "Yappy", icon: Smartphone, desc: { es: "Pago móvil Yappy", en: "Yappy mobile payment" } },
  { value: "transferencia", labelEs: "Transferencia", labelEn: "Bank Transfer", icon: Building2, desc: { es: "Transferencia bancaria", en: "Bank transfer" } },
];

const OrderSummaryModal = ({ isOpen, onClose, items, totalPrice, user, onComplete }: OrderSummaryModalProps) => {
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { t, language } = useLanguage();

  const orderDate = new Date().toLocaleDateString("es-PA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const orderNumber = `HMZ-${Date.now().toString(36).toUpperCase()}`;

  const buildOrderText = () => {
    const itemLines = items
      .map((i, idx) => `${idx + 1}. ${i.product.name}\n   ${t("order.size")}: ${i.selectedSize} | ${t("order.qty")}: ${i.quantity} | $${i.product.price * i.quantity} USD`)
      .join("\n\n");

    const paymentLabel = selectedPayment
      ? paymentOptions.find(p => p.value === selectedPayment)?.[language === "es" ? "labelEs" : "labelEn"] ?? ""
      : "";

    return [
      `*PEDIDO HEMERZA*`,
      `No. ${orderNumber}`,
      `${orderDate}`,
      `${t("order.pending")}`,
      ``,
      `*${t("order.client").toUpperCase()}*`,
      `${user.name}`,
      `${user.phone}`,
      `@${user.instagram}`,
      user.email ? `${user.email}` : null,
      ``,
      `*${t("order.products").toUpperCase()}*`,
      itemLines,
      ``,
      `*${t("order.total").toUpperCase()}:* $${totalPrice} USD`,
      `*${language === "es" ? "MÉTODO DE PAGO" : "PAYMENT METHOD"}:* ${paymentLabel}`,
    ].filter(Boolean).join("\n");
  };

  const saveOrderToDb = async () => {
    // 1. Upsert customer
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", user.phone)
      .maybeSingle();

    let customerId: string;
    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer, error: custErr } = await supabase
        .from("customers")
        .insert({
          name: user.name,
          phone: user.phone,
          instagram: user.instagram,
          email: user.email || null,
        })
        .select("id")
        .single();
      if (custErr || !newCustomer) throw new Error("Error creating customer");
      customerId = newCustomer.id;
    }

    // 2. Create order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        customer_id: customerId,
        order_number: orderNumber,
        payment_method: selectedPayment!,
        total: totalPrice,
        status: "pendiente",
      })
      .select("id")
      .single();
    if (orderErr || !order) throw new Error("Error creating order");

    // 3. Create order items
    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.product.id,
      product_name: item.product.name,
      product_image: item.product.image,
      size: item.selectedSize,
      quantity: item.quantity,
      price: item.product.price,
    }));
    const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
    if (itemsErr) throw new Error("Error creating order items");

    // Always send email notification (admin always + client if has email)
    const paymentLabel = selectedPayment
      ? paymentOptions.find(p => p.value === selectedPayment)?.[language === "es" ? "labelEs" : "labelEn"] ?? ""
      : "";

    try {
      await supabase.functions.invoke("send-order-email", {
        body: {
          to_email: user.email || undefined,
          customer_name: user.name,
          customer_phone: user.phone,
          customer_instagram: user.instagram,
          order_number: orderNumber,
          order_date: orderDate,
          items: items.map(i => ({
            product_name: i.product.name,
            size: i.selectedSize,
            quantity: i.quantity,
            price: i.product.price,
            product_image: i.product.image,
          })),
          total: totalPrice,
          payment_method: selectedPayment,
          payment_label: paymentLabel,
        },
      });
    } catch (emailErr) {
      console.error("Email notification failed:", emailErr);
      // Don't block order flow if email fails
    }
  };

  const fallbackCopy = (text: string) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  };

  const handleSendOrder = async (channel: "whatsapp" | "instagram") => {
    if (!selectedPayment) return;
    setSubmitting(true);
    try {
      await saveOrderToDb();
      const text = buildOrderText();

      if (channel === "whatsapp") {
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, "_blank");
      } else {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          fallbackCopy(text);
        }
        window.open(INSTAGRAM_URL, "_blank");
      }

      toast({
        title: language === "es" ? "¡Pedido enviado!" : "Order sent!",
        description: language === "es" ? "Tu pedido ha sido registrado exitosamente." : "Your order has been registered successfully.",
      });
      onComplete();
    } catch (err) {
      console.error(err);
      toast({
        title: language === "es" ? "Error" : "Error",
        description: language === "es" ? "No se pudo registrar el pedido. Intenta de nuevo." : "Could not register the order. Try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[70] bg-foreground/60"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4"
            onClick={onClose}
          >
            <div
              className="relative w-full max-w-lg rounded-2xl bg-background shadow-elegant"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border px-6 py-5">
                <div>
                  <h2 className="font-serif text-xl font-bold text-foreground">{t("order.title")}</h2>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      {orderNumber} — {orderDate}
                    </p>
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                      {t("order.pending")}
                    </span>
                  </div>
                </div>
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
                {/* Client Info */}
                <div className="mb-5 rounded-xl border border-border bg-muted/30 p-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {t("order.client")}
                  </p>
                  <div className="space-y-1.5 text-sm text-foreground">
                    <p className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-accent" />{user.name}</p>
                    <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-accent" />{user.phone}</p>
                    <p className="flex items-center gap-2"><AtSign className="h-3.5 w-3.5 text-accent" />{user.instagram}</p>
                    {user.email && (
                      <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-accent" />{user.email}</p>
                    )}
                  </div>
                </div>

                {/* Products */}
                <div className="mb-5">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {t("order.products")}
                  </p>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.product.id + item.selectedSize} className="flex items-center gap-3">
                        <img src={item.product.image} alt={item.product.name} className="h-14 w-12 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("order.size")}: {item.selectedSize} — {t("order.qty")}: {item.quantity}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-foreground">${item.product.price * item.quantity}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Method Selection */}
                <div className="mb-5">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {language === "es" ? "Método de pago" : "Payment method"}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {paymentOptions.map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = selectedPayment === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setSelectedPayment(opt.value)}
                          className={`relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all ${
                            isSelected
                              ? "border-accent bg-accent/10 shadow-glow-gold"
                              : "border-border hover:border-muted-foreground"
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent">
                              <Check className="h-3 w-3 text-accent-foreground" />
                            </div>
                          )}
                          <Icon className={`h-5 w-5 ${isSelected ? "text-accent" : "text-muted-foreground"}`} />
                          <span className={`text-xs font-semibold ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                            {language === "es" ? opt.labelEs : opt.labelEn}
                          </span>
                          <span className="text-[10px] text-muted-foreground text-center leading-tight">
                            {opt.desc[language]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Total */}
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <span className="text-sm font-medium text-muted-foreground">{t("order.total")}</span>
                  <span className="font-serif text-2xl font-bold text-gradient-gold">${totalPrice} USD</span>
                </div>

                <p className="mt-3 rounded-lg bg-muted/50 p-3 text-center text-xs text-muted-foreground">
                  {t("order.note")}
                </p>
              </div>

              <div className="border-t border-border px-6 py-5">
                <p className="mb-3 text-center text-xs text-muted-foreground">{t("order.choose")}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleSendOrder("whatsapp")}
                    disabled={!selectedPayment || submitting}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[hsl(142,70%,40%)] py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    )}
                    WhatsApp
                  </button>
                  <button
                    onClick={() => handleSendOrder("instagram")}
                    disabled={!selectedPayment || submitting}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-accent py-3.5 text-sm font-semibold text-accent-foreground transition-all hover:-translate-y-0.5 hover:shadow-glow-gold disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Instagram className="h-4 w-4" />}
                    Instagram
                  </button>
                </div>
                {!selectedPayment && (
                  <p className="mt-2 text-center text-xs text-destructive">
                    {language === "es" ? "Selecciona un método de pago" : "Select a payment method"}
                  </p>
                )}
                <div className="mt-3 flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex flex-1 items-center justify-center rounded-full border border-border py-3 text-sm font-medium text-muted-foreground transition-all hover:border-foreground hover:text-foreground"
                  >
                    {t("order.continue_shopping") || "Seguir Comprando"}
                  </button>
                  <button
                    onClick={() => { onComplete(); onClose(); }}
                    className="flex flex-1 items-center justify-center rounded-full border border-destructive/50 py-3 text-sm font-medium text-destructive transition-all hover:bg-destructive/10"
                  >
                    {t("order.cancel") || "Cancelar"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default OrderSummaryModal;
