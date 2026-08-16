"use client";

import { useState, useMemo } from "react";
import { MapPin, ChevronRight, ChevronLeft } from "lucide-react";
import {
  usePublicCities,
  usePublicAreasForCity,
  usePublicBranchesByCity,
} from "@/features/online-ordering/hooks/useOnlineOrdering";
import { useLocationStore } from "@/store/useLocationStore";

type Step = "city" | "area" | "branch" | "confirm";

interface LocationPickerModalProps {
  mode: "delivery" | "dineIn";
}

export function LocationPickerModal({ mode }: LocationPickerModalProps) {
  const setLocation = useLocationStore((s) => s.setLocation);

  const [step, setStep] = useState<Step>("city");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  const { cities, isLoading: citiesLoading } = usePublicCities();
  const { areas, isLoading: areasLoading } = usePublicAreasForCity(
    mode === "delivery" ? selectedCity : null
  );
  const { branches, isLoading: branchesLoading } = usePublicBranchesByCity(selectedCity);

  const selectedBranchName = useMemo(() => {
    return branches.find((b) => b.id === selectedBranchId)?.name ?? "";
  }, [branches, selectedBranchId]);

  function handleCitySelect(city: string) {
    setSelectedCity(city);
    setStep(mode === "delivery" ? "area" : "branch");
  }

  function handleAreaSelect(area: string, branchId: string) {
    setSelectedArea(area);
    setSelectedBranchId(branchId);
    setStep("confirm");
  }

  function handleBranchSelect(branchId: string) {
    setSelectedBranchId(branchId);
    setStep("confirm");
  }

  function handleConfirm() {
    if (!selectedCity || !selectedBranchId) return;
    setLocation({
      branchId: selectedBranchId,
      city: selectedCity,
      area: mode === "delivery" ? selectedArea ?? undefined : undefined,
    });
  }

  function goBack() {
    if (step === "area" || step === "branch") {
      setStep("city");
      setSelectedCity(null);
    } else if (step === "confirm") {
      setStep(mode === "delivery" ? "area" : "branch");
      setSelectedBranchId(null);
      if (mode === "delivery") setSelectedArea(null);
    }
  }

  const headerText =
    step === "confirm"
      ? "Confirm your selection"
      : mode === "delivery"
        ? "Where should we deliver?"
        : "Where would you like to book?";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-5 border-b border-[#ebe9e4] flex items-center gap-2">
          {step !== "city" && (
            <button onClick={goBack} className="text-[#8a8680] hover:text-[#1a1815]">
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <MapPin className="w-4 h-4 text-[#e8570e]" />
          <h2 className="text-sm font-semibold text-[#1a1815]">{headerText}</h2>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* ── Step: City ─────────────────────────────────────────── */}
          {step === "city" && (
            citiesLoading ? (
              <p className="text-sm text-[#8a8680] text-center py-8">Loading cities…</p>
            ) : cities.length === 0 ? (
              <p className="text-sm text-[#8a8680] text-center py-8">
                No locations configured yet.
              </p>
            ) : (
              <>
                <p className="text-xs font-medium text-[#8a8680] uppercase tracking-wide">
                  Select your city
                </p>
                <div className="space-y-1.5">
                  {cities.map((city) => (
                    <button
                      key={city}
                      onClick={() => handleCitySelect(city)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#ebe9e4] hover:border-[#e8570e] hover:bg-[#faf9f7] transition-colors text-left"
                    >
                      <span className="text-sm font-medium text-[#1a1815]">{city}</span>
                      <ChevronRight className="w-4 h-4 text-[#8a8680]" />
                    </button>
                  ))}
                </div>
              </>
            )
          )}

          {/* ── Step: Area (delivery mode only) ───────────────────── */}
          {step === "area" && (
            areasLoading ? (
              <p className="text-sm text-[#8a8680] text-center py-8">Loading areas…</p>
            ) : areas.length === 0 ? (
              <p className="text-sm text-[#8a8680] text-center py-8">
                No delivery areas configured in {selectedCity}.
              </p>
            ) : (
              <>
                <p className="text-xs font-medium text-[#8a8680] uppercase tracking-wide">
                  Select your area in {selectedCity}
                </p>
                <div className="space-y-1.5">
                  {areas.map(({ area, branchId }) => (
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
            )
          )}

          {/* ── Step: Branch (dine-in mode only) ──────────────────── */}
          {step === "branch" && (
            branchesLoading ? (
              <p className="text-sm text-[#8a8680] text-center py-8">Loading branches…</p>
            ) : branches.length === 0 ? (
              <p className="text-sm text-[#8a8680] text-center py-8">
                No branches found in {selectedCity}.
              </p>
            ) : (
              <>
                <p className="text-xs font-medium text-[#8a8680] uppercase tracking-wide">
                  Select a branch in {selectedCity}
                </p>
                <div className="space-y-1.5">
                  {branches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => handleBranchSelect(b.id)}
                      className="w-full flex flex-col items-start px-4 py-3 rounded-xl border border-[#ebe9e4] hover:border-[#e8570e] hover:bg-[#faf9f7] transition-colors text-left"
                    >
                      <span className="text-sm font-medium text-[#1a1815]">{b.name}</span>
                      {b.address && (
                        <span className="text-xs text-[#8a8680] mt-0.5">{b.address}</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )
          )}

          {/* ── Step: Confirm ──────────────────────────────────────── */}
          {step === "confirm" && (
            <div className="flex flex-col items-center text-center py-4 gap-3">
              <div className="h-12 w-12 rounded-full bg-[#fef3ed] flex items-center justify-center">
                <MapPin className="w-5 h-5 text-[#e8570e]" />
              </div>
              <p className="text-sm text-[#1a1815]">
                You picked{" "}
                <span className="font-semibold">{selectedBranchName || "this branch"}</span>.
                <br />
                You can always switch branches later using the button at the top of the page.
              </p>
              <button
                onClick={handleConfirm}
                className="mt-2 self-end bg-[#e8570e] hover:bg-[#c44a0c] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                OK
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}