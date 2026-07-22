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

const channelId = createPrefixId("channel");
const channelIdSchema = z.string().refine((val) => channelId.isValid(val), {
	message: "Invalid channel ID format",
});

async function* deferSubscription(
	opts: {
		signal?: AbortSignal;
		input: {
			channelId: string;
		};
	},
	container: Container,
	logger: ReturnType<LoggerFactoryOutputPort["create"]>,
): AsyncGenerator<DeferMessage> {
	const { signal, input } = opts;
	const { channelId } = input;

	logger.info(`Opening subscription for channel: ${channelId}`);

	const extensionChannelProvider =
		container.get<ExtensionChannelProviderOutputPort>(
			ExtensionChannelProviderOutputPort,
		) as ServerDrivenTrpcChannelProvider;

	const channel = extensionChannelProvider.openChannel(channelId);
	logger.verbose(`Channel opened: ${channelId}`);

	// Buffers defer messages in a FIFO queue rather than a single promise slot,
	// so concurrently-arriving messages (e.g. two tools/call requests
	// dispatched in parallel) are all forwarded in arrival order instead of
	// silently dropping any message that arrives before the previous one is
	// consumed by the loop below.
	const pendingMessages: DeferMessage[] = [];
	let notifyArrival = Promise.withResolvers<void>();

	const unsubscribe = channel.outgoing.on("defer", (message: DeferMessage) => {
		logger.verbose(`Received defer message on channel ${channelId}:`, message);
		pendingMessages.push(message);
		notifyArrival.resolve();
	});

	let stopped = false;
	let abortError: Error | undefined;
	if (signal) {
		signal.onabort = () => {
			logger.info(`Subscription aborted for channel: ${channelId}`);
			stopped = true;
			abortError = new Error("Client closed subscription");
			unsubscribe();
			notifyArrival.resolve();
			extensionChannelProvider.closeChannel(channelId);
		};
	}
	while (!stopped) {
		if (pendingMessages.length === 0) {
			await notifyArrival.promise;
			notifyArrival = Promise.withResolvers<void>();
			continue;
		}
		yield pendingMessages.shift() as DeferMessage;
	}
	if (abortError) {
		throw abortError;
	}
	logger.info(`Subscription ended for channel: ${channelId}`);
}

async function resolveDefer(
	opts: {
		input: {
			id: string;
			isOk: boolean;
			result?: unknown;
			channelId: string;
		};
	},
	container: Container,
	logger: ReturnType<LoggerFactoryOutputPort["create"]>,
): Promise<void> {
	const { id, isOk, result, channelId } = opts.input;
	logger.info(
		`Resolving message ${id} on channel ${channelId} (isOk: ${isOk})`,
	);
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
}

export const createDeferRouter = (container: Container) => {
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
			.subscription((opts) => deferSubscription(opts, container, logger)),
		resolve: publicProcedure
			.input(
				z.object({
					id: z.string(),
					isOk: z.boolean(),
					// Zod v4 rejects `undefined` for required fields even with z.any();
					// void-returning tool calls (click, scroll, fillText, closeTab, ...)
					// resolve with `result: undefined`, so this must be optional.
					result: z.any().optional(),
					channelId: channelIdSchema,
				}),
			)
			.mutation((opts) => resolveDefer(opts, container, logger)),
	});
};
