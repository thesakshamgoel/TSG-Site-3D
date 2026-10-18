import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import ReelMesh from './ReelMesh'

/**
 * Immersive 3D space that carries the loader's film reel into the site:
 *  - the same reel sits in the world, tilted in 3D, winding as you scroll
 *  - a deep starfield the camera flies through (scroll pushes deeper)
 *  - mouse parallax on the whole rig so the space reacts to the pointer
 */

function rand(i, s) {
  const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453
  return x - Math.floor(x)
}

function Starfield({ count = 850, depth = 60 }) {
  const ref = useRef()
  const matRef = useRef()
  const posBoostRef = useRef(0) // eased scroll *position* → deeper travel
  const velRef = useRef(0) // eased scroll *velocity* → active surge
  const lastYRef = useRef(0)

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rand(i, 1) - 0.5) * 34
      positions[i * 3 + 1] = (rand(i, 2) - 0.5) * 22
      positions[i * 3 + 2] = -rand(i, 3) * depth
      speeds[i] = 0.6 + rand(i, 4) * 1.4
    }
    return { positions, speeds }
  }, [count, depth])

  // warm gold at the top → cool steel-blue as you descend (subtle)
  const colTop = useMemo(() => new THREE.Color('#e9d3a8'), [])
  const colDeep = useMemo(() => new THREE.Color('#7c9cff'), [])
  const scratch = useMemo(() => new THREE.Color(), [])

  // soft radial sprite so each particle renders ROUND (with a glowing falloff)
  const sprite = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const ctx = c.getContext('2d')
    const grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    grd.addColorStop(0, 'rgba(255,255,255,1)')
    grd.addColorStop(0.35, 'rgba(255,255,255,0.75)')
    grd.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.arc(32, 32, 32, 0, Math.PI * 2)
    ctx.fill()
    const tex = new THREE.CanvasTexture(c)
    tex.needsUpdate = true
    return tex
  }, [])

  useFrame((state, delta) => {
    const pts = ref.current
    if (!pts || !matRef.current) return
    const d = Math.min(delta, 0.05)
    const y = window.scrollY || 0

    // ── velocity: how fast you're actively scrolling right now ──
    const rawVel = Math.abs(y - lastYRef.current)
    lastYRef.current = y
    velRef.current += (rawVel - velRef.current) * 0.2 // decays to 0 when you stop
    const v = velRef.current

    // ── position: gentle constant deepening the further down you are ──
    const max = document.documentElement.scrollHeight - window.innerHeight
    const frac = max > 0 ? Math.min(y / max, 1) : 0
    posBoostRef.current += (frac * 1.2 - posBoostRef.current) * 0.05

    // travel speed = idle drift + scroll-velocity warp + gentle deepening
    const boost = 1 + posBoostRef.current + Math.min(v * 0.07, 10)
    const step = d * 6 * boost
    const arr = pts.geometry.attributes.position.array
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 2] += step * speeds[i]
      if (arr[i * 3 + 2] > 6) {
        arr[i * 3] = (rand(i + count, 1) - 0.5) * 34
        arr[i * 3 + 1] = (rand(i + count, 2) - 0.5) * 22
        arr[i * 3 + 2] = -depth
      }
    }
    pts.geometry.attributes.position.needsUpdate = true
    pts.rotation.z = state.clock.elapsedTime * 0.01

    // subtle warm → cool colour drift with scroll depth (no glow ramp)
    scratch.copy(colTop).lerp(colDeep, frac * 0.7)
    matRef.current.color.copy(scratch)
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial ref={matRef} map={sprite} size={0.05} color="#e9d3a8" transparent opacity={0.5} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

/**
 * The reel carried over from the loader — kept subtle so it never fights the
 * text: dim, semi-transparent, set back, and drifting smoothly (left/right/
 * up/down) with a slow professional ease. Scroll only gently nudges it.
 */
function BackgroundReel() {
  const outer = useRef()
  const spinner = useRef()
  const scrollRef = useRef(0)
  const base = { x: 5.4, y: 0.2, z: -7 }

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const targetScroll = window.scrollY || 0
    scrollRef.current += (targetScroll - scrollRef.current) * 0.05
    const s = scrollRef.current

    if (spinner.current) {
      spinner.current.rotation.z = t * 0.08 + s * 0.0009
    }
    if (outer.current) {
      // smooth wandering path (low-frequency Lissajous) — never jerky
      outer.current.position.x = base.x + Math.sin(t * 0.13) * 1.6
      outer.current.position.y = base.y + Math.cos(t * 0.1) * 1.1 - s * 0.0006
      outer.current.position.z = base.z + Math.sin(t * 0.07) * 1.2
      outer.current.rotation.x = -0.42 + Math.sin(t * 0.16) * 0.06
      outer.current.rotation.y = 0.55 + Math.cos(t * 0.12) * 0.08
    }
  })

  return (
    <group ref={outer} position={[base.x, base.y, base.z]} scale={2.3}>
      <ReelMesh ref={spinner} color="#c9a267" tube={0.11} dim={0.25} opacity={0.42} />
    </group>
  )
}

/**
 * Faint cinema set-dressing floating in the deep background — a vintage film
 * camera, a clapperboard and a light meter, all built from primitives and kept
 * dim/semi-transparent so they're felt more than seen. Slow Lissajous drift.
 */
