import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import LogosBar from "@/components/LogosBar";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Profiles from "@/components/Profiles";
import Pricing from "@/components/Pricing";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import Contact from "@/components/Contact";
import CtaSection from "@/components/CtaSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <LogosBar />
      <HowItWorks />
      <Features />
      <Profiles />
      <Testimonials />
      <Pricing />
      <FAQ />
      <Contact />
      <CtaSection />
      <Footer />
    </>
  );
}
