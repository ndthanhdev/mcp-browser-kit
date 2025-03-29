import { tabService } from "../services/tab-service";

export const createContext = () => {
	return {
		tabService,
	};
};

export type Context = Awaited<ReturnType<typeof createContext>>;
