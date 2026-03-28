import Portal from "@/components/Portal";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-black overflow-x-hidden">
      {/* ── THE VIGNETTE SHIELD ── 
          This creates a soft, professional dark fade at the top. 
          It makes gold text much easier to read without changing the "look" of the bar.
      */}
      <div 
        className="fixed top-0 left-0 w-full h-[30vh] pointer-events-none z-[4500]" 
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0) 100%)',
          mixBlendMode: 'multiply' 
        }}
      />

      <Portal />
    </main>
  );
}