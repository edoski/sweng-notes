import { SignUp } from "@clerk/nextjs"

export default function RegisterPage() {
  return (
    <SignUp
      path={"/register"}
      routing="path"
      signInUrl={"/login"}
      fallbackRedirectUrl="/"
      appearance={{ elements: { card: "shadow-none border border-border bg-background" } }}
    />
  )
}