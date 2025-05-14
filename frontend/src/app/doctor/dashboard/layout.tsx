import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import Header from "@/features/patient/components/header";
import type { Metadata } from "next";
import { cookies } from "next/headers";

export const metadata: Metadata = {
    title: "Doctor",
    description: "Dashboard for doctors of Medimind",
};

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Persisting the sidebar state in the cookie.
    const cookieStore = await cookies();
    const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";
    return (
        // <KBar>
        <SidebarProvider defaultOpen={defaultOpen}>
            <AppSidebar />
            <SidebarInset className="overflow-hidden px-4 md:px-6 lg:px-8">
                <Header />
                {/* page main content */}
                {children}
                {/* page main content ends */}
            </SidebarInset>
        </SidebarProvider>
        // </KBar>
    );
}
