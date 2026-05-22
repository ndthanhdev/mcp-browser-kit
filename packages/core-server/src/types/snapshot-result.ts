export interface SnapshotResult<T> {
	snapshotId: string;
	pageNumber: number;
	nextPageNumber: number | null;
	hasNextPage: boolean;
	totalPages: number;
	data: T;
}
