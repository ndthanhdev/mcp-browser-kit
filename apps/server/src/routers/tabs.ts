import { z } from "zod";

import { router, publicProcedure } from "../helpers/trpc";

export const tabs = router({
	update: publicProcedure
		.input(
			z.object({
				tabs: z.array(
					z.object({ id: z.string(), title: z.string(), url: z.string() })
				),
			})
		)
		.mutation(async ({ input, ctx }) => {
			ctx.tabService.putTabs(input.tabs);
			return ctx.tabService.getTabs();
		}),
});
