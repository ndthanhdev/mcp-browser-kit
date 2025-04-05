import { router } from "../helpers/trpc";
import { defer } from "./defer";

export const rootRouter = router({
	defer,
});
// Export type router type signature,
// NOT the router itself.
export type RootRouter = typeof rootRouter;
