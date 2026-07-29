"use client"

import { useRef } from "react"
import {
  motion,
  useInView,
  type MotionProps,
  type TargetAndTransition,
  type UseInViewOptions,
} from "motion/react"

type MarginType = UseInViewOptions["margin"]

interface BlurFadeProps extends MotionProps {
  children: React.ReactNode
  className?: string
  variant?: {
    hidden: TargetAndTransition
    visible: TargetAndTransition
  }
  duration?: number
  delay?: number
  offset?: number
  direction?: "up" | "down" | "left" | "right"
  inView?: boolean
  inViewMargin?: MarginType
  blur?: string
}

export function BlurFade({
  children,
  className,
  variant,
  duration = 0.4,
  delay = 0,
  offset = 6,
  direction = "down",
  inView = false,
  inViewMargin = "-50px",
  blur = "6px",
  ...props
}: BlurFadeProps) {
  const ref = useRef(null)
  const inViewResult = useInView(ref, { once: true, margin: inViewMargin })
  const isInView = !inView || inViewResult
  const defaultVariants: {
    hidden: TargetAndTransition
    visible: TargetAndTransition
  } = {
    hidden: {
      [direction === "left" || direction === "right" ? "x" : "y"]:
        direction === "right" || direction === "down" ? -offset : offset,
      opacity: 0,
      filter: `blur(${blur})`,
    },
    visible: {
      [direction === "left" || direction === "right" ? "x" : "y"]: 0,
      opacity: 1,
      filter: `blur(0px)`,
    },
  }
  const combinedVariants = variant ?? defaultVariants

  return (
    <motion.div
      ref={ref}
      initial={combinedVariants.hidden}
      animate={isInView ? combinedVariants.visible : combinedVariants.hidden}
      transition={{
        delay: 0.04 + delay,
        duration,
        ease: "easeOut",
        filter: { duration },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}
