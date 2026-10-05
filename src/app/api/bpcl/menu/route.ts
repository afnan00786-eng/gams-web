import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

export async function POST(req: NextRequest) {
    let browser;
    try {
        const { cookies } = await req.json();

        if (!cookies) {
            return NextResponse.json(
                { error: "Session cookies are required" },
                { status: 400 }
            );
        }

        // Launch headless browser
        browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        const page = await browser.newPage();

        // Inject session cookies
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

        // Set realistic headers
        await page.setExtraHTTPHeaders({
            "Accept-Language": "en-IN,en;q=0.9",
        });
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        );

        // Navigate to MainMenu page
        await page.goto(
            "https://econnect.bpcl.in/LpgNextEBooking/MainMenu.aspx?provider=Federation",
            { waitUntil: "networkidle2", timeout: 30000 }
        );

        // Check if we got redirected to login (session invalid)
        const currentUrl = page.url();
        if (currentUrl.includes("login")) {
            return NextResponse.json({ success: false, error: "Session expired. Please login again." }, { status: 401 });
        }

        // Extract options from the page
        const options = await page.evaluate(() => {
            const results: { title: string; href: string; onclick: string }[] = [];
            
            // Extract links
            const links = document.querySelectorAll("a");
            links.forEach((a) => {
                const title = a.innerText.trim() || a.getAttribute("title")?.trim() || "";
                const href = a.getAttribute("href") || "";
                const onclick = a.getAttribute("onclick") || "";
                if (title && title.length > 2 && title.length < 60 && !title.toLowerCase().includes("logout")) {
                    results.push({ title, href, onclick });
                }
            });

            // Extract buttons or divs that look like cards/buttons
            const buttons = document.querySelectorAll("button, .card, .btn, input[type='button'], input[type='submit']");
            buttons.forEach((b) => {
                let title = "";
                if (b.tagName.toLowerCase() === 'input') {
                    title = b.getAttribute("value")?.trim() || "";
                } else {
                    title = (b as HTMLElement).innerText.trim();
                }
                const onclick = b.getAttribute("onclick") || "";
                if (title && title.length > 2 && title.length < 60 && !title.toLowerCase().includes("logout")) {
                    results.push({ title, href: "", onclick });
                }
            });

            // Deduplicate by title
            const unique = [];
            const seenTitles = new Set();
            for (const r of results) {
                // Avoid generic single words if possible, or just keep them but avoid duplicate identical text
                if (!seenTitles.has(r.title)) {
                    unique.push(r);
                    seenTitles.add(r.title);
                }
            }
            return unique;
        });

        return NextResponse.json({
            success: true,
            options,
            currentUrl
        });
    } catch (err: any) {
        console.error("[BPCL MENU] Error:", err);
        return NextResponse.json(
            { error: err.message || "Failed to fetch menu" },
            { status: 500 }
        );
    } finally {
        if (browser) await browser.close();
    }
}
