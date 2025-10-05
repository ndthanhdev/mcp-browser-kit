import { ExtensionChannelProviderOutputPort } from "@mcp-browser-kit/core-server/output-ports/extension-channel-provider";
import type { ServerDrivenExtensionChannelProvider } from "@mcp-browser-kit/server-driven-extension-channel-provider";
import type { DeferMessage, ResolveMessage } from "@mcp-browser-kit/utils";
import { createPrefixId } from "@mcp-browser-kit/utils";
import { container } from "src/helpers/container";
import { z } from "zod";
import { publicProcedure, router } from "../helpers/trpc";

// Create channel ID prefix utility
const channelId = createPrefixId("chn");

// Custom channel ID validation schema
const channelIdSchema = z.string().refine((val) => channelId.isValid(val), {
	message: "Invalid channel ID format",
});

export const defer = router({
	onMessage: publicProcedure
		.input(
			z.object({
				channelId: channelIdSchema,
			}),
		)
		.subscription(async function* (opts) {
			const { signal, input } = opts;
			const { channelId } = input;

			const extensionChannelProvider =
				container.get<ExtensionChannelProviderOutputPort>(
					ExtensionChannelProviderOutputPort,
				) as ServerDrivenExtensionChannelProvider;

			const channel = extensionChannelProvider.openChannel(channelId);

			let defer = Promise.withResolvers<DeferMessage>();

			const unsubscribe = channel.incoming.on(
				"defer",
				(message: DeferMessage) => {
					defer.resolve(message);
				},
			);

			let stopped = false;
			if (signal) {
				signal.onabort = () => {
					unsubscribe();
					stopped = true;
				};
			}
			while (!stopped) {
				yield await defer.promise;
				defer = Promise.withResolvers<DeferMessage>();
			}
		}),
	resolve: publicProcedure
		.input(
			z.object({
				id: z.string(),
				isOk: z.boolean(),
				result: z.any(),
				channelId: channelIdSchema,
			}),
		)
		.mutation(async (opts) => {
			const { id, isOk, result, channelId } = opts.input;

			const extensionChannelProvider =
				container.get<ExtensionChannelProviderOutputPort>(
					ExtensionChannelProviderOutputPort,
				) as ServerDrivenExtensionChannelProvider;

			const channel = extensionChannelProvider.getMessageChannel(channelId);

			const resolveMessage: ResolveMessage = {
				id,
				isOk,
				result,
			};

			channel.outgoing.emit("resolve", resolveMessage);
		}),
});
