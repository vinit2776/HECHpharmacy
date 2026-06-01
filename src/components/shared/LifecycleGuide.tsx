"use client";

import { useState, useEffect } from "react";
import { Info, ChevronDown, ChevronUp, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  title: string;
  description: string;
}

interface LifecycleGuideProps {
  steps: Step[];
  title?: string;
  storageKey: string;
}

export function LifecycleGuide({
  steps,
  title = "How this works",
  storageKey,
}: LifecycleGuideProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) {
      setIsCollapsed(stored === "true");
    }
  }, [storageKey]);

  const handleToggle = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem(storageKey, String(next));
  };

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-6">
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={handleToggle}
      >
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <span className="text-sm font-semibold text-slate-800 flex-1">
          {title}
        </span>
        {isCollapsed ? (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        )}
      </div>

      {!isCollapsed && (
        <div className="flex flex-row flex-wrap items-start gap-2 mt-3">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="flex flex-col items-start gap-1 max-w-[140px]">
                <div className="flex items-center gap-1.5">
                  <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <span className="text-sm font-semibold text-slate-800">
                    {step.title}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 pl-7">
                  {step.description}
                </p>
              </div>
              {index < steps.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-300 mt-1 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
