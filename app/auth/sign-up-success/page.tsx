import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Check Your Email</CardTitle>
            <CardDescription>We've sent you a confirmation link to verify your email address.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Click the link in the email to activate your account. After confirming, you'll be automatically signed
                in and redirected to your dashboard.
              </p>
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-medium mb-1">Next steps:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Check your inbox for the confirmation email</li>
                  <li>Click the confirmation link</li>
                  <li>Start creating demo videos</li>
                </ol>
              </div>
              <Button asChild className="w-full">
                <Link href="/">Return to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
