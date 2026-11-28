import { Base64 } from "js-base64";
import { afterEach, describe, expect, it, vi } from "vitest";
import { screenshotFromDataUrl } from "./screenshot";

/**
 * A PNG signature followed by an IHDR chunk is all `image-dimensions` reads,
 * so the image data and CRC can be left empty.
 */
const pngHeader = (width: number, height: number): Uint8Array => {
	const bytes = new Uint8Array(33);
	const view = new DataView(bytes.buffer);
	bytes.set(
		[
			0x89,
			0x50,
			0x4e,
			0x47,
			0x0d,
			0x0a,
			0x1a,
			0x0a,
		],
		0,
	);
	view.setUint32(8, 13);
	bytes.set(new TextEncoder().encode("IHDR"), 12);
	view.setUint32(16, width);
	view.setUint32(20, height);
	bytes.set(
		[
			8,
			6,
			0,
			0,
			0,
		],
		24,
	);
	return bytes;
};

const pngDataUrl = (width: number, height: number) =>
	`data:image/png;base64,${Base64.fromUint8Array(pngHeader(width, height))}`;

describe("screenshotFromDataUrl", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("returns the base64 payload, mime type and dimensions", () => {
		const dataUrl = pngDataUrl(640, 480);

		expect(screenshotFromDataUrl(dataUrl)).toEqual({
			data: dataUrl.slice("data:image/png;base64,".length),
			mimeType: "image/png",
			width: 640,
			height: 480,
		});
	});

	it("works without Node's Buffer, as in an extension background page", () => {
		vi.stubGlobal("Buffer", undefined);

		expect(screenshotFromDataUrl(pngDataUrl(1280, 720))).toMatchObject({
			width: 1280,
			height: 720,
		});
	});

	it("rejects a data URL that is not base64", () => {
		expect(() => screenshotFromDataUrl("data:image/png,abc")).toThrow(
			/expected a base64 image/,
		);
	});

	it("rejects data that is not a recognisable image", () => {
		expect(() =>
			screenshotFromDataUrl(`data:image/png;base64,${Base64.encode("nope")}`),
		).toThrow(/image dimensions/);
	});
});
