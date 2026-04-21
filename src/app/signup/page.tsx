import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata = {
  title: "Create account",
};

export default function SignUpPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-14rem)] max-w-sm flex-col justify-center px-4 py-12 sm:px-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="mt-2 text-[14px] text-muted-foreground">
          It takes 60 seconds. You'll verify your ID later, when you checkout.
        </p>
      </div>

      <form className="mt-8 space-y-4 rounded-3xl border border-border/60 bg-card p-6">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="first">First name</Label>
            <Input id="first" className="mt-2" />
          </div>
          <div>
            <Label htmlFor="last">Last name</Label>
            <Input id="last" className="mt-2" />
          </div>
        </div>
        <div>
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            placeholder="255 7XX XXX XXX"
            className="mt-2"
            autoComplete="tel"
          />
        </div>
        <div>
          <Label htmlFor="email">Email (optional)</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@gmail.com"
            className="mt-2"
            autoComplete="email"
          />
        </div>
        <Button className="w-full rounded-full" size="lg">
          Create account
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          By continuing you agree to our{" "}
          <Link href="/legal/terms" className="underline underline-offset-2">
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/legal/hire-purchase"
            className="underline underline-offset-2"
          >
            Hire-Purchase Agreement
          </Link>
          .
        </p>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted-foreground">
        Already have an account?{" "}
        <Link href="/signin" className="text-foreground underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
