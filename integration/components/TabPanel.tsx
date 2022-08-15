import * as React from "react";
import {Box} from "@material-ui/core";

interface TabPanelProps {
    children: React.ReactNode;
    value: number;
    index: number;
    [otherOptions: string]: unknown;
}
export const TabPanel = (props: TabPanelProps) => {
    const {children, value, index, ...other} = props;

    return (
        <div role="tabpanel" hidden={value !== index} id={`simple-tabpanel-${index}`} aria-labelledby={`simple-tab-${index}`} {...other}>
            {value === index && <Box p={3}>{children}</Box>}
        </div>
    );
};
