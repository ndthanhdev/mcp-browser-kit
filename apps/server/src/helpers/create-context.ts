export const createContext = () => {
	return {};
};

export type Context = Awaited<ReturnType<typeof createContext>>;
