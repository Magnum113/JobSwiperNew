"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { cn } from "@/lib/utils";
import { employerInitials } from "@/lib/hh/format";
import type { HHEmployer } from "@/lib/hh/types";

export function EmployerLogo({
  employer,
  size = 48,
  className,
}: {
  employer: HHEmployer;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const url = employer.logo_urls?.["240"] ?? employer.logo_urls?.["90"];

  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-white",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {url && !failed ? (
        <img
          src={url}
          alt={employer.name}
          width={size}
          height={size}
          className="size-full object-contain p-1.5"
          onError={() => setFailed(true)}
          loading="lazy"
        />
      ) : (
        <span
          className="bg-gradient-brand bg-clip-text font-bold text-transparent"
          style={{ fontSize: size * 0.36 }}
        >
          {employerInitials(employer.name) || "?"}
        </span>
      )}
    </div>
  );
}
