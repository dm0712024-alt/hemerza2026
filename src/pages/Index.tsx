import { useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Collections from "@/components/Collections";
import Products from "@/components/Products";
import CustomOrders from "@/components/CustomOrders";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import SizeGuide from "@/components/SizeGuide";
import Social from "@/components/Social";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import UserLoginModal from "@/components/UserLoginModal";
import SplashScreen from "@/components/SplashScreen";

const Index = () => {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <Navbar />
      <CartDrawer />
      <UserLoginModal />
      <Hero />
      <About />
      <Collections />
      <Products />
      <CustomOrders />
      <Testimonials />
      <SizeGuide />
      <FAQ />
      <Social />
      <Footer />
    </div>
  );
};

export default Index;
