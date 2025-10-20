import { SignIn } from "@clerk/nextjs"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <SignIn
        path="/auth/login"
        routing="path"
        signUpUrl="/auth/register"
        appearance={{ elements: { card: "shadow-none border border-border bg-background" } }}
      />
    </div>
  )
}