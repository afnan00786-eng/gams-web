"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { DashboardHeader } from "@/components/layout/DashboardHeader";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isAuthenticated } = useAuthStore();
    const router = useRouter();

    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (hydrated && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, router, hydrated]);

    if (!hydrated) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            <DashboardHeader />
            <main className="flex-1 w-full max-w-none p-4 md:px-6 lg:px-8 py-8 transition-all duration-500">
                {children}
            </main>
        </div>
    );
}
