import Image from "next/image";

export function Phone({ name, alt, priority = false }: { name: string; alt: string; priority?: boolean }) {
  return (
    <div
      className="relative h-full rounded-[2.4rem] border border-white/15 bg-black p-[6px] shadow-[0_50px_120px_-30px_rgb(0_0_0/0.95),0_0_0_1px_rgb(255_255_255/0.04)]"
      style={{ aspectRatio: "1320 / 2868" }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[2rem]">
        <Image
          src={`/images/${name}.webp`}
          alt={alt}
          width={660}
          height={1434}
          priority={priority}
          sizes="(min-width: 1024px) 360px, 240px"
          className="h-full w-full select-none object-cover"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white/10 via-transparent to-transparent"
        />
      </div>
    </div>
  );
}
