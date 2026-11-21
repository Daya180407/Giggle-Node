export default function BrandLogo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`brand-tile relative grid shrink-0 place-items-center overflow-hidden rounded-[0.85rem] bg-white ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src="/brand/logo-256.webp"
        alt=""
        width={size}
        height={size}
        className="h-full w-full scale-[1.18] object-contain"
        decoding="async"
      />
      <span className="pointer-events-none absolute inset-0 rounded-[0.85rem] ring-1 ring-inset ring-indigo-500/15" aria-hidden />
    </span>
  );
}
