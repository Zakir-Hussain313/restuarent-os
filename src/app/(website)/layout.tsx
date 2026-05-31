import { WebsiteNavbar } from "@/features/website/components/layout/WebsiteNavbar";
import { WebsiteFooter } from "@/features/website/components/layout/WebsiteFooter";

export default function WebsiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f7]">
      <WebsiteNavbar />
      <main className="flex-1">{children}</main>
      <WebsiteFooter />
    </div>
  );
}