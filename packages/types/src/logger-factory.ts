export interface Logger {
	verbose: (...messages: unknown[]) => void;
	info: (...messages: unknown[]) => void;
	warn: (...messages: unknown[]) => void;
	error: (...messages: unknown[]) => void;
}

export interface LoggerFactory {
	create: (...components: string[]) => Logger;
}
