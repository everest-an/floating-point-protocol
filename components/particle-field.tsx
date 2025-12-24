"use client"

import type React from "react"
import { useEffect, useRef, useState, useCallback } from "react"
import { useFPP } from "@/lib/fpp-context"

// Helper functions for safe number validation
const isFiniteNumber = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n)
const safeNum = (n: unknown, fallback = 0): number => (isFiniteNumber(n) ? n : fallback)

const createSafeRadialGradient = (
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  r0: number,
  x1: number,
  y1: number,
  r1: number,
  fallbackColor: string,
): CanvasGradient | string => {
  const sx0 = safeNum(x0)
  const sy0 = safeNum(y0)
  const sr0 = safeNum(r0, 1)
  const sx1 = safeNum(x1)
  const sy1 = safeNum(y1)
  const sr1 = safeNum(r1, 1)

  // Ensure radii are positive
  const finalR0 = Math.max(0, sr0)
  const finalR1 = Math.max(0.1, sr1)

  try {
    return ctx.createRadialGradient(sx0, sy0, finalR0, sx1, sy1, finalR1)
  } catch {
    return fallbackColor
  }
}

interface ParticleFieldProps {
  onPointSelect: (pointId: string) => void
  onPointDetail: (pointId: string) => void
  selectedPoints: string[]
  isProcessing: boolean
}

interface VisualParticle {
  id: string
  x: number
  y: number
  radius: number
  brightness: number
  mass: number
  orbit: {
    radiusX: number
    radiusY: number
    angle: number
    speed: number
    eccentricity: number
    phase: number
    inclination: number
  }
  trail: { x: number; y: number; alpha: number }[]
  pulsePhase: number
  isUserOwned: boolean
  layer: number
}

