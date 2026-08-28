"use client";

import { Wallet, UtensilsCrossed, Bike, CheckCircle2, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { RiderRevenueSummary as RiderRevenueSummaryData } from "@/features/deliveries/actions";

interface RiderRevenueSummaryProps {
    summary: RiderRevenueSummaryData | null;
    isLoading: boolean;
}

export function RiderRevenueSummary({ summary, isLoading }: RiderRevenueSummaryProps) {
    if (isLoading && !summary) {
        return (
            <div className="rounded-xl border p-4 animate-pulse">
                <div className="h-4 w-24 bg-muted rounded mb-3" />
                <div className="h-7 w-32 bg-muted rounded" />
            </div>
        );
    }

    if (!summary) return null;

    return (
        <div className="rounded-xl border shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-emerald-50 border-b flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-900">Earnings Summary</span>
            </div>

            <div className="p-4 space-y-3">
                <div>
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold tabular-nums">
                        {formatCurrency(summary.totalRevenue)}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                            <UtensilsCrossed className="w-3.5 h-3.5 text-orange-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] text-muted-foreground">Food</p>
                            <p className="text-sm font-semibold tabular-nums truncate">
                                {formatCurrency(summary.foodRevenue)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                            <Bike className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] text-muted-foreground">Delivery</p>
                            <p className="text-sm font-semibold tabular-nums truncate">
                                {formatCurrency(summary.deliveryRevenue)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="text-xs text-muted-foreground">
                            {summary.deliveredCount} delivered
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span className="text-xs text-muted-foreground">
                            {summary.cancelledCount} cancelled
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
