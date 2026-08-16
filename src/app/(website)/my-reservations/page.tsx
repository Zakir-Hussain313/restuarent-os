import { MyReservationLookup } from "@/features/reservations/components/MyReservationLookup";

export default function MyReservationsPage() {
    return (
        <div className="min-h-screen bg-[#faf9f7] pt-16">
            <div className="bg-[#1a1815] py-10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#e8570e] mb-2">
                        My Reservations
                    </p>
                    <h1 className="text-3xl font-bold text-white">Find your booking</h1>
                    <p className="text-white/50 text-sm mt-1">
                        Enter the phone number and code you received when booking.
                    </p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
                <MyReservationLookup />
            </div>
        </div>
    );
}