export function ParticleField({ onPointSelect, onPointDetail, selectedPoints, isProcessing }: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<VisualParticle[]>([])
  const animationRef = useRef<number>(0)
  const [hoveredParticle, setHoveredParticle] = useState<string | null>(null)
  const timeRef = useRef(0)
  const lastClickRef = useRef<{ id: string; time: number } | null>(null)

  const { state, removeAnimation } = useFPP()
  const { availablePoints, userPoints, animations } = state
  const safeAnimations = animations ?? []
  const userPointIds = new Set((userPoints ?? []).map((p) => p.id))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = safeNum(rect.width * dpr, 800)
    canvas.height = safeNum(rect.height * dpr, 600)

    const particles: VisualParticle[] = []
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    const eventHorizonRadius = Math.min(canvas.width, canvas.height) * 0.25
    const ergosphereRadius = eventHorizonRadius * 1.45

    const safeAvailablePoints = availablePoints ?? []

    safeAvailablePoints.forEach((point, i) => {
      const layerRandom = Math.random()
      let layer: number
      let baseRadius: number

      if (layerRandom < 0.15) {
        layer = 0
        baseRadius = eventHorizonRadius + (ergosphereRadius - eventHorizonRadius) * (0.05 + Math.random() * 0.25)
      } else if (layerRandom < 0.7) {
        layer = 1
        baseRadius = eventHorizonRadius + (ergosphereRadius - eventHorizonRadius) * (0.3 + Math.random() * 0.4)
      } else {
        layer = 2
        baseRadius = eventHorizonRadius + (ergosphereRadius - eventHorizonRadius) * (0.7 + Math.random() * 0.28)
      }

      const angle = (i / Math.max(1, safeAvailablePoints.length)) * Math.PI * 2 + Math.random() * Math.PI * 0.5
      const eccentricity = 0.85 + Math.random() * 0.12

      particles.push({
        id: point.id,
        x: safeNum(centerX),
        y: safeNum(centerY),
        radius: safeNum(1.2 + point.mass * 0.5, 1.5),
        brightness: 0.6 + Math.random() * 0.4,
        mass: safeNum(point.mass, 1),
        orbit: {
          radiusX: safeNum(baseRadius, 100),
          radiusY: safeNum(baseRadius * eccentricity, 85),
          angle: safeNum(angle),
          speed: safeNum(0.12 + Math.random() * 0.08 - layer * 0.03, 0.1),
          eccentricity: safeNum(eccentricity, 0.9),
          phase: Math.random() * Math.PI * 2,
          inclination: (Math.random() - 0.5) * 0.15,
        },
        trail: [],
        pulsePhase: Math.random() * Math.PI * 2,
        isUserOwned: userPointIds.has(point.id),
        layer,
      })
    })

    particlesRef.current = particles
  }, [availablePoints, userPointIds])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d", { alpha: false })
    if (!ctx) return

    const animate = () => {
      timeRef.current += 0.016
      const now = Date.now()

      const dpr = window.devicePixelRatio || 1
      const centerX = safeNum(canvas.width / 2, 400)
      const centerY = safeNum(canvas.height / 2, 300)
      const eventHorizonRadius = safeNum(Math.min(canvas.width, canvas.height) * 0.25, 100)
      const ergosphereRadius = safeNum(eventHorizonRadius * 1.45, 145)

      ctx.fillStyle = "rgba(0, 0, 0, 0.12)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const innerGlow = createSafeRadialGradient(
        ctx,
        centerX,
        centerY,
        eventHorizonRadius * 0.8,
        centerX,
        centerY,
        eventHorizonRadius * 1.1,
        "rgba(0, 0, 0, 0)",
      )
      if (typeof innerGlow !== "string") {
        innerGlow.addColorStop(0, "rgba(75, 45, 110, 0.08)")
        innerGlow.addColorStop(1, "rgba(0, 0, 0, 0)")
      }
      ctx.fillStyle = innerGlow
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Ergosphere
      const ergoPulse = 1 + Math.sin(timeRef.current * 0.3) * 0.005
      ctx.save()
      ctx.strokeStyle = "rgba(147, 112, 219, 0.4)"
      ctx.lineWidth = 1 * dpr
      ctx.setLineDash([3 * dpr, 6 * dpr])
      ctx.lineDashOffset = -timeRef.current * 8
      ctx.beginPath()
      ctx.arc(centerX, centerY, safeNum(ergosphereRadius * ergoPulse, 145), 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()

      // Event Horizon
      const horizonPulse = 1 + Math.sin(timeRef.current * 0.5) * 0.003
      ctx.strokeStyle = "rgba(255, 255, 255, 0.65)"
      ctx.lineWidth = 1.2 * dpr
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.arc(centerX, centerY, safeNum(eventHorizonRadius * horizonPulse, 100), 0, Math.PI * 2)
      ctx.stroke()

      // Singularity
      const singularityPulse = 1 + Math.sin(timeRef.current * 0.8) * 0.15
      const singularitySize = safeNum(2.5 * dpr * singularityPulse, 5)

      const singGlow = createSafeRadialGradient(
        ctx,
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        singularitySize * 4,
        "rgba(255, 255, 255, 0.6)",
      )
      if (typeof singGlow !== "string") {
        singGlow.addColorStop(0, "rgba(255, 255, 255, 0.6)")
        singGlow.addColorStop(0.3, "rgba(255, 255, 255, 0.1)")
        singGlow.addColorStop(1, "rgba(255, 255, 255, 0)")
      }
      ctx.fillStyle = singGlow
      ctx.beginPath()
      ctx.arc(centerX, centerY, safeNum(singularitySize * 4, 20), 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
      ctx.beginPath()
      ctx.arc(centerX, centerY, singularitySize, 0, Math.PI * 2)
      ctx.fill()

      // Animations
      safeAnimations.forEach((anim) => {
        const elapsed = now - anim.startTime
        if (elapsed < 0) return
        if (elapsed > anim.duration) {
          removeAnimation(anim.id)
          return
        }

        const progress = elapsed / anim.duration
        const easeOut = 1 - Math.pow(1 - progress, 3)
        const easeIn = Math.pow(progress, 3)

        if (anim.type === "emit") {
          const x = safeNum(centerX + (anim.endX - 0.5) * canvas.width * easeOut, centerX)
          const y = safeNum(centerY + (anim.endY - 0.5) * canvas.height * easeOut, centerY)
          const size = safeNum(3 * dpr * easeOut, 3)
          const alpha = 1 - progress * 0.3

          const gradient = createSafeRadialGradient(ctx, x, y, 0, x, y, size * 8, `rgba(134, 239, 172, ${alpha})`)
          if (typeof gradient !== "string") {
            gradient.addColorStop(0, `rgba(134, 239, 172, ${alpha})`)
            gradient.addColorStop(0.5, `rgba(74, 222, 128, ${alpha * 0.3})`)
            gradient.addColorStop(1, "rgba(34, 197, 94, 0)")
          }
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(x, y, safeNum(size * 8, 24), 0, Math.PI * 2)
          ctx.fill()

          ctx.fillStyle = `rgba(134, 239, 172, ${alpha})`
          ctx.beginPath()
          ctx.arc(x, y, size, 0, Math.PI * 2)
          ctx.fill()
        } else if (anim.type === "absorb") {
          const particle = particlesRef.current.find((p) => p.id === anim.pointId)
          if (particle) {
            const x = safeNum(particle.x + (centerX - particle.x) * easeIn, centerX)
            const y = safeNum(particle.y + (centerY - particle.y) * easeIn, centerY)
            const size = safeNum(particle.radius * dpr * (1 - easeIn), 2)
            const alpha = 1 - easeIn

            for (let i = 0; i < 5; i++) {
              const trailProgress = Math.max(0, progress - i * 0.08)
              const trailEase = Math.pow(trailProgress, 2)
              const trailX = safeNum(particle.x + (centerX - particle.x) * trailEase, centerX)
              const trailY = safeNum(particle.y + (centerY - particle.y) * trailEase, centerY)
              const trailAlpha = (1 - trailEase) * 0.3

              ctx.fillStyle = `rgba(239, 68, 68, ${trailAlpha})`
              ctx.beginPath()
              ctx.arc(trailX, trailY, safeNum(size * (1 - i * 0.15), 1), 0, Math.PI * 2)
              ctx.fill()
            }

            const gradient = createSafeRadialGradient(ctx, x, y, 0, x, y, size * 4, `rgba(239, 68, 68, ${alpha})`)
            if (typeof gradient !== "string") {
              gradient.addColorStop(0, `rgba(239, 68, 68, ${alpha})`)
              gradient.addColorStop(0.5, `rgba(185, 28, 28, ${alpha * 0.5})`)
              gradient.addColorStop(1, "rgba(127, 29, 29, 0)")
            }
            ctx.fillStyle = gradient
            ctx.beginPath()
            ctx.arc(x, y, safeNum(size * 4, 8), 0, Math.PI * 2)
            ctx.fill()
          }
        }
      })

      // Particles
      const particles = particlesRef.current ?? []
      particles.forEach((particle) => {
        // Update orbit position
        particle.orbit.angle += particle.orbit.speed * 0.016
        const cosAngle = Math.cos(particle.orbit.angle)
        const sinAngle = Math.sin(particle.orbit.angle)

        particle.x = safeNum(centerX + cosAngle * particle.orbit.radiusX, centerX)
        particle.y = safeNum(
          centerY + sinAngle * particle.orbit.radiusY + sinAngle * particle.orbit.inclination * particle.orbit.radiusX,
          centerY,
        )

        // Trail
        particle.trail.unshift({ x: particle.x, y: particle.y, alpha: 0.4 })
        if (particle.trail.length > 12) particle.trail.pop()

        // Draw trail
        particle.trail.forEach((point, idx) => {
          const trailAlpha = point.alpha * (1 - idx / particle.trail.length) * 0.3
          ctx.fillStyle = particle.isUserOwned
            ? `rgba(74, 222, 128, ${trailAlpha})`
            : `rgba(200, 200, 220, ${trailAlpha})`
          ctx.beginPath()
          ctx.arc(safeNum(point.x), safeNum(point.y), safeNum(particle.radius * dpr * 0.5, 1), 0, Math.PI * 2)
          ctx.fill()
        })

        // Particle glow
        particle.pulsePhase += 0.02
        const pulse = 1 + Math.sin(particle.pulsePhase) * 0.15
        const size = safeNum(particle.radius * dpr * pulse, 2)
        const isSelected = selectedPoints.includes(particle.id)
        const isHovered = hoveredParticle === particle.id

        const glowSize = safeNum(size * (isSelected ? 6 : isHovered ? 5 : 3), 6)
        const glow = createSafeRadialGradient(
          ctx,
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          glowSize,
          particle.isUserOwned ? "rgba(74, 222, 128, 0.3)" : "rgba(200, 200, 220, 0.2)",
        )
        if (typeof glow !== "string") {
          if (isSelected) {
            glow.addColorStop(0, "rgba(147, 112, 219, 0.8)")
            glow.addColorStop(0.5, "rgba(147, 112, 219, 0.3)")
            glow.addColorStop(1, "rgba(147, 112, 219, 0)")
          } else if (particle.isUserOwned) {
            glow.addColorStop(0, "rgba(74, 222, 128, 0.6)")
            glow.addColorStop(0.5, "rgba(74, 222, 128, 0.2)")
            glow.addColorStop(1, "rgba(74, 222, 128, 0)")
          } else {
            glow.addColorStop(0, "rgba(200, 200, 220, 0.4)")
            glow.addColorStop(0.5, "rgba(200, 200, 220, 0.1)")
            glow.addColorStop(1, "rgba(200, 200, 220, 0)")
          }
        }
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, glowSize, 0, Math.PI * 2)
        ctx.fill()

        // Particle core
        ctx.fillStyle = isSelected
          ? "rgba(167, 139, 250, 1)"
          : particle.isUserOwned
            ? "rgba(134, 239, 172, 0.95)"
            : "rgba(230, 230, 240, 0.9)"
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2)
        ctx.fill()
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [safeAnimations, selectedPoints, hoveredParticle, removeAnimation])

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isProcessing) return

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const x = (e.clientX - rect.left) * dpr
      const y = (e.clientY - rect.top) * dpr

      const clickedParticle = particlesRef.current.find((p) => {
        const dx = p.x - x
        const dy = p.y - y
        return Math.sqrt(dx * dx + dy * dy) < p.radius * dpr * 3
      })

      if (clickedParticle) {
        const now = Date.now()
        if (lastClickRef.current?.id === clickedParticle.id && now - lastClickRef.current.time < 300) {
          onPointDetail(clickedParticle.id)
          lastClickRef.current = null
        } else {
          onPointSelect(clickedParticle.id)
          lastClickRef.current = { id: clickedParticle.id, time: now }
        }
      }
    },
    [isProcessing, onPointSelect, onPointDetail],
  )

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const x = (e.clientX - rect.left) * dpr
    const y = (e.clientY - rect.top) * dpr

    const hoveredP = particlesRef.current.find((p) => {
      const dx = p.x - x
      const dy = p.y - y
      return Math.sqrt(dx * dx + dy * dy) < p.radius * dpr * 3
    })

    setHoveredParticle(hoveredP?.id || null)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-pointer"
      onClick={handleCanvasClick}
      onMouseMove={handleCanvasMouseMove}
      onMouseLeave={() => setHoveredParticle(null)}
    />
  )
}
