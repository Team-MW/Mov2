import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  const url = "http://localhost:4322/";
  console.log("Navigating to", url);
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Take unscrolled screenshot
  await page.screenshot({ path: "C:/Users/Mommy Jayce/.gemini/antigravity/brain/b8c905b2-6e52-467f-921a-242f845da1e9/unscrolled.png" });
  console.log("Unscrolled captured");

  // Scroll down
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForTimeout(1000);

  // Take scrolled screenshot
  await page.screenshot({ path: "C:/Users/Mommy Jayce/.gemini/antigravity/brain/b8c905b2-6e52-467f-921a-242f845da1e9/scrolled.png" });
  console.log("Scrolled captured");

  await browser.close();
}

main().catch(console.error);
