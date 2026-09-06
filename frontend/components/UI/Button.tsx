import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  className = "",
  children,
  ...buttonProps
}: ButtonProps) {
  return (
    <button
      className={`em-button em-button--${variant} em-button--${size} ${className}`.trim()}
      {...buttonProps}
    >
      {icon && <span className="em-button__icon">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}
