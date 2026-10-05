import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

// Fetches the BPCL CAPTCHA image and returns it as base64 along with session cookies
export async function GET() {
    try {
        // First hit the login page to get session cookies
        const loginPageRes = await fetch(
            "https://econnect.bpcl.in/selfservice-ext/pub/login.html",
            {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-IN,en;q=0.5",
                },
                redirect: "follow",
            }
        );

        // Extract cookies from login page
        const setCookieHeader = loginPageRes.headers.get("set-cookie");
        const cookieString = setCookieHeader
            ? setCookieHeader.split(",").map((c) => c.split(";")[0].trim()).join("; ")
            : "";

        // Now fetch the actual CAPTCHA image
        const captchaRes = await fetch(
            "https://econnect.bpcl.in/idp/pub/login/captcha.html",
            {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                    Referer: "https://econnect.bpcl.in/selfservice-ext/pub/login.html",
                    Cookie: cookieString,
                    Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                },
            }
        );

        if (!captchaRes.ok) {
            return NextResponse.json(
                { error: `CAPTCHA fetch failed: ${captchaRes.status}` },
                { status: 502 }
            );
        }

        const contentType = captchaRes.headers.get("content-type") || "image/png";
        const captchaBuffer = await captchaRes.arrayBuffer();
        const base64 = Buffer.from(captchaBuffer).toString("base64");

        // Get all new cookies from captcha response too
        const captchaCookies = captchaRes.headers.get("set-cookie");
        const allCookies = [cookieString, captchaCookies]
            .filter(Boolean)
            .join("; ");

        return NextResponse.json(
            {
                captchaImage: `data:${contentType};base64,${base64}`,
                cookies: allCookies,
            },
            {
                headers: {
                    "Cache-Control": "no-store, no-cache, must-revalidate",
                    "Pragma": "no-cache",
                },
            }
        );
    } catch (err) {
        console.error("[BPCL CAPTCHA] Error:", err);
        return NextResponse.json(
            { error: "Failed to fetch CAPTCHA" },
            { status: 500 }
        );
    }
}
