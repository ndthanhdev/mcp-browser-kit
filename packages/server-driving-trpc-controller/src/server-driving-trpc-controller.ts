import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-server";
import type { Container } from "inversify";
import { inject, injectable } from "inversify";
import { PortFinder } from "./port-finder";

@injectable()
export class ServerDrivingTrpcController {
	constructor(
		@inject(PortFinder)
		public readonly portFinder: PortFinder,
	) {}

	/**
	 * Setup container bindings for ServerDrivingTrpcController and its dependencies
	 */
	static setupContainer(container: Container): void {
		// Ensure LoggerFactory is bound (should be bound by the core container)
		if (!container.isBound(LoggerFactoryOutputPort)) {
			throw new Error(
				"LoggerFactoryOutputPort must be bound before calling ServerDrivingTrpcController.setupContainer",
			);
		}

		// Bind PortFinder
		container.bind<PortFinder>(PortFinder).to(PortFinder);

		// Bind ServerDrivingTrpcController
		container
			.bind<ServerDrivingTrpcController>(ServerDrivingTrpcController)
			.to(ServerDrivingTrpcController);
	}
}
