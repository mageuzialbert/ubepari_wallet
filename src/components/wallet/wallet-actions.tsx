"use client";

import * as React from "react";
import { ArrowUpRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDictionary } from "@/i18n/provider";

import { AllocateDialog, type AllocateDialogGoal } from "./allocate-dialog";
import { TopupDialog } from "./topup-dialog";

export function WalletActions({
  availableTzs,
  activeGoals,
}: {
  availableTzs: number;
  activeGoals: AllocateDialogGoal[];
}) {
  const t = useDictionary().wallet;
  const [topupOpen, setTopupOpen] = React.useState(false);
  const [allocOpen, setAllocOpen] = React.useState(false);

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button
          size="lg"
          className="rounded-full"
          onClick={() => setTopupOpen(true)}
        >
          <Plus className="h-4 w-4" />
          {t.topUpCta}
        </Button>
        <Button
          size="lg"
          variant="ghost"
          className="rounded-full"
          onClick={() => setAllocOpen(true)}
          disabled={availableTzs <= 0 || activeGoals.length === 0}
        >
          <ArrowUpRight className="h-4 w-4" />
          {t.allocateCta}
        </Button>
      </div>

      <TopupDialog open={topupOpen} onOpenChange={setTopupOpen} />
      <AllocateDialog
        open={allocOpen}
        onOpenChange={setAllocOpen}
        goals={activeGoals}
        availableTzs={availableTzs}
      />
    </>
  );
}
