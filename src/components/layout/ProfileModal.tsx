"use client";

import { useRef, useState , useEffect } from "react";
import { Upload, X } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/useAuthStore";
import { updateStaffAction } from "@/features/staff/actions";
import { updateAdminAction } from "@/features/admins/actions";
import { getBranchesAction } from "@/features/staff/actions";
import { uploadEntityImage } from "@/features/uploads/actions";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const ROLE_LABELS: Record<string, string> = {
    SUPER_ADMIN: "Super Admin",
    ADMIN: "Admin",
    STAFF: "Staff",
    RIDER: "Rider",
};

const STATUS_STYLES: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700",
    inactive: "bg-[#f4f3f0] text-[#8a8680]",
    on_leave: "bg-amber-50 text-amber-700",
};

interface ProfileModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
    const currentStaff = useAuthStore((s) => s.currentStaff);
    const setCurrentStaff = useAuthStore((s) => s.login);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [branchName, setBranchName] = useState<string | null>(null);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // React-endorsed "adjust state when a prop changes" pattern instead of
    // an effect: runs during render, not after commit, so no cascading
    // render warning. Bails out after the single re-render it triggers.
    const [prevOpen, setPrevOpen] = useState(open);
    if (open !== prevOpen) {
        setPrevOpen(open);

        if (open && currentStaff) {
            setFirstName(currentStaff.firstName);
            setLastName(currentStaff.lastName);
            setEmail(currentStaff.email);
            setPhone(currentStaff.phone ?? "");
            setPreviewUrl(currentStaff.image ?? null);
            setSelectedFile(null);
            setError(null);
            setSuccess(false);
            setBranchName(null);
        }
    }

    useEffect(() => {
        if (!open || !currentStaff?.branchId) return;

        let cancelled = false;
        getBranchesAction().then(({ branches }) => {
            if (cancelled) return;
            const match = branches?.find((b) => b.id === currentStaff.branchId);
            setBranchName(match?.name ?? null);
        });

        return () => {
            cancelled = true;
        };
    }, [open, currentStaff?.branchId]);

    if (!currentStaff) return null;

    const initials = `${currentStaff.firstName?.[0] ?? ""}${currentStaff.lastName?.[0] ?? ""}`.toUpperCase();
    const isAdminRole = currentStaff.role === "ADMIN" || currentStaff.role === "SUPER_ADMIN";

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!ALLOWED_TYPES.includes(file.type)) {
            setError("Only JPEG, PNG, or WebP images are allowed.");
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            setError("Image must be under 5MB.");
            return;
        }

        setError(null);
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    }

    function clearSelectedImage() {
        setSelectedFile(null);
        setPreviewUrl(currentStaff!.image ?? null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    async function handleSave() {
        setError(null);
        setSuccess(false);
        setIsLoading(true);

        try {
            let imageUrl: string | undefined;
            if (selectedFile) {
                const fd = new FormData();
                fd.set("entityType", "staff");
                fd.set("entityId", currentStaff!.id);
                fd.set("file", selectedFile);

                const uploadResult = await uploadEntityImage(fd);
                if (uploadResult.error || !uploadResult.url) {
                    throw new Error(uploadResult.error ?? "Image upload failed.");
                }
                imageUrl = uploadResult.url;
            }

            const payload = {
                firstName,
                lastName,
                email,
                phone: phone || undefined,
                image: imageUrl,
            };

            const result = isAdminRole
                ? await updateAdminAction(currentStaff!.id, payload)
                : await updateStaffAction(currentStaff!.id, payload);

            if (result.error) {
                setError(result.error);
                return;
            }

            const updated = isAdminRole
                ? (result as { admin?: typeof currentStaff }).admin
                : (result as { staff?: typeof currentStaff }).staff;

            if (updated) {
                setCurrentStaff(updated);
            }

            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>My Profile</DialogTitle>
                </DialogHeader>

                {error && (
                    <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
                        Profile updated successfully.
                    </div>
                )}

                <div className="flex flex-col items-center gap-3 pt-2 pb-2">
                    <div className="h-24 w-24 rounded-full overflow-hidden bg-[#fef3ed] border border-[#fde0cc] flex items-center justify-center shrink-0">
                        {previewUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={previewUrl}
                                alt="Preview"
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <span className="text-[#e8570e] text-2xl font-bold">{initials}</span>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isLoading}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="w-3.5 h-3.5 mr-1.5" />
                            {previewUrl ? "Change photo" : "Upload photo"}
                        </Button>
                        {selectedFile && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={isLoading}
                                onClick={clearSelectedImage}
                            >
                                <X className="w-3.5 h-3.5" />
                            </Button>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#fef3ed] text-[#e8570e]">
                            {ROLE_LABELS[currentStaff.role] ?? currentStaff.role}
                        </span>
                        <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_STYLES[currentStaff.status] ?? ""
                                }`}
                        >
                            {currentStaff.status?.replace("_", " ")}
                        </span>
                        {branchName && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#f4f3f0] text-[#4a4744]">
                                {branchName}
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] text-[#b0ada8]">
                        Role, status, and branch are managed by an administrator.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <Label htmlFor="profile-firstName">First name</Label>
                        <Input
                            id="profile-firstName"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="profile-lastName">Last name</Label>
                        <Input
                            id="profile-lastName"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="profile-email">Email</Label>
                    <Input
                        id="profile-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="profile-phone">Phone</Label>
                    <Input
                        id="profile-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={isLoading}
                    />
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        className="w-full bg-[#e8570e] hover:bg-[#d44f0c] text-white"
                        disabled={isLoading}
                        onClick={handleSave}
                    >
                        {isLoading ? "Saving..." : "Save changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}