
"use client"

import { useEffect, useRef } from "react"

export function useScrollReveal() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible")
          }
        })
      },
      { threshold: 0.1 }
    )

    const observeElements = () => {
      const elements = containerRef.current?.querySelectorAll(".reveal-up")
      elements?.forEach((el) => observer.observe(el))
    }

    // Initial run
    observeElements()

    // MutationObserver to watch for newly added elements (like questions in a builder)
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          observeElements()
        }
      })
    })

    mutationObserver.observe(containerRef.current, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      mutationObserver.disconnect()
    }
  }, [])

  return containerRef
}
