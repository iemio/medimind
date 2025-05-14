import { Button } from "@/components/ui/button";
import { StatsGrid } from "@/components/stats-grid";
import AppointmentsTable from "@/features/admin/components/appointments-table";

export default function Page() {
    return (
        <div className="flex flex-1 flex-col gap-4 lg:gap-6 py-4 lg:py-6">
            {/* Page intro */}
            <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold">Oilà, Larry!</h1>
                    <p className="text-sm text-muted-foreground">
                        Here&rsquo;s an overview of all appointments. Manage
                        with ease.
                    </p>
                </div>
                {/* <Button className="px-3">Add Contact</Button> */}
            </div>
            {/* Numbers */}
            <StatsGrid
                stats={[
                    {
                        title: "Pending",
                        value: "427,296",
                        change: {
                            value: "+12%",
                            trend: "up",
                        },
                        icon: (
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 32 32"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M16.0002 15.9998L10.303 11.2522C9.45651 10.5468 9.03328 10.1941 8.72901 9.76175C8.45942 9.37868 8.25921 8.95122 8.13752 8.49888C8.00016 7.98835 8.00016 7.43743 8.00016 6.33557V2.6665M16.0002 15.9998L21.6973 11.2522C22.5438 10.5468 22.967 10.1941 23.2713 9.76175C23.5409 9.37868 23.7411 8.95122 23.8628 8.49888C24.0002 7.98835 24.0002 7.43743 24.0002 6.33557V2.6665M16.0002 15.9998L10.303 20.7475C9.45651 21.4529 9.03328 21.8056 8.72901 22.2379C8.45942 22.621 8.25921 23.0484 8.13752 23.5008C8.00016 24.0113 8.00016 24.5622 8.00016 25.6641V29.3332M16.0002 15.9998L21.6973 20.7475C22.5438 21.4529 22.967 21.8056 23.2713 22.2379C23.5409 22.621 23.7411 23.0484 23.8628 23.5008C24.0002 24.0113 24.0002 24.5622 24.0002 25.6641V29.3332M5.3335 2.6665H26.6668M5.3335 29.3332H26.6668"
                                    stroke="#10B981"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                            </svg>
                        ),
                    },
                    {
                        title: "Scheduled",
                        value: "37,429",
                        change: {
                            value: "+42%",
                            trend: "up",
                        },
                        icon: (
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 32 32"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M28 13.3332H4M28 16.6665V11.7332C28 9.49296 28 8.37286 27.564 7.51721C27.1805 6.76456 26.5686 6.15264 25.816 5.76914C24.9603 5.33317 23.8402 5.33317 21.6 5.33317H10.4C8.15979 5.33317 7.03969 5.33317 6.18404 5.76914C5.43139 6.15264 4.81947 6.76456 4.43597 7.51721C4 8.37286 4 9.49296 4 11.7332V22.9332C4 25.1734 4 26.2935 4.43597 27.1491C4.81947 27.9018 5.43139 28.5137 6.18404 28.8972C7.03969 29.3332 8.15979 29.3332 10.4 29.3332H16M21.3333 2.6665V7.99984M10.6667 2.6665V7.99984M19.3333 25.3332L22 27.9998L28 21.9998"
                                    stroke="#10B981"
                                    stroke-width="3"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                            </svg>
                        ),
                    },
                    {
                        title: "Completed",
                        value: "$82,439",
                        change: {
                            value: "+37%",
                            trend: "up",
                        },
                        icon: (
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 12 12"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M10 3L4.5 8.5L2 6"
                                    stroke="#10B981"
                                    stroke-width="1.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                            </svg>
                        ),
                    },

                    {
                        title: "Cancelled",
                        value: "3,497",
                        change: {
                            value: "-17%",
                            trend: "down",
                        },
                        icon: (
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 32 32"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M15.9995 11.9998V17.3332M15.9995 22.6665H16.0128M14.1533 5.18878L3.18675 24.1309C2.57848 25.1816 2.27434 25.7069 2.31929 26.1381C2.3585 26.5141 2.55553 26.8559 2.86134 27.0782C3.21195 27.3332 3.81897 27.3332 5.033 27.3332H26.966C28.1801 27.3332 28.7871 27.3332 29.1377 27.0782C29.4435 26.8559 29.6405 26.5141 29.6797 26.1381C29.7247 25.7069 29.4205 25.1816 28.8123 24.1309L17.8458 5.18878C17.2397 4.1419 16.9366 3.61845 16.5412 3.44265C16.1964 3.2893 15.8027 3.2893 15.4578 3.44265C15.0624 3.61845 14.7594 4.1419 14.1533 5.18878Z"
                                    stroke="#10B981"
                                    stroke-width="3"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                            </svg>
                        ),
                    },
                ]}
            />
            {/* Table */}
            <div className="min-h-[100vh] flex-1 md:min-h-min">
                <AppointmentsTable />
            </div>
        </div>
    );
}
