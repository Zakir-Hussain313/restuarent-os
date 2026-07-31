"use client";

import { useState, useMemo } from "react";
import { MapPin, ChevronRight } from "lucide-react";
import { usePublicDeliveryAreas } from "@/features/online-ordering/hooks/useOnlineOrdering";
import { useLocationStore } from "@/store/useLocationStore";

export function LocationPickerModal() {
  const { cities, isLoading } = usePublicDeliveryAreas();
  const setLocation = useLocationStore((s) => s.setLocation);

  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const areasForCity = useMemo(() => {
    return cities.find((c) => c.city === selectedCity)?.areas ?? [];
  }, [cities, selectedCity]);

  const handleAreaSelect = (area: string, branchId: string) => {
    if (!selectedCity) return;
    setLocation({ branchId, city: selectedCity, area });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-5 border-b border-[#ebe9e4] flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#e8570e]" />
          <h2 className="text-sm font-semibold text-[#1a1815]">
            Where should we deliver?
          </h2>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-[#8a8680] text-center py-8">Loading areas…</p>
          ) : cities.length === 0 ? (
            <p className="text-sm text-[#8a8680] text-center py-8">
              No delivery areas configured yet.
            </p>
          ) : !selectedCity ? (
            <>
              <p className="text-xs font-medium text-[#8a8680] uppercase tracking-wide">
                Select your city
              </p>
              <div className="space-y-1.5">
                {cities.map(({ city }) => (
                  <button
                    key={city}
                    onClick={() => setSelectedCity(city)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#ebe9e4] hover:border-[#e8570e] hover:bg-[#faf9f7] transition-colors text-left"
                  >
                    <span className="text-sm font-medium text-[#1a1815]">{city}</span>
                    <ChevronRight className="w-4 h-4 text-[#8a8680]" />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setSelectedCity(null)}
                className="text-xs text-[#e8570e] font-medium mb-1"
              >
                ← Change city
              </button>
              <p className="text-xs font-medium text-[#8a8680] uppercase tracking-wide">
                Select your area in {selectedCity}
              </p>
              <div className="space-y-1.5">
                {areasForCity.map(({ area, branchId }) => (
                  <button
                    key={area}
                    onClick={() => handleAreaSelect(area, branchId)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#ebe9e4] hover:border-[#e8570e] hover:bg-[#faf9f7] transition-colors text-left"
                  >
                    <span className="text-sm font-medium text-[#1a1815]">{area}</span>
                    <ChevronRight className="w-4 h-4 text-[#8a8680]" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}