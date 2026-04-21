import { Lock, PhoneCall, ShieldCheck, Truck } from "lucide-react";

const ITEMS = [
  {
    icon: ShieldCheck,
    title: "NIDA-verified",
    body: "Every customer is verified through Tanzania's National ID system.",
  },
  {
    icon: Lock,
    title: "Encrypted payments",
    body: "M-Pesa, Tigo Pesa, Airtel Money, and card — all via Evmark's certified gateway.",
  },
  {
    icon: Truck,
    title: "Same-day pickup",
    body: "Pay your deposit and collect your PC from our Dar showroom today.",
  },
  {
    icon: PhoneCall,
    title: "WhatsApp support",
    body: "A real person on the other end. Your order ID is pre-filled.",
  },
];

export function TrustStrip() {
  return (
    <section className="mx-auto mt-32 max-w-6xl px-4 sm:px-6">
      <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="flex flex-col gap-2">
              <Icon
                className="h-5 w-5 text-foreground"
                strokeWidth={1.8}
              />
              <p className="text-[14px] font-medium">{item.title}</p>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {item.body}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
