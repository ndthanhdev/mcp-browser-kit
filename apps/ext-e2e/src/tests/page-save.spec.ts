import { unzipSync } from "fflate";
import { expect, test } from "../fixtures/ext-test";

/**
 * The value of a page save is that the artifact still renders once the network
 * is gone. These tests therefore assert on the saved bytes themselves rather
 * than on the tool merely reporting success.
 */
test.describe("Page save", () => {
	test.beforeEach(async ({ mcpClientPage }) => {
		test.setTimeout(60000);
		await mcpClientPage.startServer();
		await mcpClientPage.connect();
		await mcpClientPage.waitForBrowsers();
	});

	test("savePage defaults to zip and writes index.html plus assets", async ({
		testAppPage,
		mcpClientPage,
	}) => {
		await testAppPage.navigateToFormTest();
		const tab = await mcpClientPage.waitForTabByUrl(
			testAppPage.page,
			"form-test",
		);

		const downloadPromise = testAppPage.page.waitForEvent("download", {
			timeout: 30000,
		});

		const result = await mcpClientPage.callTool("savePage", {
			browserId: tab.browserId,
			windowId: tab.windowId,
			tabId: tab.tabId,
		});

		expect(result.structuredContent?.ok).toBe(true);
		const value = result.structuredContent?.value;
		expect(value?.format).toBe("zip");
		expect(value?.filename.endsWith(".zip")).toBe(true);
		expect(value?.bytes).toBeGreaterThan(0);

		const download = await downloadPromise;
		expect(download.suggestedFilename()).toBe(value?.filename);

		const path = await download.path();
		expect(path).toBeTruthy();

		const { readFile } = await import("node:fs/promises");
		const archive = unzipSync(new Uint8Array(await readFile(path as string)));

		// index.html is mandatory; every other entry belongs under assets/.
		expect(Object.keys(archive)).toContain("index.html");
		for (const entry of Object.keys(archive)) {
			if (entry === "index.html") {
				continue;
			}
			expect(entry.startsWith("assets/")).toBe(true);
		}

		const html = new TextDecoder().decode(archive["index.html"]);
		expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
		// Scripts are always stripped: they are inert offline and bloat the file.
		expect(html).not.toContain("<script");
	});

	test("savePage with format html inlines resources into one file", async ({
		testAppPage,
		mcpClientPage,
	}) => {
		await testAppPage.navigateToFormTest();
		const tab = await mcpClientPage.waitForTabByUrl(
			testAppPage.page,
			"form-test",
		);

		const downloadPromise = testAppPage.page.waitForEvent("download", {
			timeout: 30000,
		});

		const result = await mcpClientPage.callTool("savePage", {
			browserId: tab.browserId,
			windowId: tab.windowId,
			tabId: tab.tabId,
			format: "html",
		});

		expect(result.structuredContent?.ok).toBe(true);
		const value = result.structuredContent?.value;
		expect(value?.format).toBe("html");
		expect(value?.filename.endsWith(".html")).toBe(true);

		const download = await downloadPromise;
		const path = await download.path();
		const { readFile } = await import("node:fs/promises");
		const html = await readFile(path as string, "utf8");

		expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
		expect(html).not.toContain("<script");
		// No linked stylesheet may survive: they are folded into inline <style>.
		expect(html).not.toMatch(/<link[^>]+rel=["']?stylesheet/i);
		// The artifact records where it came from.
		expect(html).toContain("Saved by MCP Browser Kit");
	});

	test("saved page renders with no external requests", async ({
		testAppPage,
		mcpClientPage,
		context,
	}) => {
		await testAppPage.navigateToFormTest();
		const tab = await mcpClientPage.waitForTabByUrl(
			testAppPage.page,
			"form-test",
		);

		const downloadPromise = testAppPage.page.waitForEvent("download", {
			timeout: 30000,
		});
		await mcpClientPage.callTool("savePage", {
			browserId: tab.browserId,
			windowId: tab.windowId,
			tabId: tab.tabId,
			format: "html",
		});
		const download = await downloadPromise;
		const path = await download.path();

		// Reopen the artifact with every non-local request blocked. Anything the
		// page still reaches for was not embedded properly.
		const offlinePage = await context.newPage();
		const attempted: string[] = [];
		await offlinePage.route("**/*", (route) => {
			const url = route.request().url();
			if (/^(file|data|blob):/.test(url)) {
				return route.continue();
			}
			attempted.push(url);
			return route.abort();
		});

		await offlinePage
			.goto(`file://${path}`, {
				waitUntil: "load",
				timeout: 30000,
			})
			.catch(() => undefined);
		await offlinePage.waitForTimeout(1500);

		expect(attempted).toEqual([]);

		// Zero blocked requests is necessary but not sufficient: an unembedded
		// protocol-relative URL (`//host/x.png`) resolves against file:// and
		// fails silently without ever hitting the network. Assert the images
		// actually decoded.
		const images = await offlinePage.evaluate(() => {
			const all = [
				...document.images,
			];
			return {
				total: all.length,
				loaded: all.filter((image) => image.complete && image.naturalWidth > 0)
					.length,
			};
		});
		expect(images.loaded).toBe(images.total);

		await offlinePage.close();
	});
});