function CineProps() {
  const camRef = useRef()
  const clapRef = useRef()
  const meterRef = useRef()

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (camRef.current) {
      camRef.current.position.y = 1.7 + Math.sin(t * 0.14) * 0.35
      camRef.current.rotation.y = -0.55 + Math.sin(t * 0.08) * 0.12
      camRef.current.rotation.z = Math.sin(t * 0.06) * 0.04
    }
    if (clapRef.current) {
      clapRef.current.position.y = -2.2 + Math.cos(t * 0.11) * 0.3
      clapRef.current.rotation.y = 0.7 + Math.cos(t * 0.09) * 0.15
      clapRef.current.rotation.x = 0.15 + Math.sin(t * 0.07) * 0.06
    }
    if (meterRef.current) {
      meterRef.current.position.y = 2.5 + Math.sin(t * 0.12 + 2) * 0.3
      meterRef.current.rotation.y = t * 0.05
    }
  })

  const mat = {
    color: '#8a7355',
    metalness: 0.85,
    roughness: 0.35,
    transparent: true,
    opacity: 0.3,
  }

  return (
    <group>
      {/* vintage film camera — body, lens, twin reels (far left) */}
      <group ref={camRef} position={[-6.4, 1.7, -7]} scale={1.15}>
        <mesh>
          <boxGeometry args={[1.5, 1, 0.8]} />
          <meshStandardMaterial {...mat} />
        </mesh>
        <mesh position={[1.05, -0.08, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.26, 0.33, 0.7, 20]} />
          <meshStandardMaterial {...mat} />
        </mesh>
        <mesh position={[-0.45, 1, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.55, 0.55, 0.16, 24]} />
          <meshStandardMaterial {...mat} />
        </mesh>
        <mesh position={[0.55, 1, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.55, 0.55, 0.16, 24]} />
          <meshStandardMaterial {...mat} />
        </mesh>
      </group>

      {/* clapperboard (right, low) */}
      <group ref={clapRef} position={[6.6, -2.2, -8]} scale={1.2}>
        <mesh>
          <boxGeometry args={[1.5, 1.05, 0.07]} />
          <meshStandardMaterial {...mat} />
        </mesh>
        <mesh position={[-0.12, 0.66, 0]} rotation={[0, 0, 0.22]}>
          <boxGeometry args={[1.56, 0.2, 0.07]} />
          <meshStandardMaterial {...mat} />
        </mesh>
      </group>

      {/* handheld light meter (upper, deep) */}
      <group ref={meterRef} position={[-3.4, 2.5, -10]}>
        <mesh>
          <boxGeometry args={[0.5, 0.9, 0.22]} />
          <meshStandardMaterial {...mat} />
        </mesh>
        <mesh position={[0, 0.55, 0]}>
          <sphereGeometry args={[0.2, 18, 14]} />
          <meshStandardMaterial
            color="#d8cdb8"
            metalness={0.2}
            roughness={0.3}
            transparent
            opacity={0.32}
          />
        </mesh>
      </group>
    </group>
  )
}

function Rig() {
  useFrame((state) => {
    const { camera, pointer } = state
    // pointer pulls the 3D space into focus toward the cursor
    camera.position.x += (pointer.x * 1.6 - camera.position.x) * 0.035
    camera.position.y += (pointer.y * 1.1 - camera.position.y) * 0.035
    // scroll dolly — scrolling pushes the camera gently into the space
    const targetZ = 6 - Math.min((window.scrollY || 0) * 0.00035, 1.4)
    camera.position.z += (targetZ - camera.position.z) * 0.04
    camera.lookAt(pointer.x * 0.6, pointer.y * 0.4, -6)
  })
  return null
}

// Phones get a lighter scene: fewer particles and a lower pixel-ratio cap keep
// the GPU cool and the frame-rate app-smooth. Decided once at mount.
const isMobile =
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(max-width: 720px)').matches ||
    window.matchMedia?.('(pointer: coarse)').matches)

export default function Scene3D() {
  // Stop rendering entirely while the tab is hidden — no GPU work, no battery
  // or data drain in the background, and nothing to resume-thrash on return.
  const [active, setActive] = useState(
    typeof document === 'undefined' || document.visibilityState !== 'hidden'
  )
  useEffect(() => {
    let raf = null
    const check = () => {
      raf = null
      const hidden = document.visibilityState === 'hidden'
      // an opaque pinned stage fills the screen: nothing of the scene is visible
      const covered = Array.prototype.some.call(document.querySelectorAll('[data-opaque]'), (n) => {
        const r = n.getBoundingClientRect()
        return r.top <= 1 && r.bottom >= window.innerHeight - 1
      })
      setActive(!hidden && !covered)
    }
    const queue = () => { if (raf == null) raf = requestAnimationFrame(check) }
    document.addEventListener('visibilitychange', queue)
    window.addEventListener('scroll', queue, { passive: true })
    window.addEventListener('resize', queue)
    check()
    return () => {
      document.removeEventListener('visibilitychange', queue)
      window.removeEventListener('scroll', queue)
      window.removeEventListener('resize', queue)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    >
      <Canvas
        frameloop={active ? 'always' : 'never'}
        camera={{ position: [0, 0, 6], fov: 62 }}
        dpr={[1, 1]}
        gl={{ antialias: !isMobile, alpha: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <color attach="background" args={['#050506']} />
          <fog attach="fog" args={['#050506', 10, 34]} />
          <ambientLight intensity={0.3} />
          <directionalLight position={[6, 5, 4]} intensity={1.1} color="#fff2dc" />
          <pointLight position={[8, 1, -3]} intensity={16} color="#e9b872" />
          <pointLight position={[-7, -3, -4]} intensity={12} color="#3a4a6a" />

          <Starfield count={isMobile ? 380 : 850} />
          <BackgroundReel />
          {!isMobile && <CineProps />}
          <Rig />
        </Suspense>
      </Canvas>
    </div>
  )
}
