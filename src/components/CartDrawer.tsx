import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, ShoppingBag, Trash2, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import { useLanguage } from "@/context/LanguageContext";
import OrderSummaryModal from "@/components/OrderSummaryModal";

const CartDrawer = () => {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, totalItems, totalPrice, clearCart } = useCart();
  const { user, requireLogin } = useUser();
  const { t } = useLanguage();
  const [showSummary, setShowSummary] = useState(false);

  const handleProceedToOrder = () => {
    requireLogin(() => {
      setShowSummary(true);
    });
  };

  const handleOrderComplete = () => {
    setShowSummary(false);
    clearCart();
    setIsOpen(false);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-foreground/40"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-elegant"
            >
              <div className="flex items-center justify-between border-b border-border p-6">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="h-5 w-5 text-foreground" />
                  <h2 className="font-serif text-xl font-bold text-foreground">
                    {t("cart.title")} ({totalItems})
                  </h2>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground" aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <ShoppingBag className="mb-4 h-12 w-12 text-muted-foreground/30" />
                    <p className="font-serif text-lg text-muted-foreground">{t("cart.empty")}</p>
                    <p className="mt-2 text-sm text-muted-foreground/70">{t("cart.empty.desc")}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item) => (
                      <motion.div
                        key={item.product.id + item.selectedSize}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        className="flex gap-4 rounded-xl border border-border bg-card p-3"
                      >
                        <img src={item.product.image} alt={item.product.name} className="h-24 w-20 rounded-lg object-cover" />
                        <div className="flex flex-1 flex-col justify-between">
                          <div>
                            <p className="text-sm font-semibold text-card-foreground">{item.product.name}</p>
                            <p className="text-xs text-muted-foreground">{t("cart.size")}: {item.selectedSize}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted" aria-label="-">
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-6 text-center text-sm font-medium text-card-foreground">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted" aria-label="+">
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <p className="text-sm font-bold text-accent">${item.product.price * item.quantity}</p>
                          </div>
                        </div>
                        <button onClick={() => removeItem(item.product.id)} className="self-start text-muted-foreground/50 hover:text-destructive" aria-label="Remove">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {items.length > 0 && (
                <div className="border-t border-border p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-muted-foreground">{t("cart.total")}</span>
                    <span className="font-serif text-2xl font-bold text-foreground">${totalPrice}</span>
                  </div>
                  <button
                    onClick={handleProceedToOrder}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-4 font-sans text-sm font-semibold text-accent-foreground shadow-glow-gold transition-all hover:-translate-y-0.5 hover:shadow-[0_0_50px_hsl(43_74%_49%_/_0.5)]"
                  >
                    {t("cart.continue")}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button onClick={clearCart} className="mt-3 w-full text-center text-xs text-muted-foreground/60 hover:text-destructive">
                    {t("cart.clear")}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {user && (
        <OrderSummaryModal
          isOpen={showSummary}
          onClose={() => setShowSummary(false)}
          items={items}
          totalPrice={totalPrice}
          user={user}
          onComplete={handleOrderComplete}
        />
      )}
    </>
  );
};

export default CartDrawer;
