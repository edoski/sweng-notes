import { SignIn } from "@clerk/nextjs"

export default function LoginPage() {
  return (
    <SignIn
      path={"/login"}
      routing="path"
      signUpUrl={"/register"}
      fallbackRedirectUrl="/"
      appearance={{ elements: { card: "shadow-none border border-border bg-background" } }}
    />
  )
}