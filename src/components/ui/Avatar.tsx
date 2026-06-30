"use client";

import { getInitials } from "@/lib/format";

type AvatarProps = {
  name: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
};

const sizeClasses = {
  sm: "h-10 w-10 text-sm",
  md: "h-14 w-14 text-lg",
  lg: "h-24 w-24 text-3xl",
};

export default function Avatar({ name, photoUrl, size = "md", onClick }: AvatarProps) {
  const className = `${sizeClasses[size]} shrink-0 overflow-hidden rounded-full border border-slate-200`;
  const clickable = onClick
    ? "cursor-pointer transition hover:ring-2 hover:ring-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    : "";

  if (photoUrl) {
    const Tag = onClick ? "button" : "div";

    return (
      <Tag
        type={onClick ? "button" : undefined}
        onClick={onClick}
        className={`${className} bg-slate-100 ${clickable}`}
        aria-label={onClick ? `${name} profil fotoğrafını görüntüle` : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt={name}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      </Tag>
    );
  }

  return (
    <div
      className={`${className} flex items-center justify-center bg-slate-900 font-bold text-white ${clickable}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") onClick();
            }
          : undefined
      }
    >
      {getInitials(name)}
    </div>
  );
}
