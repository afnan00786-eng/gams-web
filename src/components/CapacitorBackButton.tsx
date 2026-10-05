"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { App } from "@capacitor/app";

export function CapacitorBackButton() {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // This listener handles the hardware back button on Android devices
        const backButtonListener = App.addListener("backButton", ({ canGoBack }) => {
            // Determine pages where the app should exit instead of going back
            const isRootPage = pathname === "/" || pathname === "/login" || pathname === "/dashboard";

            if (isRootPage) {
                // Safe exit
                App.exitApp();
            } else if (canGoBack) {
                // Normal Next.js router back navigation
                router.back();
            } else {
                // Fallback exit if no history is available
                App.exitApp();
            }
        });

        // Cleanup the listener on unmount
        return () => {
            backButtonListener.then((listener) => listener.remove());
        };
    }, [router, pathname]);

    return null; // This component doesn't render any UI
}
