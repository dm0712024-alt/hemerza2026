import { motion, AnimatePresence } from "framer-motion";
import { X, Check, ShoppingBag } from "lucide-react";
import { useState, useEffect } from "react";
import { Product } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
}

const ProductDetailModal = ({ product, onClose }: ProductDetailModalProps) => {
  const { addItem } = useCart();
  const { t } = useLanguage();
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (product) {
      setSelectedSize("");
      setAdded(false);
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [product]);

  if (!product) return null;

  const handleAddToCart = () => {
    if (!selectedSize) return;
    addItem(product, selectedSize);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 400);
  };

  const handleQuickAdd = (size: string) => {
    setSelectedSize(size);
    addItem(product, size);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 400);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/50 sm:p-4"
      >
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: "spring", damping: 30, stiffness: 400 }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-background shadow-elegant sm:max-h-[90vh] sm:rounded-2xl"
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground hover:text-foreground"
            aria-label={t("detail.close")}
          >
            <X className="h-5 w-5" />
          </button>

          <div className="grid md:grid-cols-2">
            <div className="relative aspect-[3/2] sm:aspect-[4/3] md:aspect-auto">
              <img src={product.image} alt={product.name} className="h-full w-full rounded-t-2xl object-cover md:rounded-l-2xl md:rounded-tr-none" loading="lazy" />
              {product.isNew && (
                <span className="absolute left-4 top-4 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">{t("products.new")}</span>
              )}
              {product.isBestseller && (
                <span className="absolute left-4 top-4 rounded-full bg-foreground px-3 py-1 text-xs font-bold text-primary-foreground">{t("products.bestseller")}</span>
              )}
            </div>

            <div className="flex flex-col justify-between p-4 sm:p-6 md:p-8">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-accent">
                  {product.category} · {product.subcategory}
                </p>
                <h2 className="mb-1 font-serif text-xl font-bold text-foreground sm:text-2xl">{product.name}</h2>
                <p className="mb-2 font-serif text-2xl font-bold text-gradient-gold sm:text-3xl sm:mb-4">${product.price}</p>
                <p className="mb-3 text-sm leading-relaxed text-muted-foreground sm:mb-6">{product.description}</p>

                <div className="mb-3 sm:mb-6">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground">{t("detail.details")}</p>
                  <ul className="space-y-1.5">
                    {product.details.map((d) => (
                      <li key={d} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="h-1 w-1 rounded-full bg-accent" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mb-3 sm:mb-6">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground">
                    {t("detail.size")} — <span className="text-muted-foreground normal-case font-normal">toca para agregar rápido</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => handleQuickAdd(size)}
                        className={`group relative rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                          selectedSize === size
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border text-muted-foreground hover:border-accent hover:text-accent hover:bg-accent/5"
                        }`}
                      >
                        {size}
                        <ShoppingBag className="absolute -right-1 -top-1 h-3.5 w-3.5 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <button
                  onClick={handleAddToCart}
                  disabled={!selectedSize}
                  className={`flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold transition-all ${
                    added
                      ? "bg-green-600 text-primary-foreground"
                      : selectedSize
                      ? "bg-primary text-primary-foreground hover:-translate-y-0.5 hover:shadow-hover"
                      : "cursor-not-allowed bg-muted text-muted-foreground"
                  }`}
                >
                  {added ? (
                    <>
                      <Check className="h-4 w-4" />
                      {t("detail.added")}
                    </>
                  ) : (
                    t("detail.add")
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProductDetailModal;
