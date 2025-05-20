import { Status } from "@/lib/enums/status";
import React from "react";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

const StatusBadge = ({ status }: { status: string }) => {
    return (
        <Badge
            variant="outline"
            className={cn("gap-1 py-0.5 px-2 text-sm", {
                "bg-amber-100 text-amber-500 border-amber-300":
                    status === Status.SCHEDULED,
                "bg-emerald-100 text-emerald-500 border-emerald-300":
                    status === Status.COMPLETED,
                "bg-blue-100 text-blue-500 border-blue-300":
                    status === Status.PENDING,
                "bg-red-100 text-red-500 border-red-300":
                    status === Status.CANCELLED,
            })}
        >
            {status}
        </Badge>
    );
};

export default StatusBadge;
