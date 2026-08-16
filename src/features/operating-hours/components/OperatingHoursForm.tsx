"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import type { OperatingHours, DayHours } from "@/db/schema/branches";

const DAYS: { key: keyof OperatingHours; label: string }[] = [
    { key: "monday", label: "Monday" },
    { key: "tuesday", label: "Tuesday" },
    { key: "wednesday", label: "Wednesday" },
    { key: "thursday", label: "Thursday" },
    { key: "friday", label: "Friday" },
    { key: "saturday", label: "Saturday" },
    { key: "sunday", label: "Sunday" },
];

const DEFAULT_DAY: DayHours = { open: true, openTime: "09:00", closeTime: "22:00" };
const CLOSED_DAY: DayHours = { open: false, openTime: null, closeTime: null };

function emptyWeek(): OperatingHours {
    return DAYS.reduce((acc, { key }) => {
        acc[key] = { ...DEFAULT_DAY };
        return acc;
    }, {} as OperatingHours);
}

interface OperatingHoursFormProps {
    initialHours: OperatingHours | null;
    isSaving: boolean;
    onSave: (hours: OperatingHours) => void;
}

export function OperatingHoursForm({ initialHours, isSaving, onSave }: OperatingHoursFormProps) {
    const [hours, setHours] = useState<OperatingHours>(initialHours ?? emptyWeek());

    function toggleDay(day: keyof OperatingHours, open: boolean) {
        setHours((prev) => ({
            ...prev,
            [day]: open ? { ...DEFAULT_DAY } : { ...CLOSED_DAY },
        }));
    }

    function setTime(day: keyof OperatingHours, field: "openTime" | "closeTime", value: string) {
        setHours((prev) => ({
            ...prev,
            [day]: { ...prev[day], [field]: value },
        }));
    }

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                {DAYS.map(({ key, label }) => {
                    const day = hours[key];
                    return (
                        <div
                            key={key}
                            className="flex items-center gap-4 py-2 px-3 rounded-lg border border-[#ebe9e4] bg-white"
                        >
                            <div className="w-28 shrink-0">
                                <span className="text-sm font-medium text-[#1a1814]">{label}</span>
                            </div>

                            <div className="flex items-center gap-2 w-24 shrink-0">
                                <Switch checked={day.open} onCheckedChange={(checked) => toggleDay(key, checked)} />
                                <span className="text-xs text-[#8a8680]">{day.open ? "Open" : "Closed"}</span>
                            </div>

                            {day.open ? (
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="time"
                                        value={day.openTime ?? ""}
                                        onChange={(e) => setTime(key, "openTime", e.target.value)}
                                        className="w-32"
                                    />
                                    <span className="text-xs text-[#8a8680]">to</span>
                                    <Input
                                        type="time"
                                        value={day.closeTime ?? ""}
                                        onChange={(e) => setTime(key, "closeTime", e.target.value)}
                                        className="w-32"
                                    />
                                </div>
                            ) : (
                                <span className="text-xs text-[#8a8680]">Closed all day</span>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-end">
                <Button onClick={() => onSave(hours)} disabled={isSaving}>
                    {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Hours
                </Button>
            </div>
        </div>
    );
}