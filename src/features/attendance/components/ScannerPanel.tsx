"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Eye, EyeOff, Copy, Fingerprint } from "lucide-react";
import { useAttendanceFilters } from "./AttendanceFilters";
import { useAlertModal } from "@/components/providers/AlertModalProvider";
import { useBranchChannel } from "@/lib/realtime/useBranchChannel";
import {
    getBranchScannerDevicesAction,
    getScannerEnrollmentsAction,
    unenrollStaffBiometricAction,
    deleteDeviceAction,
} from "@/features/devices/actions";
import {
    registerFingerprintScannerAction,
    enrollStaffBiometricAction,
} from "@/features/attendance/biometricActions";
import { getStaffListAction } from "@/features/staff/actions";

// ── Register scanner dialog ─────────────────────────────────────────────

function RegisterScannerDialog({ branchId }: { branchId: string | undefined }) {
    const queryClient = useQueryClient();
    const { showAlert } = useAlertModal();
    const [open, setOpen] = useState(false);
    const [label, setLabel] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [createdSecret, setCreatedSecret] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        if (!label.trim()) {
            setError("Give the scanner a label (e.g. its location).");
            return;
        }
        setIsLoading(true);
        try {
            const result = await registerFingerprintScannerAction(label.trim(), branchId);
            if (result.error !== undefined) {
                setError(result.error);
                return;
            }
            setCreatedSecret(result.syncSecret);
            queryClient.invalidateQueries({ queryKey: ["branch-scanners", branchId] });
            queryClient.invalidateQueries({ queryKey: ["branch-attendance-method", branchId] });
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    function handleOpenChange(next: boolean) {
        setOpen(next);
        if (!next) {
            setLabel("");
            setError(null);
            setCreatedSecret(null);
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger
                render={
                    <Button size="sm">
                        <Plus className="w-4 h-4 mr-1.5" />
                        Register scanner
                    </Button>
                }
            />
            <DialogContent className="sm:max-w-md">
                {createdSecret ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Scanner registered</DialogTitle>
                            <DialogDescription>
                                Enter this sync secret into the local sync script&apos;s config for this scanner.
                                You can view it again anytime from the scanner list.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
                            <p className="text-xs font-mono break-all text-foreground">{createdSecret}</p>
                        </div>
                        <DialogFooter>
                             <Button
                                type="button"
                                className="w-full"
                                onClick={() => {
                                    navigator.clipboard.writeText(createdSecret ?? "");
                                    showAlert("Sync secret copied to clipboard.");
                                }}
                            >
                                <Copy className="w-3.5 h-3.5 mr-1.5" />
                                Copy secret
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>Register a fingerprint scanner</DialogTitle>
                            <DialogDescription>
                                This replaces the browser device-approval flow for this branch.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            {error && (
                                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="scanner-label">Label</Label>
                                <Input
                                    id="scanner-label"
                                    placeholder="e.g. Front counter scanner"
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                    disabled={isLoading}
                                    required
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? "Registering..." : "Register scanner"}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}

// ── Enroll staff dialog ──────────────────────────────────────────────────

function EnrollStaffDialog({
    branchDeviceId,
    branchId,
}: {
    branchDeviceId: string;
    branchId: string;
}) {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [staffId, setStaffId] = useState("");
    const [externalUserId, setExternalUserId] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const { data: staffData } = useQuery({
        queryKey: ["staff-list-for-enrollment"],
        queryFn: async () => {
            const res = await getStaffListAction();
            if (res.error) throw new Error(res.error);
            return res.staff;
        },
        enabled: open,
    });

    // getStaffListAction doesn't branch-filter for SUPER_ADMIN, so filter here.
    const eligibleStaff = (staffData ?? []).filter((s) => s.branchId === branchId);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        if (!staffId) {
            setError("Select a staff member.");
            return;
        }
        if (!externalUserId.trim()) {
            setError("Enter the fingerprint ID from the scanner's own screen/software.");
            return;
        }
        setIsLoading(true);
        try {
            const result = await enrollStaffBiometricAction(staffId, branchDeviceId, externalUserId.trim());
            if (result.error) {
                setError(result.error);
                return;
            }
            queryClient.invalidateQueries({ queryKey: ["scanner-enrollments", branchDeviceId] });
            queryClient.invalidateQueries({ queryKey: ["branch-scanners", branchId] });
            setOpen(false);
            setStaffId("");
            setExternalUserId("");
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) {
                    setStaffId("");
                    setExternalUserId("");
                    setError(null);
                }
            }}
        >
            <DialogTrigger
                render={
                    <Button size="sm" variant="outline">
                        <Fingerprint className="w-3.5 h-3.5 mr-1.5" />
                        Enroll staff
                    </Button>
                }
            />
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Enroll a fingerprint</DialogTitle>
                        <DialogDescription>
                            Enroll the fingerprint on the scanner itself first, then map its assigned ID to a
                            staff member here.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {error && (
                            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>Staff member</Label>
                            <Select value={staffId} onValueChange={(v) => setStaffId(v ?? "")} disabled={isLoading}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select staff member">
                                        {(value: string) => {
                                            const s = eligibleStaff.find((x) => x.id === value);
                                            return s ? `${s.firstName} ${s.lastName}` : "Select staff member";
                                        }}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {eligibleStaff.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.firstName} {s.lastName} ({s.role})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="external-user-id">Scanner fingerprint ID</Label>
                            <Input
                                id="external-user-id"
                                value={externalUserId}
                                onChange={(e) => setExternalUserId(e.target.value)}
                                disabled={isLoading}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Enrolling..." : "Enroll"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ── One scanner card: enrollments list, secret reveal, delete ──────────────

type BranchScannerDevice = NonNullable <
    Awaited<ReturnType<typeof getBranchScannerDevicesAction>>["data"]
>[number];

function ScannerCard({ device, branchId }: { device: BranchScannerDevice; branchId: string }) {
    const queryClient = useQueryClient();
    const { showAlert, showConfirm } = useAlertModal();
    const [showSecret, setShowSecret] = useState(false);

    const enrollmentsKey = useMemo(() => ["scanner-enrollments", device.id], [device.id]);
    const { data: enrollments } = useQuery({
        queryKey: enrollmentsKey,
        queryFn: async () => {
            const res = await getScannerEnrollmentsAction(device.id);
            if (res.error) throw new Error(res.error);
            return res.data;
        },
    });

    const unenrollMutation = useMutation({
        mutationFn: async (enrollmentId: string) => {
            const res = await unenrollStaffBiometricAction(enrollmentId);
            if (res.error) throw new Error(res.error);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: enrollmentsKey }),
        onError: (err) => showAlert(`Failed to remove enrollment: ${err.message}`, "Error"),
    });

    const deleteScannerMutation = useMutation({
        mutationFn: async () => {
            const res = await deleteDeviceAction(device.id);
            if (res.error) throw new Error(res.error);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["branch-scanners", branchId] });
            queryClient.invalidateQueries({ queryKey: ["branch-attendance-method", branchId] });
        },
        onError: (err) => showAlert(`Failed to delete scanner: ${err.message}`, "Error"),
    });

    async function handleDeleteScanner() {
        const confirmed = await showConfirm(
            "This will remove the scanner and all its fingerprint enrollments. Staff will need to be re-enrolled on a new scanner.",
            { title: "Delete scanner?" }
        );
        if (confirmed) deleteScannerMutation.mutate();
    }

    async function handleRemoveEnrollment(enrollmentId: string) {
        const confirmed = await showConfirm(
            "This staff member will no longer be able to clock in/out on this scanner.",
            { title: "Remove enrollment?" }
        );
        if (confirmed) unenrollMutation.mutate(enrollmentId);
    }

    return (
        <div className="rounded-xl border border-border bg-white px-4 py-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{device.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {enrollments?.length ?? 0} enrolled
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <EnrollStaffDialog branchDeviceId={device.id} branchId={branchId} />
                    <button
                        onClick={handleDeleteScanner}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Delete scanner"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                <p className="text-xs font-mono flex-1 truncate text-muted-foreground">
                    {showSecret ? device.deviceToken : "••••••••••••••••••••••••••••••••"}
                </p>
                <button
                    type="button"
                    onClick={() => setShowSecret((s) => !s)}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                    aria-label={showSecret ? "Hide secret" : "Show secret"}
                >
                    {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        navigator.clipboard.writeText(device.deviceToken ?? "");
                        showAlert("Sync secret copied to clipboard.");
                    }}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                    aria-label="Copy secret"
                >
                    <Copy className="w-3.5 h-3.5" />
                </button>
            </div>

            {enrollments && enrollments.length > 0 && (
                <div className="space-y-1.5 pt-1">
                    {enrollments.map((en) => (
                        <div
                            key={en.id}
                            className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-primary-light/40"
                        >
                            <p className="text-xs text-foreground truncate">
                                {en.staffName}{" "}
                                <span className="text-muted-foreground">· ID {en.externalUserId}</span>
                            </p>
                            <button
                                onClick={() => handleRemoveEnrollment(en.id)}
                                className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                aria-label="Remove enrollment"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Main panel ───────────────────────────────────────────────────────────

export function ScannerPanel() {
    const { branchId } = useAttendanceFilters();
    const queryClient = useQueryClient();
    const queryKey = useMemo(() => ["branch-scanners", branchId], [branchId]);

    const { data, isLoading } = useQuery({
        queryKey,
        queryFn: async () => {
            const res = await getBranchScannerDevicesAction(branchId);
            if (res.error) throw new Error(res.error);
            return res.data;
        },
    });

    const onRealtimeEvent = useCallback(() => {
        queryClient.invalidateQueries({ queryKey });
    }, [queryClient, queryKey]);

    useBranchChannel(branchId, "attendance", onRealtimeEvent);

    if (isLoading) {
        return <div className="text-sm text-muted-foreground">Loading scanners…</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <RegisterScannerDialog branchId={branchId} />
            </div>

            {!data || data.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                    No scanner registered for this branch yet.
                </div>
            ) : (
                <div className="space-y-3">
                    {data.map((device) => (
                        <ScannerCard key={device.id} device={device} branchId={device.branchId} />
                    ))}
                </div>
            )}
        </div>
    );
}