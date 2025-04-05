import { z } from "zod";
import { publicProcedure, router } from "../helpers/trpc";
import { container } from "src/helpers/container";
import { BrowserDriverOutputPort } from "@mcp-browser-kit/core-server";
import type { DrivenBrowserDriver } from "@mcp-browser-kit/driven-browser-driver/helpers/driven-browser-driver";

export const defer = router({
	onMessage: publicProcedure.subscription(async function* (opts) {
		const { signal } = opts;

		const drivenBrowserDriver = container.get<BrowserDriverOutputPort>(
			BrowserDriverOutputPort,
		) as DrivenBrowserDriver;
		let messageTaskNew =
			drivenBrowserDriver.browserRpcClient.emitter.once("defer");

		let stopped = false;
		if (signal) {
			signal.onabort = () => {
				messageTaskNew.off();
				stopped = true;
			};
		}
		while (!stopped) {
			// yield await messageTask;
			yield await messageTaskNew;
			messageTaskNew =
				drivenBrowserDriver.browserRpcClient.emitter.once("defer");
		}
	}),
	resolve: publicProcedure
		.input(
			z.object({
				id: z.string(),
				isOk: z.boolean(),
				result: z.any(),
			}),
		)
		.mutation(async (opts) => {
			const { id, isOk, result } = opts.input;

			const drivenBrowserDriver = container.get<BrowserDriverOutputPort>(
				BrowserDriverOutputPort,
			) as DrivenBrowserDriver;

			drivenBrowserDriver.browserRpcClient.emitter.emit("resolve", {
				id,
				isOk,
				result,
			});
		}),
});
