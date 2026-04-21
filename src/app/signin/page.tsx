import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata = {
  title: "Sign in",
};

export default function SignInPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-14rem)] max-w-sm flex-col justify-center px-4 py-12 sm:px-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-[14px] text-muted-foreground">
          Welcome back to Ubepari Wallet.
        </p>
      </div>

      <form className="mt-8 space-y-4 rounded-3xl border border-border/60 bg-card p-6">
        <div>
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            placeholder="255 7XX XXX XXX"
            className="mt-2"
            autoComplete="tel"
          />
        </div>
        <Button className="w-full rounded-full" size="lg">
          Send OTP
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          We'll text a 6-digit code to your phone.
        </p>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted-foreground">
        New here?{" "}
        <Link href="/signup" className="text-foreground underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
