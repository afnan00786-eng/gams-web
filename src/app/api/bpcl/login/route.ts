import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

export async function POST(req: NextRequest) {
    let browser;
    try {
        const { userId, password, captcha, cookies } = await req.json();

        if (!userId || !password || !captcha) {
            return NextResponse.json(
                { error: "userId, password, and captcha are required" },
                { status: 400 }
            );
        }

        // Launch headless browser
        browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        const page = await browser.newPage();

        // Inject session cookies from CAPTCHA fetch
        if (cookies) {
            const cookieObjects = cookies.split(';').map((c: string) => {
                const [name, ...rest] = c.trim().split('=');
                return {
                    name: name.trim(),
                    value: rest.join('=').trim(),
                    domain: 'econnect.bpcl.in',
                    path: '/',
                    secure: true,
                    httpOnly: true,
                };
            }).filter((c: any) => c.name && c.value);

            await page.setCookie(...cookieObjects);
        }

        // Set realistic headers
        await page.setExtraHTTPHeaders({
            "Accept-Language": "en-IN,en;q=0.9",
        });
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        );

        // Navigate to login page
        await page.goto(
            "https://econnect.bpcl.in/selfservice-ext/pub/login.html",
            { waitUntil: "networkidle2", timeout: 30000 }
        );

        // Wait for form fields
        await page.waitForSelector("#principal", { timeout: 10000 });

        // Fill User ID
        await page.click("#principal", { clickCount: 3 });
        await page.type("#principal", userId, { delay: 50 });

        // Fill Password
        await page.click("#input_password", { clickCount: 3 });
        await page.type("#input_password", password, { delay: 50 });

        // Fill CAPTCHA
        await page.waitForSelector("input[name='captcha']", { timeout: 5000 });
        await page.click("input[name='captcha']", { clickCount: 3 });
        await page.type("input[name='captcha']", captcha, { delay: 50 });

        // Click Login button
        await page.click(".login-btn");

        // Wait for navigation or error
        await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 20000 }).catch(() => {});

        const currentUrl = page.url();
        const pageContent = await page.content();

        // Check for login failure indicators
        const isError =
            currentUrl.includes("login.html") &&
            (pageContent.includes("Invalid") ||
                pageContent.includes("incorrect") ||
                pageContent.includes("error") ||
                pageContent.includes("failed"));

        if (isError) {
            // Try to extract error message
            const errorText = await page.$eval(
                ".error-msg, .alert, .message, [class*='error']",
                (el) => el.textContent?.trim() ?? "Login failed"
            ).catch(() => "Invalid credentials or CAPTCHA. Please try again.");

            return NextResponse.json({ success: false, error: errorText }, { status: 401 });
        }

        // Extract session cookies for future requests
        const pageCookies = await page.cookies();
        const cookieString = pageCookies.map((c: any) => `${c.name}=${c.value}`).join("; ");

        // Try to navigate to orders/bookings page
        let ordersData: any[] = [];
        try {
            // Navigate to booking orders page (common BPCL eConnect path)
            await page.goto(
                "https://econnect.bpcl.in/selfservice-ext/secure/booking/bookingList.html",
                { waitUntil: "networkidle2", timeout: 15000 }
            );

            const ordersUrl = page.url();
            // If we got redirected back to login, session failed
            if (!ordersUrl.includes("login")) {
                ordersData = await scrapeOrdersFromPage(page);
            }
        } catch (scrapeErr) {
            console.warn("[BPCL] Could not scrape orders:", scrapeErr);
        }

        return NextResponse.json({
            success: true,
            redirectedTo: currentUrl,
            cookies: cookieString,
            orders: ordersData,
        });
    } catch (err: any) {
        console.error("[BPCL LOGIN] Error:", err);
        return NextResponse.json(
            { error: err.message || "Login failed" },
            { status: 500 }
        );
    } finally {
        if (browser) await browser.close();
    }
}

async function scrapeOrdersFromPage(page: any): Promise<any[]> {
    try {
        // Wait for any table or list of orders
        await page.waitForSelector("table, .order-list, .booking-list, tr", {
            timeout: 8000,
        });

        const orders = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll("table tr"));
            return rows.slice(1).map((row) => {
                const cells = Array.from(row.querySelectorAll("td")).map(
                    (td) => td.textContent?.trim() ?? ""
                );
                return cells;
            }).filter((row) => row.length > 0);
        });

        return orders;
    } catch {
        return [];
    }
}
