import type { Logger, LoggerFactory } from "@mcp-browser-kit/types";
import * as changeCase from "change-case";
import { consola, createConsola, LogLevels } from "consola";
import { injectable } from "inversify";
import * as R from "ramda";

consola.level = LogLevels.verbose;
const defaultInstance = createConsola({
	level: LogLevels.verbose,
	fancy: true,
}).withTag("mbk");

const createLoggerId = (...components: string[]) => {
	const id = R.pipe(R.map(changeCase.camelCase), R.join(":"))(components);

	return id;
};

@injectable()
export class DrivenLoggerFactoryConsolaBrowser implements LoggerFactory {
	private readonly instance;
	constructor() {
		this.instance = defaultInstance.create({});
	}

	create = (...components: string[]): Logger => {
		const id = createLoggerId(...components);

		const logger = this.instance.withTag(id);

		return logger as Logger;
	};
}

@injectable()
export class DrivenLoggerFactoryConsolaJson implements LoggerFactory {
	private readonly instance;
	constructor() {
		this.instance = defaultInstance.create({
			reporters: [
				{
					log: (logObj) => {
						const json = JSON.stringify(logObj);
						console.error(json);
					},
				},
			],
		});
	}

	create = (...components: string[]): Logger => {
		const id = createLoggerId(...components);

		const logger = this.instance.withTag(id);

		return logger as Logger;
	};
}
