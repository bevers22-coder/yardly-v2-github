import React from "react";
import { Star } from "lucide-react";

export default function RatingStars({ rating = 0, size = 14, showNumber = false, count = null }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            style={{ width: size, height: size }}
            className={
              i <= Math.round(rating)
                ? "fill-amber-400 text-amber-400"
                : "fill-muted text-muted-foreground/30"
            }
          />
        ))}
      </div>
      {showNumber && (
        <span className="text-xs font-medium text-muted-foreground">
          {Number(rating).toFixed(1)}
          {count != null && ` (${count})`}
        </span>
      )}
    </div>
  );
}
