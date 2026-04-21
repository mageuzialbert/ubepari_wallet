import { Check, FileUp, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata = {
  title: "KYC & Verification",
};

export default function KycPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Verification
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
          Verify once. Shop forever.
        </h1>
        <p className="mt-4 max-w-xl text-[15px] text-muted-foreground">
          Upload one valid ID and we'll assign you a credit limit, usually
          within a few hours. Ubepari's KYC team reviews every submission.
        </p>
      </header>

      <div className="mt-10 space-y-4">
        <form className="space-y-6 rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
          <div>
            <Label htmlFor="nida">NIDA number</Label>
            <Input
              id="nida"
              placeholder="20000000-00000-00000-00"
              className="mt-2 font-mono"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              20 digits. Find it on the front of your NIDA card.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="first">Legal first name</Label>
              <Input id="first" className="mt-2" />
            </div>
            <div>
              <Label htmlFor="last">Legal last name</Label>
              <Input id="last" className="mt-2" />
            </div>
          </div>

          <div>
            <Label>Upload ID document</Label>
            <div className="mt-2 flex items-center justify-center rounded-2xl border-2 border-dashed border-border/60 bg-background/50 p-8 text-center">
              <div>
                <FileUp className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-3 text-[14px] font-medium">
                  Drop NIDA / Passport here
                </p>
                <p className="text-[12px] text-muted-foreground">
                  JPG or PDF · max 5 MB
                </p>
                <Button variant="outline" size="sm" className="mt-3 rounded-full">
                  Choose file
                </Button>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="workplace">Workplace / permit (optional)</Label>
            <Input
              id="workplace"
              placeholder="Employer or business name"
              className="mt-2"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Helps us approve a higher credit limit.
            </p>
          </div>

          <Button className="w-full rounded-full" size="lg">
            Submit for review
          </Button>
        </form>

        <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <ShieldCheck className="h-3 w-3" /> What happens next
          </div>
          <ol className="mt-4 space-y-3 text-[14px]">
            {[
              "Our team matches your NIDA details to the national registry.",
              "We run a soft credit check — no impact on your score.",
              "You get your credit limit by SMS and email, usually within 4 hours.",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-[10px] font-semibold">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
