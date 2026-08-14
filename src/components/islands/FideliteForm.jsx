import { useEffect, useRef, useState } from "react";

/**
 * FideliteForm — React island.
 * Intègre le formulaire JotForm pour le programme de fidélité
 * avec une animation de chargement personnalisée Marché de Mo'.
 */
export default function FideliteForm() {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // S'assure que le script n'est ajouté qu'une seule fois
    if (containerRef.current && containerRef.current.children.length === 0) {
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src = "https://form.jotform.com/jsform/262253577205356";
      
      // On cache le chargement une fois le script Jotform chargé
      script.onload = () => {
        // Petit délai pour laisser le temps à l'iframe JotForm de s'afficher correctement
        setTimeout(() => setLoading(false), 800);
      };
      
      containerRef.current.appendChild(script);
    }
  }, []);

  return (
    <div className="bg-white rounded-3xl shadow-card relative min-h-[500px] overflow-hidden w-full">
      {/* Animation de chargement Marché de Mo' */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 rounded-3xl transition-opacity duration-500">
          <div className="relative flex items-center justify-center w-16 h-16">
            {/* Anneau de fond */}
            <div className="absolute inset-0 border-4 border-neutral-100 rounded-full"></div>
            {/* Anneau animé Vert Marché de Mo' */}
            <div className="absolute inset-0 border-4 border-vert rounded-full border-t-transparent animate-spin"></div>
            {/* Point central */}
            <div className="w-2 h-2 bg-vert rounded-full"></div>
          </div>
          <p className="mt-5 font-soft font-bold text-vert text-[15px] animate-pulse">
            Chargement du formulaire...
          </p>
        </div>
      )}
      
      {/* Conteneur JotForm */}
      <div ref={containerRef} className="jotform-container w-full" />
    </div>
  );
}
