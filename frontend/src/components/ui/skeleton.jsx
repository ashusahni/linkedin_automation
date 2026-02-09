import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }) {
    return (
        <div
            className={cn("animate-pulse rounded-md bg-white/5", className)}
            {...props}
        />
    );
}

export function CampaignSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                ))}
            </div>
            <Skeleton className="h-[400px] w-full" />
        </div>
    );
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
    return (
        <div className="space-y-3">
            {[...Array(rows)].map((_, i) => (
                <div key={i} className="flex gap-4">
                    {[...Array(cols)].map((_, j) => (
                        <Skeleton key={j} className="h-12 flex-1" />
                    ))}
                </div>
            ))}
        </div>
    );
}
