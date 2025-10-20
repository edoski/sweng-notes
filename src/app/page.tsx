import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import {UserButton} from "@clerk/nextjs";

export default async function HomePage() {
  const { userId } = await auth()
  if (!userId) redirect("/auth/login")
  return (
      <main>
          <h1>Home</h1>
          <UserButton
              showName
              appearance={{
                  elements: {
                      rootBox: "w-full group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:mx-auto",
                      userButtonTrigger:
                          "w-full items-center justify-start gap-3 rounded-lg px-3 py-3 text-left hover:bg-muted/40 transition group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:rounded-md group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0 group-data-[collapsible=icon]:mx-auto",
                      userButtonAvatarBox: "order-1 h-8 w-8 group-data-[collapsible=icon]:mx-auto",
                      userButtonOuterIdentifier:
                          "order-2 text-sm font-medium !text-foreground group-data-[collapsible=icon]:hidden",
                      userButtonTriggerIdentifier:
                          "order-2 text-sm font-medium !text-foreground group-data-[collapsible=icon]:hidden",
                      userButtonChevron: "h-4 w-4 text-muted-foreground group-data-[collapsible=icon]:hidden",
                      userButtonTriggerIcon: "group-data-[collapsible=icon]:mx-auto",
                  },
              }}
              userProfileMode="modal"
          />

      </main>

  )
}
