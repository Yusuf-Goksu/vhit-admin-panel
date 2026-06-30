import { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
};

const paddingClasses = {
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export default function Card({ children, className = "", padding = "md" }: CardProps) {
  return (
    <div className={`rounded-2xl bg-white shadow-sm ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
}
