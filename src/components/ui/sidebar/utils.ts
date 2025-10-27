"use client"

import { cva, type VariantProps } from "class-variance-authority"

export const SIDEBAR_WIDTH = "16rem"
export const SIDEBAR_WIDTH_ICON = "3.25rem"
export const SIDEBAR_COLLAPSED_HIDDEN = "group-data-[collapsible=icon]:hidden"

export const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// Variant for hiding text/content in icon mode
export const sidebarIconModeVariants = cva("", {
  variants: {
    hideInIconMode: {
      true: "group-data-[collapsible=icon]:hidden",
    },
    iconModeSize: {
      square: "group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center",
      auto: "",
    },
    iconModeAlign: {
      center: "group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center",
      auto: "",
    },
  },
  defaultVariants: {
    hideInIconMode: false,
    iconModeSize: "auto",
    iconModeAlign: "auto",
  },
})

// Variant for sidebar layout containers
export const sidebarLayoutVariants = cva("", {
  variants: {
    spacing: {
      icon: "group-data-[collapsible=icon]:gap-3 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-4",
      tight: "group-data-[collapsible=icon]:gap-2 group-data-[collapsible=icon]:px-2",
      auto: "",
    },
  },
  defaultVariants: {
    spacing: "auto",
  },
})

export type SidebarIconModeVariants = VariantProps<typeof sidebarIconModeVariants>
export type SidebarLayoutVariants = VariantProps<typeof sidebarLayoutVariants>