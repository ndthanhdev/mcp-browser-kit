import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-server";
import { ExtensionChannelProviderOutputPort } from "@mcp-browser-kit/core-server/output-ports/extension-channel-provider";
import { createPrefixId } from "@mcp-browser-kit/core-utils";
import type { Container } from "inversify";
import { z } from "zod";
import {
	publicProcedure,
	router,
} from "../services/server-driven-trpc-channel-provider";

const channelId = createPrefixId("channel");

const channelIdSchema = z.string().refine((val) => channelId.isValid(val), {
	message: "Invalid channel ID format",
});

// Zod schemas mirror the BrowserEvent types in @mcp-browser-kit/types. They
// live here — at the transport boundary — rather than in the pure types
// package so @mcp-browser-kit/types stays free of runtime dependencies.
const browserInfoSchema = z.object({
	browserName: z.string(),
	browserVersion: z.string(),
});

const extensionInfoSchema = z.object({
	extensionId: z.string(),
	manifestVersion: z.number(),
	extensionVersion: z.string(),
});

const windowInfoSchema = z.object({
	id: z.string(),
	focused: z.boolean(),
});

const tabInfoSchema = z.object({
	id: z.string(),
	active: z.boolean(),
	title: z.string(),
	url: z.string(),
});

const snapshotSchema = z.object({
	status: z.enum([
		"online",
		"offline",
	]),
	browserInfo: browserInfoSchema,
	extensionInfo: extensionInfoSchema,
	windows: z.array(windowInfoSchema),
	tabs: z.array(tabInfoSchema),
	activeTabIdByWindow: z.record(z.string(), z.string()),
	contentChangedAt: z.record(z.string(), z.number()),
	offlineAt: z.number().optional(),
});

const browserStateChangedSchema = z.object({
	type: z.literal("browserStateChanged"),
	at: z.number(),
	snapshot: snapshotSchema,
});

const browserEventSchema = browserStateChangedSchema;

export const createEventsRouter = (container: Container) => {
	const logger = container
		.get<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
		.create("eventsRouter");

	return router({
		publish: publicProcedure
			.input(
				z.object({
					channelId: channelIdSchema,
					event: browserEventSchema,
				}),
			)
			.mutation(async (opts) => {
				const { channelId, event } = opts.input;

				logger.verbose(
					`Received browser event on channel ${channelId}: ${event.type}`,
				);

				const extensionChannelProvider =
					container.get<ExtensionChannelProviderOutputPort>(
						ExtensionChannelProviderOutputPort,
					);

				extensionChannelProvider.emitBrowserEvent(channelId, event);
			}),
	});
};
