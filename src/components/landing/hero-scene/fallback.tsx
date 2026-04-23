import Image from "next/image";

export function HeroSceneFallback() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <Image
        src="https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=2000&q=85"
        alt=""
        aria-hidden
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-70"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/30 to-background" />
    </div>
  );
}
