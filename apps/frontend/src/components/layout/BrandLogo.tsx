import { Link } from "react-router-dom";

import { WebsterLogoIcon } from "@/components/brand/WebsterLogoIcon";

type BrandLogoProps = {
  variant?: "light" | "dark";
  to?: string;
};

export function BrandLogo({ variant = "dark", to = "/" }: BrandLogoProps) {
  return (
    <Link
      to={to}
      className="group inline-block transition duration-300 ease-out hover:scale-[1.04] active:scale-[0.98]"
    >
      <WebsterLogoIcon
        variant={variant}
        height={34}
        className="block transition duration-300 ease-out group-hover:brightness-110"
        aria-label="Webster"
      />
    </Link>
  );
}
