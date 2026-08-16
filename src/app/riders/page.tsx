import { getRiderDashboardDataAction } from "@/features/deliveries/actions";
import { RiderDashboard } from "@/features/deliveries/components/RiderDashboard";

export default async function RidersPage() {
    const result = await getRiderDashboardDataAction();

    if (!result.success) {
        return (
            <div className="flex items-center justify-center min-h-screen p-6">
                <p className="text-sm text-muted-foreground">{result.error}</p>
            </div>
        );
    }

    return <RiderDashboard initialData={result.data} />;
}