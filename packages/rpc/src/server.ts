import type { DeferMessage, ResolveMessage } from "./client";

export interface ProcedureMap {
	[key: string]: (...args: any[]) => any;
}

export class RpcServer<T extends ProcedureMap = {}> {
	private procedures: T;

	constructor(procedures: T) {
		this.procedures = procedures;
	}

	addProcedure<K extends string, V extends (...args: any[]) => any>(
		name: K,
		procedure: V
	): RpcServer<T & { [key in K]: V }> {
		return new RpcServer({
			...this.procedures,
			[name]: procedure,
		});
	}

	async handleDefer(message: DeferMessage): Promise<ResolveMessage> {
		const { procedure, args, id } = message;
		const fn = this.procedures[procedure];

		if (!fn) {
			return Promise.resolve({
				id,
				isOk: false,
				result: `Procedure ${procedure} not found`,
			});
		}

		try {
			const result = await fn(...args);
			console.log("result", result);

			return Promise.resolve({
				id,
				isOk: true,
				result,
			});
		} catch (error) {
			return Promise.resolve({
				id,
				isOk: false,
				result: error,
			});
		}
	}
}

export type InferProcedureMap<T extends RpcServer> = T extends RpcServer<
	infer U
>
	? U
	: never;
