const DEFAULT_CLERK_DOMAIN = "https://immortal-gobbler-92.clerk.accounts.dev"
const DEFAULT_APPLICATION_ID = "convex"

const authConfig = {
  providers: [
    {
      domain: DEFAULT_CLERK_DOMAIN,
      applicationID: DEFAULT_APPLICATION_ID,
    },
  ],
}

export default authConfig