import * as React from "react";
import CircularProgress from "@material-ui/core/CircularProgress";

/**
 * Display a block with an icon used to denote a loading section
 */
export default function LoadingPlaceholder() {
    const style: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        padding: "0",
    };
    return (
        <div style={style}>
            <CircularProgress />
        </div>
    );
}
