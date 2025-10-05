export interface ManageChannelsInputPort {
	start: () => Promise<void>;
}
export const ManageChannelsInputPort = Symbol.for("ManageChannelsInputPort");
