import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Instagram } from "lucide-react";
import { products, categories, Product } from "@/data/products";
import ProductDetailModal from "@/components/ProductDetailModal";
import { useLanguage } from "@/context/LanguageContext";

const INSTAGRAM_URL = "https://www.instagram.com/hemerza";

const ProductCard = ({ product, index, onClick, t }: { product: Product; index: number; onClick: () => void; t: (key: string) => string }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 8;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -8;
    setTilt({ x: y, y: x });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      onClick={onClick}
      className="perspective-1000 group cursor-pointer"
    >
      <motion.div
        animate={{ rotateX: tilt.x, rotateY: tilt.y }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="preserve-3d overflow-hidden rounded-2xl border border-border bg-card shadow-card-3d transition-all duration-300 hover:shadow-hover"
      >
        <div className="relative overflow-hidden aspect-[3/4]">
          <img
            src={product.image}
            alt={`${product.name} - Hemerza ${product.category}`}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-foreground/0 transition-colors duration-300 group-hover:bg-foreground/20" />
          
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {product.isNew && (
              <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold text-accent-foreground">{t("products.new")}</span>
            )}
            {product.isBestseller && (
              <span className="rounded-full bg-foreground px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground">{t("products.bestseller")}</span>
            )}
          </div>

          <div className="absolute inset-0 flex items-end justify-center p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span className="rounded-full bg-accent/90 px-5 py-2.5 text-xs font-semibold text-accent-foreground shadow-glow-gold">
              {t("products.view_details")}
            </span>
          </div>
        </div>
        <div className="p-4">
          <p className="mb-0.5 text-[10px] font-medium uppercase tracking-widest text-accent">
            {product.category}
          </p>
          <h3 className="mb-1 text-sm font-semibold text-card-foreground">{product.name}</h3>
          <p className="font-serif text-lg font-bold text-foreground">${product.price}</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Products = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeCategory, setActiveCategory] = useState<string>("Todos");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { t } = useLanguage();

  const filteredProducts = activeCategory === "Todos"
    ? products
    : products.filter((p) => p.category === activeCategory);

  return (
    <section id="products" className="bg-gradient-subtle py-24 lg:py-32">
      <div ref={ref} className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-accent">{t("products.label")}</p>
          <h2 className="mb-4 font-serif text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            {t("products.title")}
          </h2>
          <p className="mx-auto max-w-lg text-muted-foreground">
            {t("products.description")}
          </p>
        </motion.div>

        <div className="mb-10 flex flex-wrap justify-center gap-2">
          {[t("products.all"), ...categories].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat === t("products.all") ? "Todos" : cat)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                (cat === t("products.all") && activeCategory === "Todos") || activeCategory === cat
                  ? "bg-primary text-primary-foreground shadow-card"
                  : "border border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
              onClick={() => setSelectedProduct(product)}
              t={t}
            />
          ))}
        </motion.div>

      </div>

      {selectedProduct && (
        <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </section>
  );
};

export default Products;
