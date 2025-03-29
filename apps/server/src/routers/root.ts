import { router } from "../helpers/trpc";
import { defer } from "./defer";
import { tabs } from "./tabs";
export const rootRouter = router({
	tabs,
	defer,
});
// Export type router type signature,
// NOT the router itself.
export type RootRouter = typeof rootRouter;
