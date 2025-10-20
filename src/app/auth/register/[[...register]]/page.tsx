import { SignUp } from "@clerk/nextjs"

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <SignUp
        path="/auth/register"
        routing="path"
        signInUrl="/auth/login"
        appearance={{ elements: { card: "shadow-none border border-border bg-background" } }}
      />
    </div>
  )
}