import React from "react";
import { GraduationCap } from "lucide-react";

export default function Loader({ label, fullScreen = false, className = "" }) {
  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center w-14 h-14">
        <div className="absolute inset-0 rounded-full border-4 border-primary/15" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary animate-spin" />
        <GraduationCap className="w-6 h-6 text-primary" />
      </div>
      {label && <p className="text-sm font-medium text-muted-foreground">{label}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-24">
      {spinner}
    </div>
  );
}
