#!/usr/bin/env node
// Renders a PowerMD deck on https://powermd.atom-forge.eu/render with headless Chrome,
// prints the layout issues and saves one PNG per slide.
//
// Usage: node render-check.mjs <deck.md> [--out <dir>] [--no-images] [--json]
// Exit code: 0 = no errors (warnings allowed), 1 = errors found, 2 = script failure.

import { readFile, mkdir, rm, access } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import puppeteer from "puppeteer-core";

const RENDER_URL = "https://powermd.atom-forge.eu/render";
const CHROME =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function parseArgs(argv) {
  const opts = { file: null, out: null, images: true, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") opts.out = argv[++i];
    else if (a === "--no-images") opts.images = false;
    else if (a === "--json") opts.json = true;
    else if (a === "-h" || a === "--help") opts.help = true;
    else opts.file = a;
  }
  return opts;
}

async function waitForFile(file, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await access(file);
      await access(file + ".crdownload").then(
        () => { throw new Error("partial"); },
        () => {}
      );
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  throw new Error(`timed out waiting for ${path.basename(file)}`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.file) {
    console.log("Usage: node render-check.mjs <deck.md> [--out <dir>] [--no-images] [--json]");
    process.exit(opts.help ? 0 : 2);
  }

  const file = path.resolve(opts.file);
  const markdown = await readFile(file, "utf8");
  const outDir = path.resolve(
    opts.out ?? path.join(path.dirname(file), "render-out", path.basename(file, path.extname(file)))
  );

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    defaultViewport: { width: 1600, height: 1200 },
  });

  try {
    const page = await browser.newPage();
    await page.goto(RENDER_URL, { waitUntil: "networkidle0" });
    await page.waitForSelector("textarea");

    // Fill the textarea the way a user would, so the page's input handler runs.
    await page.evaluate((md) => {
      const ta = document.querySelector("textarea");
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(ta, md);
      ta.dispatchEvent(new Event("input", { bubbles: true }));
      window.powermdRender = { status: "pending" };
      [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Render").click();
    }, markdown);

    await page.waitForFunction(() => window.powermdRender?.status === "ready", { timeout: 120000 });
    const result = await page.evaluate(() => window.powermdRender);

    if (opts.images) {
      await rm(outDir, { recursive: true, force: true });
      await mkdir(outDir, { recursive: true });
      const cdp = await page.createCDPSession();
      await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: outDir });
      await page.evaluate(() =>
        [...document.querySelectorAll("button")].find((b) => b.textContent.includes("ZIP")).click()
      );
      const zip = path.join(outDir, "slides.zip");
      await waitForFile(zip, 180000);
      // The ZIP holds slide-NN.png plus issues.json and issues.txt.
      execFileSync("unzip", ["-o", "-q", zip, "-d", outDir]);
      await rm(zip);
    }

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      const warnings = result.issues.filter((i) => i.severity === "warning").length;
      const errors = result.issues.length - warnings;
      console.log(`${path.basename(file)}: ${result.slides} slides, ${errors} error(s), ${warnings} warning(s)`);
      for (const i of result.issues) {
        const where = `slide ${i.slide}${i.panel ? `, panel ${i.panel}` : ""}`;
        console.log(`  ${i.severity === "warning" ? "warning" : "error  "} ${where}: ${i.message}`);
      }
      if (opts.images) console.log(`  images: ${outDir}`);
    }
    process.exitCode = result.issues.some((i) => i.severity !== "warning") ? 1 : 0;
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(`render-check: ${err.message}`);
  process.exit(2);
});
