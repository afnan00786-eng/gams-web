import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

export async function POST(req: NextRequest) {
    let browser;
    try {
        const { cookies } = await req.json();

        if (!cookies) {
            return NextResponse.json({ error: "Session cookies are required" }, { status: 400 });
        }

        browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        const page = await browser.newPage();

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
        await page.setExtraHTTPHeaders({ "Accept-Language": "en-IN,en;q=0.9" });
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");

        // Navigate to Schedule page (since this is likely where pending refills are)
        await page.goto(
            "https://econnect.bpcl.in/LpgNextEBooking/Schedule.aspx",
            { waitUntil: "networkidle2", timeout: 30000 }
        );

        const currentUrl = page.url();
        if (currentUrl.includes("login")) {
            return NextResponse.json({ success: false, error: "Session expired." }, { status: 401 });
        }

        // Wait a slight delay for any dynamic loads/iframes
        await new Promise(r => setTimeout(r, 2000));

        // Extract all tables initially so we can reverse-engineer them on the frontend
        const tables = await page.evaluate(() => {
            const allTables = Array.from(document.querySelectorAll("table"));
            return allTables.map(table => {
                const rows = Array.from(table.querySelectorAll("tr"));
                return rows.map(row => {
                    const cells = Array.from(row.querySelectorAll("th, td"));
                    return cells.map(cell => cell.textContent?.trim() || "");
                }).filter(row => row.length > 0 && row.some(cell => cell.length > 0)); // Drop entirely empty rows
            }).filter(dt => dt.length > 0);
        });

        // If no tables, capture what's on the page for debugging
        let debugInfo = null;
        if (tables.length === 0) {
            const screenshot = await page.screenshot({ encoding: "base64" });
            const textContent = await page.evaluate(() => document.body.innerText.substring(0, 2000));
            debugInfo = { textContent, screenshot };
        }

        return NextResponse.json({ success: true, url: currentUrl, tables, debugInfo });
    } catch (err: any) {
        console.error("[BPCL PENDING] Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    } finally {
        if (browser) await browser.close();
    }
}
