import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import ErrorIcon from "@mui/icons-material/ErrorOutlined";
import PendingIcon from "@mui/icons-material/Pending";

export interface ToolStatusIconProps {
	/** `undefined` while the call is still in flight. */
	ok?: boolean;
}

/** Pending / succeeded / failed glyph for a tool call. */
export const ToolStatusIcon = ({ ok }: ToolStatusIconProps) => {
	if (ok === undefined) {
		return <PendingIcon fontSize="inherit" color="disabled" />;
	}
	return ok ? (
		<CheckCircleIcon fontSize="inherit" color="success" />
	) : (
		<ErrorIcon fontSize="inherit" color="error" />
	);
};
