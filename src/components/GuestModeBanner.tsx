import { Cloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface GuestModeBannerProps {
  onSwitchToCloud: () => void;
}

export function GuestModeBanner({ onSwitchToCloud }: GuestModeBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
          <Cloud className="h-4 w-4 flex-shrink-0" />
          <span>
            <strong>Guest Mode:</strong> your data is stored only locally.{" "}
            <button
              onClick={onSwitchToCloud}
              className="underline hover:no-underline font-medium"
            >
              Switch to Cloud Mode
            </button>{" "}
            to back up your data.
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
