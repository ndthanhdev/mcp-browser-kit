import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-server";
import { ExtensionChannelProviderOutputPort } from "@mcp-browser-kit/core-server/output-ports/extension-channel-provider";
import type { DeferMessage, ResolveMessage } from "@mcp-browser-kit/core-utils";
import { createPrefixId } from "@mcp-browser-kit/core-utils";
import type { Container } from "inversify";
import { z } from "zod";
import {
	publicProcedure,
	router,
	type ServerDrivenTrpcChannelProvider,
} from "../services/server-driven-trpc-channel-provider";

// Create channel ID prefix utility
const channelId = createPrefixId("channel");

// Custom channel ID validation schema
const channelIdSchema = z.string().refine((val) => channelId.isValid(val), {
	message: "Invalid channel ID format",
});

// Create a factory function that accepts the container
export const createDeferRouter = (container: Container) => {
	// Create logger instance
	const logger = container
		.get<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
		.create("deferRouter");

	return router({
		onMessage: publicProcedure
			.input(
				z.object({
					channelId: channelIdSchema,
				}),
			)
			.subscription(async function* (opts) {
				const { signal, input } = opts;
				const { channelId } = input;

				logger.info(`Opening subscription for channel: ${channelId}`);

				const extensionChannelProvider =
					container.get<ExtensionChannelProviderOutputPort>(
						ExtensionChannelProviderOutputPort,
					) as ServerDrivenTrpcChannelProvider;

				const channel = extensionChannelProvider.openChannel(channelId);
				logger.verbose(`Channel opened: ${channelId}`);

				let defer = Promise.withResolvers<DeferMessage>();

				const unsubscribe = channel.outgoing.on(
					"defer",
					(message: DeferMessage) => {
						logger.verbose(
							`Received defer message on channel ${channelId}:`,
							message,
						);
						defer.resolve(message);
						defer = Promise.withResolvers<DeferMessage>();
					},
				);

				let stopped = false;
				if (signal) {
					signal.onabort = () => {
						logger.info(`Subscription aborted for channel: ${channelId}`);
						stopped = true;
						unsubscribe();
						defer.reject(new Error("Client closed subscription"));
						extensionChannelProvider.closeChannel(channelId);
					};
				}
				while (!stopped) {
					yield await defer.promise;
				}
				logger.info(`Subscription ended for channel: ${channelId}`);
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

				logger.info(
					`Resolving message ${id} on channel ${channelId} (isOk: ${isOk})`,
				);
				logger.verbose("Resolve details:", {
					id,
					isOk,
					result,
					channelId,
				});

				const extensionChannelProvider =
					container.get<ExtensionChannelProviderOutputPort>(
						ExtensionChannelProviderOutputPort,
					) as ServerDrivenTrpcChannelProvider;

				const channel = extensionChannelProvider.getMessageChannel(channelId);

				const resolveMessage: ResolveMessage = {
					id,
					isOk,
					result,
				};

				channel.incoming.emit("resolve", resolveMessage);
				logger.verbose(`Resolve message emitted for ${id}`);
			}),
	});
};
