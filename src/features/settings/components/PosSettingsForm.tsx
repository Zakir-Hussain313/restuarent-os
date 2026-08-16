"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, Zap } from "lucide-react";
import { setPosAutoConfirmAction } from "@/features/settings/actions";
import { cn } from "@/lib/utils";

interface PosSettingsFormProps {
    branchId: string;
    initialValue: boolean;
}

export function PosSettingsForm({ branchId, initialValue }: PosSettingsFormProps) {
    const [value, setValue] = useState(initialValue);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    function handleChange(checked: boolean) {
        setValue(checked); // optimistic
        setError(null);
        startTransition(async () => {
            const res = await setPosAutoConfirmAction(branchId, checked);
            if (!res.success) {
                setValue(!checked); // revert
                setError(res.error);
            }
        });
    }

    return (
        <div
            className={cn(
                "border rounded-xl p-5 max-w-xl transition-colors",
                value ? "border-[#e8570e]/30 bg-[#fef3ed]/40" : "border-[#ebe9e4] bg-white"
            )}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div
                        className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                            value ? "bg-[#e8570e]/10" : "bg-[#f4f3f0]"
                        )}
                    >
                        <Zap
                            className={cn(
                                "w-4 h-4",
                                value ? "text-[#e8570e]" : "text-[#8a8680]"
                            )}
                        />
                    </div>

                    <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-[#1a1814]">
                                Auto-confirm orders on placement
                            </p>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Info className="w-3.5 h-3.5 text-[#b0ada8] hover:text-[#1a1814] transition-colors" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs text-sm">
                                        When turned on, pressing &quot;Place Order&quot; in POS will
                                        immediately confirm the order and print the kitchen ticket —
                                        skipping the usual pending step where staff manually confirms
                                        and prints separately. This saves time during busy hours, but
                                        means there&apos;s no pause to catch a mistake before the
                                        kitchen sees it. Turn this off if you&apos;d rather review
                                        each order before it&apos;s confirmed.
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <p className="text-xs text-[#8a8680]">
                            {value
                                ? "On — orders confirm and print instantly at this branch."
                                : "Off — orders wait in pending until manually confirmed."}
                        </p>
                    </div>
                </div>

                <Switch
                    checked={value}
                    onCheckedChange={handleChange}
                    disabled={isPending}
                    className="border-gray-300 shrink-0"
                />
            </div>

            {error && <p className="text-xs text-destructive mt-3">{error}</p>}
        </div>
    );
}