"use client"

import React from "react"
import { StarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export const ReviewStars = ({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) => {
  const [hoverValue, setHoverValue] = React.useState(0)
  const stars = [1, 2, 3, 4, 5]

  return (
    <div className="flex items-center group">
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          className="relative px-1"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHoverValue(star)}
          onMouseLeave={() => setHoverValue(0)}
        >
          <StarIcon
            size={40}
            className={cn("transition-colors duration-200", {
              "text-primary/70 hover:text-primary group-hover:text-primary/50 group-hover:hover:text-primary":
                star < (hoverValue || value),
              "text-primary": star === (hoverValue || value),
              "text-gray-300": star > (hoverValue || value),
            })}
          />
        </button>
      ))}
    </div>
  )
}
