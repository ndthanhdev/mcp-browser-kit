import { z } from "zod";
import { rpcClient } from "../helpers/rpc-client";
import { publicProcedure, router } from "../helpers/trpc";

export const defer = router({
	onMessage: publicProcedure.subscription(async function* (opts) {
		const { signal } = opts;
		let messageTask = rpcClient.emitter.once("defer");

		let stopped = false;
		if (signal) {
			signal.onabort = () => {
				messageTask.off();
				stopped = true;
			};
		}
		while (!stopped) {
			yield await messageTask;
			messageTask = rpcClient.emitter.once("defer");
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

			rpcClient.emitter.emit("resolve", {
				id,
				isOk,
				result,
			});
		}),
});
