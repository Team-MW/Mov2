import React, { useState, useEffect } from 'react';
import { animalsData } from '../../data/animalsCuts';

export default function InteractiveMeatMap() {
  const [activeAnimalId, setActiveAnimalId] = useState('agneau');
  
  const activeAnimal = animalsData.find(a => a.id === activeAnimalId) || animalsData[0];
  const [activeCut, setActiveCut] = useState(activeAnimal.cuts.find(c => c.id === 'gigot') || activeAnimal.cuts[0]);

  const handleAnimalChange = (animalId) => {
    setActiveAnimalId(animalId);
    const animal = animalsData.find(a => a.id === animalId);
    if (animal && animal.cuts.length > 0) {
      setActiveCut(animal.cuts[0]);
    }
  };

  return (
    <div className="bg-white rounded-[40px] shadow-sm ring-1 ring-black/5 overflow-hidden p-6 md:p-10 flex flex-col gap-8">
      
      {/* Tabs */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide w-full border-b border-neutral-100 px-2">
        {animalsData.map((animal) => (
          <button
            key={animal.id}
            onClick={() => handleAnimalChange(animal.id)}
            className={`px-6 py-2.5 rounded-full text-[14px] font-bold whitespace-nowrap transition-all duration-300 ${
              activeAnimalId === animal.id 
                ? 'bg-rouge text-white shadow-md' 
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {animal.name}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-10 items-center">
        {/* Left / Image Side */}
        <div className="lg:w-1/2 relative w-full">
          <div className="relative w-full aspect-video max-w-[800px] mx-auto transition-opacity duration-300" key={activeAnimalId}>
            {/* Animal Base Image */}
            <img 
              src={activeAnimal.image} 
              alt={`${activeAnimal.name} - Schéma des découpes`}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none drop-shadow-md"
            />

            {/* Interactive Pins */}
            {activeAnimal.cuts.map((cut) => {
              const isActive = activeCut.id === cut.id;
              return (
                <button
                  key={cut.id}
                  onClick={() => setActiveCut(cut)}
                  className="absolute flex items-center justify-center group focus:outline-none z-10"
                  style={{ top: cut.top, left: cut.left, transform: 'translate(-50%, -50%)' }}
                  aria-label={`Voir les détails pour ${cut.name}`}
                >
                  <div className={`relative flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full transition-all duration-300 ${isActive ? 'bg-rouge scale-125' : 'bg-rouge opacity-50 hover:opacity-100 hover:scale-110 shadow-lg'}`}>
                     {isActive && (
                       <span className="absolute inset-0 rounded-full animate-ping bg-rouge opacity-40"></span>
                     )}
                     <span className="block w-2 h-2 sm:w-2.5 sm:h-2.5 bg-white rounded-full shadow-sm"></span>
                  </div>
                  
                  <div className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-3 px-3 py-1.5 bg-noir text-white text-xs font-bold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${isActive ? 'hidden' : 'hidden sm:block z-50'}`}>
                    {cut.name}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-noir"></div>
                  </div>
                </button>
              )
            })}
          </div>
          <p className="text-center text-[13px] text-neutral-500 mt-4 italic">Cliquez sur un repère rouge pour voir les détails de la découpe.</p>
        </div>

        {/* Right / Information Side */}
        <div className="lg:w-1/2 flex flex-col justify-center w-full">
          <div className="bg-neutral-50/80 p-8 rounded-3xl ring-1 ring-black/5 transition-all duration-300 relative overflow-hidden min-h-[450px] flex flex-col">
             <div className="absolute -top-12 -right-12 w-32 h-32 bg-rouge opacity-5 rounded-full blur-3xl pointer-events-none"></div>
             
             {/* Halal Logo */}
             <div className="absolute top-6 right-6 w-16 h-16 opacity-90 drop-shadow-sm">
                <img src="/images/halal-logo.png" alt="Certification Halal" className="w-full h-full object-contain" />
             </div>

             <div className="flex items-center gap-3 mb-5 relative mt-2">
                <span className="w-10 h-1 bg-rouge rounded-full inline-block"></span>
                <span className="eyebrow !text-rouge tracking-widest text-[11px] uppercase">Le conseil du boucher</span>
             </div>
             
             <h3 className="text-3xl md:text-4xl font-display text-balance mb-4 text-noir">
               {activeCut.name}
             </h3>
             
             <p className="text-[15px] md:text-[16px] leading-relaxed text-neutral-600 mb-8 font-medium">
               {activeCut.description}
             </p>

             <div className="space-y-6 mt-auto">
                <div>
                  <h4 className="font-soft font-bold text-[14px] uppercase text-noir tracking-wide mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-rouge" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    En vitrine
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {activeCut.availableMeats.map(meat => (
                      <span key={meat} className="px-3 py-1.5 bg-white ring-1 ring-black/5 rounded-lg text-[14px] text-neutral-800 shadow-sm font-medium">
                        {meat}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-soft font-bold text-[14px] uppercase text-noir tracking-wide mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-rouge" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
                    </svg>
                    Idéal pour...
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {activeCut.cookingMethods.map(method => (
                      <span key={method} className="px-3 py-1.5 bg-red-50 text-rouge rounded-lg text-[14px] font-bold">
                        {method}
                      </span>
                    ))}
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
