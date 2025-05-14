"use client";

import * as React from "react";

import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import Logo from "./icons/logo";

export function Team() {
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground gap-3 [&>svg]:size-auto"
                >
                    <div className="flex aspect-square size-8 items-center justify-center rounded-md overflow-hidden text-sidebar-primary-foreground">
                        <Logo />
                    </div>
                    <div className="grid flex-1 text-left text-base leading-tight">
                        <span className="truncate font-medium">Medimind</span>
                    </div>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
