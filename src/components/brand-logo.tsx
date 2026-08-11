import Image from "next/image";

type BrandLogoProps = {
  priority?: boolean;
  size?: "default" | "small" | "mock" | "phone";
};

export function BrandLogo({ priority = false, size = "default" }: BrandLogoProps) {
  return (
    <span className={`brand-logo brand-logo--${size}`} aria-hidden="true">
      <Image
        src="/brand/stealmyscene-logo.png"
        alt=""
        fill
        priority={priority}
        sizes={size === "default" ? "210px" : size === "small" ? "170px" : size === "mock" ? "125px" : "112px"}
      />
    </span>
  );
}
