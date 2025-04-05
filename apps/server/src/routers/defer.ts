import { ExtensionDriverOutputPort } from "@mcp-browser-kit/core-server";
import type { DrivenExtensionDriver } from "@mcp-browser-kit/driven-extension-driver/helpers/driven-extension-driver";
import { container } from "src/helpers/container";
import { z } from "zod";
import { publicProcedure, router } from "../helpers/trpc";

export const defer = router({
	onMessage: publicProcedure.subscription(async function* (opts) {
		const { signal } = opts;

		const drivenExtensionDriver = container.get<ExtensionDriverOutputPort>(
			ExtensionDriverOutputPort,
		) as DrivenExtensionDriver;
		let messageTaskNew =
			drivenExtensionDriver.extensionRpcClient.emitter.once("defer");

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
				drivenExtensionDriver.extensionRpcClient.emitter.once("defer");
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

			const drivenExtensionDriver = container.get<ExtensionDriverOutputPort>(
				ExtensionDriverOutputPort,
			) as DrivenExtensionDriver;

			drivenExtensionDriver.extensionRpcClient.emitter.emit("resolve", {
				id,
				isOk,
				result,
			});
		}),
});
