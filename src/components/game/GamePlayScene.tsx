import { useRef, useEffect, useMemo, useState, useCallback, memo, forwardRef, useImperativeHandle } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Pause, ArrowLeft } from 'lucide-react'
import { approachTime, lerp, calculateScoreFromPairs } from '@/lib/chartUtils'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import type {
  ChartData,
  NoteData,
  NoteType,
  JudgeBox,
  Scene,
  Judgment,
  NoteJudgmentPair,
  Vector3 as V3,
  BackgroundLayer,
  SceneCamera,
} from '../../../shared/types.js'

interface GamePlaySceneProps {
  chart: ChartData
  currentSceneId: string
  audioUrl?: string
  onEnd: (result: {
    accuracy: number
    score: number
    judgmentCounts: Record<string, number>
    maxCombo: number
  }) => void
  onPause: () => void
}

const NOTE_COLORS: Record<NoteType, string> = {
  Tap: '#0f172a',
  Catch: '#facc15',
  Kick: '#ef4444',
  Hold: '#22c55e',
  Stalid: '#a855f7',
}

const NOTE_EMISSIVE: Record<NoteType, string> = {
  Tap: '#1e293b',
  Catch: '#fde047',
  Kick: '#f87171',
  Hold: '#4ade80',
  Stalid: '#c084fc',
}

const JUDGMENT_COLORS: Record<Judgment, string> = {
  'Perfect+': '#fbbf24',
  Perfect: '#f59e0b',
  Great: '#4ade80',
  Good: '#60a5fa',
  Miss: '#f87171',
}

interface JudgmentEffect {
  id: string
  noteId: string
  judgment: Judgment
  position: [number, number, number]
  createdAt: number
}

function GameCamera({ target, sceneCamera }: { target: [number, number, number]; sceneCamera?: SceneCamera }) {
  const { camera } = useThree()
  const timeRef = useRef(0)
  const targetRef = useRef(target)
  const sceneCameraRef = useRef(sceneCamera)
  const basePosRef = useRef(new THREE.Vector3())
  const lookAtRef = useRef(new THREE.Vector3())

  useEffect(() => {
    targetRef.current = target
  }, [target])

  useEffect(() => {
    sceneCameraRef.current = sceneCamera
    if (sceneCamera?.fov && camera instanceof THREE.PerspectiveCamera) {
      camera.fov = sceneCamera.fov
      camera.updateProjectionMatrix()
    }
  }, [sceneCamera, camera])

  useFrame((_, delta) => {
    timeRef.current += delta
    const t = timeRef.current
    const [tx, ty, tz] = targetRef.current
    const sc = sceneCameraRef.current

    const breathX = Math.sin(t * 0.8) * 0.03
    const breathY = Math.sin(t * 1.2) * 0.02
    const breathZ = Math.cos(t * 0.6) * 0.02

    if (sc) {
      basePosRef.current.set(
        sc.position.x + breathX,
        sc.position.y + breathY,
        sc.position.z + breathZ
      )
      lookAtRef.current.set(sc.target.x, sc.target.y, sc.target.z)
    } else {
      basePosRef.current.set(tx + breathX, ty + 2 + breathY, tz + 8 + breathZ)
      lookAtRef.current.set(tx, ty, tz)
    }

    camera.position.copy(basePosRef.current)
    camera.lookAt(lookAtRef.current)
  })

  return null
}

const Starfield = memo(function Starfield() {
  const starsRef = useRef<THREE.Points>(null)
  const count = 800

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 40 + Math.random() * 60
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = r * Math.cos(phi) * 0.6
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    return arr
  }, [])

  useFrame((state) => {
    if (starsRef.current) {
      starsRef.current.rotation.y = state.clock.elapsedTime * 0.02
      starsRef.current.rotation.x = state.clock.elapsedTime * 0.01
    }
  })

  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color="#ffffff"
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  )
})

const GAME_BG_WIDTH = 30
const GAME_BG_HEIGHT = 18

function createGameTextTexture(text: string, fontSize: number, fontFamily: string, fontWeight: string, color: string): { texture: THREE.Texture; aspect: number } {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const padding = 20
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
  const metrics = ctx.measureText(text)
  const textWidth = metrics.width
  const textHeight = fontSize * 1.2
  canvas.width = textWidth + padding * 2
  canvas.height = textHeight + padding * 2
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = color
  ctx.shadowBlur = 15
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)
  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  return { texture, aspect: canvas.width / canvas.height }
}

const BackgroundLayerGameMesh = memo(function BackgroundLayerGameMesh({
  layer,
  songTime,
  center,
}: {
  layer: BackgroundLayer
  songTime: number
  center: [number, number, number]
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [textureData, setTextureData] = useState<{ texture: THREE.Texture; aspect: number } | null>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = (0.5 - layer.y) * GAME_BG_HEIGHT + center[1] + Math.sin(state.clock.elapsedTime * 0.3) * 0.1
    }
  })

  useEffect(() => {
    if (layer.type === 'text' && layer.text) {
      const result = createGameTextTexture(
        layer.text,
        layer.fontSize || 48,
        layer.fontFamily || 'sans-serif',
        layer.fontWeight || 'normal',
        layer.color || '#ffffff'
      )
      setTextureData(result)
      return () => {
        result.texture.dispose()
      }
    } else if (layer.type === 'image' && layer.imageUrl) {
      const loader = new THREE.TextureLoader()
      loader.load(layer.imageUrl, (tex) => {
        tex.minFilter = THREE.LinearFilter
        tex.magFilter = THREE.LinearFilter
        const aspect = tex.image.width / tex.image.height
        setTextureData({ texture: tex, aspect })
      })
      return () => {
        setTextureData((prev) => {
          if (prev) prev.texture.dispose()
          return null
        })
      }
    }
  }, [layer.type, layer.text, layer.fontSize, layer.fontFamily, layer.fontWeight, layer.color, layer.imageUrl])

  const visible = songTime >= layer.startTime && songTime <= layer.endTime
  const opacity = layer.opacity ?? 1

  const x = (layer.x - 0.5) * GAME_BG_WIDTH + center[0]
  const z = center[2] - 20

  let planeWidth = 8
  let planeHeight = 4
  if (textureData) {
    const baseHeight = layer.type === 'text' ? 2.5 : 6
    const scale = layer.scale ?? 1
    planeHeight = baseHeight * scale
    planeWidth = planeHeight * textureData.aspect
  }

  if (!visible || !textureData) return null

  return (
    <mesh ref={meshRef} position={[x, (0.5 - layer.y) * GAME_BG_HEIGHT + center[1], z]}>
      <planeGeometry args={[planeWidth, planeHeight]} />
      <meshBasicMaterial
        map={textureData.texture}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
})

const BackgroundLayersGame = memo(function BackgroundLayersGame({
  layers,
  songTime,
  center,
}: {
  layers: BackgroundLayer[]
  songTime: number
  center: [number, number, number]
}) {
  return (
    <group>
      {layers.map((layer) => (
        <BackgroundLayerGameMesh key={layer.id} layer={layer} songTime={songTime} center={center} />
      ))}
    </group>
  )
})

const JudgeBoxGame = memo(function JudgeBoxGame({ box }: { box: JudgeBox }) {
  const glowRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (glowRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1
      glowRef.current.scale.set(pulse, pulse, pulse)
    }
  })

  return (
    <group position={[box.position.x, box.position.y, box.position.z]}>
      <mesh ref={glowRef}>
        <boxGeometry args={[2.4, 2.4, 0.3]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <boxGeometry args={[2, 2, 0.1]} />
        <meshStandardMaterial
          color="#1e3a8a"
          emissive="#3b82f6"
          emissiveIntensity={0.5}
          transparent
          opacity={0.8}
        />
      </mesh>
      <lineSegments position={[0, 0, 0.06]}>
        <edgesGeometry args={[new THREE.BoxGeometry(2, 2, 0.1)]} />
        <lineBasicMaterial color="#60a5fa" />
      </lineSegments>
      <mesh position={[0, 0, 0.07]} rotation={[0, 0, Math.PI / 4]}>
        <torusGeometry args={[1.3, 0.03, 8, 32]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.7} />
      </mesh>
    </group>
  )
})

const SpawnLineGame = memo(function SpawnLineGame({
  center,
  distance,
}: {
  center: V3
  distance: number
}) {
  const points = useMemo(() => {
    const arr: number[] = []
    const dirs = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 0, 1],
      [0, 0, -1],
    ]
    dirs.forEach(([dx, dy, dz]) => {
      arr.push(center.x + dx * distance, center.y + dy * distance, center.z + dz * distance)
      arr.push(center.x, center.y, center.z)
    })
    return new Float32Array(arr)
  }, [center.x, center.y, center.z, distance])

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={8}
          array={points}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#475569" transparent opacity={0.5} />
    </lineSegments>
  )
})

function getNoteWorldPosition(
  note: NoteData,
  judgeBox: JudgeBox,
  songTime: number,
  difficulty: number,
): [number, number, number] {
  const ap = note.approachTime ?? approachTime(difficulty)
  const t = (note.hitTime - songTime) / ap
  const clampedT = Math.max(0, Math.min(1, 1 - t))
  return [
    lerp(note.position.x, judgeBox.position.x, clampedT),
    lerp(note.position.y, judgeBox.position.y, clampedT),
    lerp(note.position.z, judgeBox.position.z, clampedT),
  ]
}

function isNoteVisible(
  note: NoteData,
  songTime: number,
  difficulty: number,
): boolean {
  const ap = note.approachTime ?? approachTime(difficulty)
  const holdEnd = note.type === 'Hold' && note.holdDuration ? note.hitTime + note.holdDuration : note.hitTime
  const tHead = (note.hitTime - songTime) / ap
  const tTail = (holdEnd - songTime) / ap
  return tTail >= -0.2 && tHead <= 1.1
}

const TapNoteGame = memo(function TapNoteGame({
  position,
  type,
}: {
  position: [number, number, number]
  type: NoteType
}) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial
          color={NOTE_COLORS[type]}
          emissive={NOTE_EMISSIVE[type]}
          emissiveIntensity={0.3}
          metalness={0.3}
          roughness={0.5}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.42, 16, 16]} />
        <meshBasicMaterial color="#fbbf24" wireframe transparent opacity={0.4} />
      </mesh>
    </group>
  )
})

const CatchNoteGame = memo(function CatchNoteGame({
  position,
}: {
  position: [number, number, number]
}) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.38, 16, 16]} />
        <meshStandardMaterial
          color={NOTE_COLORS.Catch}
          emissive={NOTE_EMISSIVE.Catch}
          emissiveIntensity={0.5}
          metalness={0.4}
          roughness={0.3}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.05, 8, 16]} />
        <meshBasicMaterial color="#fde047" transparent opacity={0.6} />
      </mesh>
    </group>
  )
})

const KickNoteGame = memo(function KickNoteGame({
  position,
  direction,
}: {
  position: [number, number, number]
  direction: { x: number; y: number }
}) {
  const arrowRotation = useMemo(() => {
    const angle = Math.atan2(direction.y, direction.x)
    return [0, -angle, 0] as [number, number, number]
  }, [direction.x, direction.y])

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial
          color={NOTE_COLORS.Kick}
          emissive={NOTE_EMISSIVE.Kick}
          emissiveIntensity={0.4}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
      <group rotation={arrowRotation}>
        <mesh position={[0.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.25, 0.5, 8]} />
          <meshStandardMaterial
            color={NOTE_COLORS.Kick}
            emissive={NOTE_EMISSIVE.Kick}
            emissiveIntensity={0.3}
          />
        </mesh>
      </group>
    </group>
  )
})

const HoldNoteGame = memo(function HoldNoteGame({
  position,
  holdDuration,
  judgeBox,
  note,
  songTime,
  difficulty,
}: {
  position: [number, number, number]
  holdDuration: number
  judgeBox: JudgeBox
  note: NoteData
  songTime: number
  difficulty: number
}) {
  const ap = note.approachTime ?? approachTime(difficulty)
  const tailProgress = (note.hitTime + holdDuration - songTime) / ap
  const headProgress = (note.hitTime - songTime) / ap
  const visibleHead = Math.max(0, Math.min(1, 1 - headProgress))
  const visibleTail = Math.max(0, Math.min(1, 1 - tailProgress))
  const baseTailLength = Math.max(0, visibleHead - visibleTail) * 6

  const eatProgress = Math.max(0, Math.min(1, (songTime - note.hitTime) / Math.max(holdDuration, 0.001)))
  const eatenLength = baseTailLength * eatProgress
  const tailLength = Math.max(0, baseTailLength - eatenLength)
  const tailStartZ = eatenLength

  const headFadeOpacity = useMemo(() => {
    if (headProgress > 0) return 1
    const fadeDuration = 0.15
    const fadeProgress = Math.min(1, (songTime - note.hitTime) / Math.max(fadeDuration, 0.001))
    return Math.max(0, 1 - fadeProgress)
  }, [headProgress, songTime, note.hitTime])

  const direction = useMemo((): [number, number, number] => {
    return [
      note.position.x - judgeBox.position.x,
      note.position.y - judgeBox.position.y,
      note.position.z - judgeBox.position.z,
    ]
  }, [note.position, judgeBox.position])

  const directionNorm = useMemo(() => {
    const len = Math.sqrt(direction[0] ** 2 + direction[1] ** 2 + direction[2] ** 2)
    if (len === 0) return [0, 0, 1] as [number, number, number]
    return [direction[0] / len, direction[1] / len, direction[2] / len] as [number, number, number]
  }, [direction])

  const rotation = useMemo(() => {
    const [dx, , dz] = directionNorm
    const yaw = Math.atan2(dx, dz)
    return [0, yaw, 0] as [number, number, number]
  }, [directionNorm])

  const segments = useMemo(() => {
    if (tailLength <= 0.1 || baseTailLength <= 0) return []
    const segs: { width: number; opacity: number; z: number; length: number; isEatenEdge: boolean }[] = []
    const segCount = Math.max(6, Math.floor(tailLength / 0.15))
    const fadeZoneLength = Math.min(tailLength, 0.8)
    for (let i = 0; i < segCount; i++) {
      const t = i / segCount
      const originalT = (tailStartZ / baseTailLength) + t * (tailLength / baseTailLength)
      const width = 0.35 + originalT * 0.5
      let opacity = 0.85 - originalT * 0.5
      const segLen = tailLength / segCount
      const z = tailStartZ + segLen * i + segLen / 2
      const distFromEatEdge = z - tailStartZ
      if (distFromEatEdge < fadeZoneLength) {
        const fadeT = distFromEatEdge / fadeZoneLength
        opacity *= 0.2 + 0.8 * fadeT
      }
      segs.push({ width, opacity, z, length: segLen, isEatenEdge: i === 0 })
    }
    return segs
  }, [tailLength, tailStartZ, baseTailLength])

  const showHead = headProgress > 0 || headFadeOpacity > 0.01
  const showTailSphere = tailLength > 0.5
  const showEatGlow = eatProgress > 0 && eatProgress < 1 && tailLength > 0.1

  return (
    <group position={position} rotation={rotation}>
      {showEatGlow && (
        <mesh position={[0, 0, tailStartZ]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.3 * (1 - Math.abs(eatProgress - 0.5) * 2)}
          />
        </mesh>
      )}
      {segments.map((seg, i) => (
        <mesh key={i} position={[0, 0, seg.z]}>
          <boxGeometry args={[seg.width, seg.width, seg.length * 1.05]} />
          <meshStandardMaterial
            color={NOTE_COLORS.Hold}
            emissive={NOTE_EMISSIVE.Hold}
            emissiveIntensity={0.5 + (seg.isEatenEdge ? 0.3 : 0)}
            transparent
            opacity={seg.opacity}
            depthWrite={false}
            metalness={0.2}
            roughness={0.5}
          />
        </mesh>
      ))}
      {showTailSphere && (
        <>
          <mesh position={[0, 0, tailStartZ + tailLength]}>
            <sphereGeometry args={[0.6, 12, 12]} />
            <meshBasicMaterial color={NOTE_EMISSIVE.Hold} transparent opacity={0.15} />
          </mesh>
          <mesh position={[0, 0, tailStartZ + tailLength]}>
            <sphereGeometry args={[0.45, 12, 12]} />
            <meshBasicMaterial color={NOTE_EMISSIVE.Hold} transparent opacity={0.35} />
          </mesh>
        </>
      )}
      {showHead && (
        <>
          <mesh>
            <sphereGeometry args={[0.35, 16, 16]} />
            <meshStandardMaterial
              color={NOTE_COLORS.Hold}
              emissive={NOTE_EMISSIVE.Hold}
              emissiveIntensity={0.7}
              metalness={0.3}
              roughness={0.4}
              transparent
              opacity={headFadeOpacity}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.42, 16, 16]} />
            <meshBasicMaterial color="#fbbf24" wireframe transparent opacity={0.5 * headFadeOpacity} />
          </mesh>
        </>
      )}
    </group>
  )
})

const StalidNoteGame = memo(function StalidNoteGame({
  position,
  pathNodes,
}: {
  position: [number, number, number]
  pathNodes: V3[]
}) {
  const pathPoints = useMemo(() => {
    if (pathNodes.length < 2) return new Float32Array()
    const arr: number[] = []
    for (let i = 0; i < pathNodes.length; i++) {
      arr.push(
        pathNodes[i].x - position[0],
        pathNodes[i].y - position[1],
        pathNodes[i].z - position[2],
      )
    }
    return new Float32Array(arr)
  }, [pathNodes, position[0], position[1], position[2]])

  return (
    <group position={position}>
      {pathNodes.length > 1 && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={pathNodes.length}
              array={pathPoints}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={NOTE_COLORS.Stalid} transparent opacity={0.6} />
        </line>
      )}
      <mesh>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial
          color={NOTE_COLORS.Stalid}
          emissive={NOTE_EMISSIVE.Stalid}
          emissiveIntensity={0.5}
          metalness={0.4}
          roughness={0.3}
        />
      </mesh>
      <mesh>
        <octahedronGeometry args={[0.5, 0]} />
        <meshBasicMaterial color="#c084fc" wireframe transparent opacity={0.5} />
      </mesh>
    </group>
  )
})

const NoteMeshGame = memo(function NoteMeshGame({
  note,
  judgeBox,
  songTime,
  difficulty,
}: {
  note: NoteData
  judgeBox: JudgeBox
  songTime: number
  difficulty: number
}) {
  const visible = isNoteVisible(note, songTime, difficulty)
  const position = getNoteWorldPosition(note, judgeBox, songTime, difficulty)

  if (!visible) return null

  switch (note.type) {
    case 'Tap':
      return <TapNoteGame position={position} type={note.type} />
    case 'Catch':
      return <CatchNoteGame position={position} />
    case 'Kick':
      return <KickNoteGame position={position} direction={note.direction} />
    case 'Hold':
      return (
        <HoldNoteGame
          position={position}
          holdDuration={note.holdDuration}
          judgeBox={judgeBox}
          note={note}
          songTime={songTime}
          difficulty={difficulty}
        />
      )
    case 'Stalid':
      return <StalidNoteGame position={position} pathNodes={note.pathNodes} />
    default:
      return null
  }
})

export interface JudgmentEffectsRef {
  addEffect: (id: string, position: [number, number, number], createdAt: number) => void
}

const JudgmentEffects = memo(forwardRef<JudgmentEffectsRef>(function JudgmentEffects(_, ref) {
  const groupRef = useRef<THREE.Group>(null)
  const effectsRef = useRef<Map<string, { group: THREE.Group; createdAt: number }>>(new Map())
  const sphereGeomRef = useRef<THREE.SphereGeometry | null>(null)
  const ringGeomRef = useRef<THREE.RingGeometry | null>(null)

  const addEffect = useCallback((id: string, position: [number, number, number], createdAt: number) => {
    if (!groupRef.current) return
    if (effectsRef.current.has(id)) return

    if (!sphereGeomRef.current) {
      sphereGeomRef.current = new THREE.SphereGeometry(1.5, 12, 12)
    }
    if (!ringGeomRef.current) {
      ringGeomRef.current = new THREE.RingGeometry(0.8, 1.2, 24)
    }

    const group = new THREE.Group()
    group.position.set(position[0], position[1], position[2])

    const sphereMat = new THREE.MeshBasicMaterial({
      color: '#fbbf24',
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const sphere = new THREE.Mesh(sphereGeomRef.current, sphereMat)
    group.add(sphere)

    const ringMat = new THREE.MeshBasicMaterial({
      color: '#60a5fa',
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const ring = new THREE.Mesh(ringGeomRef.current, ringMat)
    ring.scale.setScalar(0.7)
    group.add(ring)

    groupRef.current.add(group)
    effectsRef.current.set(id, { group, createdAt })
  }, [])

  useImperativeHandle(ref, () => ({
    addEffect,
  }), [addEffect])

  useFrame((state) => {
    if (!groupRef.current) return
    const toRemove: string[] = []

    effectsRef.current.forEach((effect, id) => {
      const age = state.clock.elapsedTime - effect.createdAt
      if (age > 0.6) {
        toRemove.push(id)
        return
      }
      const scale = 1 + age * 3
      const opacity = Math.max(0, 1 - age / 0.6)

      effect.group.scale.setScalar(scale)
      const sphere = effect.group.children[0] as THREE.Mesh
      const ring = effect.group.children[1] as THREE.Mesh
      ;(sphere.material as THREE.MeshBasicMaterial).opacity = opacity * 0.4
      ;(ring.material as THREE.MeshBasicMaterial).opacity = opacity * 0.6
    })

    toRemove.forEach((id) => {
      const effect = effectsRef.current.get(id)
      if (effect) {
        groupRef.current?.remove(effect.group)
        effect.group.children.forEach((child) => {
          const mesh = child as THREE.Mesh
          const mat = mesh.material
          if (Array.isArray(mat)) {
            mat.forEach((m) => m.dispose())
          } else if (mat) {
            mat.dispose()
          }
        })
        effectsRef.current.delete(id)
      }
    })
  })

  return <group ref={groupRef} />
}))

function getJudgeBoxForNote(note: NoteData, judgeBoxes: JudgeBox[]): JudgeBox {
  if (note.judgeBoxId) {
    const found = judgeBoxes.find((b) => b.id === note.judgeBoxId)
    if (found) return found
  }
  return judgeBoxes[0]
}

function GameScene({
  scene,
  songTime,
  difficulty,
  backgroundLayers,
  onJudgment,
}: {
  scene: Scene
  songTime: number
  difficulty: number
  backgroundLayers?: BackgroundLayer[]
  onJudgment: (note: NoteData, judgment: Judgment) => void
}) {
  const judgmentEffectsRef = useRef<JudgmentEffectsRef | null>(null)
  const judgedNotesRef = useRef<Set<string>>(new Set())
  const songTimeRef = useRef(songTime)
  const onJudgmentRef = useRef(onJudgment)
  const difficultyRef = useRef(difficulty)
  const judgeBoxesRef = useRef(scene.judgeBoxes)
  const notesRef = useRef(scene.notes)
  const clockRef = useRef(new THREE.Clock())
  const clockStartedRef = useRef(false)

  useEffect(() => {
    songTimeRef.current = songTime
  }, [songTime])

  useEffect(() => {
    onJudgmentRef.current = onJudgment
  }, [onJudgment])

  useEffect(() => {
    difficultyRef.current = difficulty
  }, [difficulty])

  useEffect(() => {
    judgeBoxesRef.current = scene.judgeBoxes
  }, [scene.judgeBoxes])

  useEffect(() => {
    notesRef.current = scene.notes
  }, [scene.notes])

  useFrame(() => {
    if (!clockStartedRef.current) {
      clockRef.current.start()
      clockStartedRef.current = true
    }
    const currentSongTime = songTimeRef.current
    const currentDifficulty = difficultyRef.current
    const judgeBoxes = judgeBoxesRef.current
    const notes = notesRef.current

    if (judgeBoxes.length === 0) return

    for (const note of notes) {
      if (judgedNotesRef.current.has(note.id)) continue
      if (currentSongTime >= note.hitTime) {
        judgedNotesRef.current.add(note.id)
        const judgeBox = getJudgeBoxForNote(note, judgeBoxes)
        const pos = getNoteWorldPosition(note, judgeBox, note.hitTime, currentDifficulty)
        judgmentEffectsRef.current?.addEffect(
          `${note.id}-${note.hitTime}`,
          pos,
          clockRef.current.elapsedTime,
        )
        onJudgmentRef.current(note, 'Perfect+')
      }
    }
  })

  const visibleNotes = useMemo(() => {
    const ap = approachTime(difficulty)
    const minTime = songTime - 2
    const maxTime = songTime + ap + 2
    return scene.notes.filter((n) => {
      const noteEnd = n.type === 'Hold' && n.holdDuration ? n.hitTime + n.holdDuration : n.hitTime
      return noteEnd >= minTime && n.hitTime <= maxTime
    })
  }, [scene.notes, songTime, difficulty])

  const primaryJudgeBox = scene.judgeBoxes[0]
  const center: [number, number, number] = [
    primaryJudgeBox.position.x,
    primaryJudgeBox.position.y,
    primaryJudgeBox.position.z,
  ]

  return (
    <>
      <GameCamera target={center} sceneCamera={scene.camera} />
      <Starfield />
      {backgroundLayers && backgroundLayers.length > 0 && (
        <BackgroundLayersGame layers={backgroundLayers} songTime={songTime} center={center} />
      )}
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 10, 0]} intensity={0.5} color="#60a5fa" />
      <pointLight position={[0, -5, -10]} intensity={0.3} color="#3b82f6" />
      <directionalLight position={[10, 20, 10]} intensity={0.6} />
      {scene.judgeBoxes.map((box) => (
        <group key={box.id}>
          <SpawnLineGame center={box.position} distance={box.spawnDistance} />
          <JudgeBoxGame box={box} />
        </group>
      ))}
      {visibleNotes.map((note) => {
        const noteJudgeBox = getJudgeBoxForNote(note, scene.judgeBoxes)
        return (
          <NoteMeshGame
            key={note.id}
            note={note}
            judgeBox={noteJudgeBox}
            songTime={songTime}
            difficulty={difficulty}
          />
        )
      })}
      <JudgmentEffects ref={judgmentEffectsRef} />
    </>
  )
}

export default function GamePlayScene({
  chart,
  currentSceneId,
  audioUrl,
  onEnd,
  onPause,
}: GamePlaySceneProps) {
  const [songTime, setSongTime] = useState(0)
  const [displayTick, setDisplayTick] = useState(0)

  const scoreRef = useRef(0)
  const accuracyRef = useRef(100)
  const judgmentCountsRef = useRef<Record<string, number>>({
    'Perfect+': 0,
    Perfect: 0,
    Great: 0,
    Good: 0,
    Miss: 0,
  })
  const comboRef = useRef(0)
  const maxComboRef = useRef(0)
  const lastJudgmentRef = useRef<Judgment | null>(null)
  const lastJudgmentTimeRef = useRef(0)

  const allPairsRef = useRef<NoteJudgmentPair[]>([])
  const endedRef = useRef(false)
  const resultRef = useRef({
    accuracy: 100,
    score: 0,
    judgmentCounts: {
      'Perfect+': 0,
      Perfect: 0,
      Great: 0,
      Good: 0,
      Miss: 0,
    },
    maxCombo: 0,
  })
  const onEndRef = useRef(onEnd)

  useEffect(() => {
    onEndRef.current = onEnd
  }, [onEnd])

  const handleEnd = useCallback(() => {
    if (endedRef.current) return
    endedRef.current = true
    onEndRef.current({
      accuracy: resultRef.current.accuracy,
      score: resultRef.current.score,
      judgmentCounts: { ...resultRef.current.judgmentCounts },
      maxCombo: resultRef.current.maxCombo,
    })
  }, [])

  const audio = useAudioEngine(audioUrl, {
    onTimeUpdate: setSongTime,
    onEnded: () => {
      handleEnd()
    },
  })

  const scene = chart.scenes.find((s) => s.id === currentSceneId)

  const totalNotes = useMemo(() => {
    return chart.scenes.reduce((sum, s) => sum + s.notes.length, 0)
  }, [chart])

  const maxTime = useMemo(() => {
    let max = 0
    for (const s of chart.scenes) {
      for (const n of s.notes) {
        if (n.hitTime > max) max = n.hitTime
        if (n.type === 'Hold' && n.hitTime + n.holdDuration > max) {
          max = n.hitTime + n.holdDuration
        }
      }
    }
    return Math.max(max + 2, audio.duration)
  }, [chart, audio.duration])

  const progress = maxTime > 0 ? Math.min(100, (songTime / maxTime) * 100) : 0

  const handleJudgment = useCallback((note: NoteData, judgment: Judgment) => {
    allPairsRef.current.push({ note, judgment, delta: 0 })
    const result = calculateScoreFromPairs(allPairsRef.current)

    scoreRef.current = result.score
    accuracyRef.current = result.accuracy
    judgmentCountsRef.current = {
      'Perfect+': result.judgmentCounts['Perfect+'],
      Perfect: result.judgmentCounts.Perfect,
      Great: result.judgmentCounts.Great,
      Good: result.judgmentCounts.Good,
      Miss: result.judgmentCounts.Miss,
    }

    if (judgment === 'Miss') {
      comboRef.current = 0
    } else {
      comboRef.current += 1
      if (comboRef.current > maxComboRef.current) {
        maxComboRef.current = comboRef.current
      }
    }

    lastJudgmentRef.current = judgment
    lastJudgmentTimeRef.current = performance.now()

    resultRef.current = {
      accuracy: result.accuracy,
      score: result.score,
      judgmentCounts: {
        'Perfect+': result.judgmentCounts['Perfect+'],
        Perfect: result.judgmentCounts.Perfect,
        Great: result.judgmentCounts.Great,
        Good: result.judgmentCounts.Good,
        Miss: result.judgmentCounts.Miss,
      },
      maxCombo: maxComboRef.current,
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayTick((t) => t + 1)
    }, 100)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!audio.hasAudio && totalNotes > 0) {
      let animId: number
      const startTime = performance.now()
      const startSongTime = songTime

      const animate = () => {
        const now = performance.now()
        const elapsed = (now - startTime) / 1000
        const newTime = startSongTime + elapsed
        setSongTime(newTime)

        if (newTime >= maxTime) {
          handleEnd()
          return
        }
        animId = requestAnimationFrame(animate)
      }
      animId = requestAnimationFrame(animate)

      return () => cancelAnimationFrame(animId)
    }
  }, [audio.hasAudio, totalNotes, maxTime, songTime, handleEnd])

  useEffect(() => {
    if (audio.hasAudio && audio.isReady) {
      audio.play()
    }
  }, [audio, audio.hasAudio, audio.isReady])

  if (!scene || !scene.judgeBoxes || scene.judgeBoxes.length === 0) return null

  const score = scoreRef.current
  const accuracy = accuracyRef.current
  const judgmentCounts = judgmentCountsRef.current
  const combo = comboRef.current
  const lastJudgment = lastJudgmentRef.current
  const lastJudgmentAge = performance.now() - lastJudgmentTimeRef.current
  const judgmentOpacity = Math.max(0, 1 - lastJudgmentAge / 800)
  const comboScale = 1 + Math.max(0, (150 - lastJudgmentAge) / 500) * 0.15

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden">
      <Canvas
        camera={{ position: [0, 2, 8], fov: 60, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#020617']} />
        <fog attach="fog" args={['#020617', 20, 80]} />
        <GameScene
          scene={scene}
          songTime={songTime}
          difficulty={chart.difficulty}
          backgroundLayers={chart.backgroundLayers}
          onJudgment={handleJudgment}
        />
      </Canvas>

      <div className="absolute inset-0 pointer-events-none select-none">
        <div className="absolute top-0 left-0 right-0 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onPause}
                className="pointer-events-auto p-3 rounded-xl bg-slate-900/70 hover:bg-slate-800/80 border border-blue-500/30 text-slate-300 hover:text-white transition-all backdrop-blur-sm hover:border-blue-400/50"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                onClick={onPause}
                className="pointer-events-auto p-3 rounded-xl bg-slate-900/70 hover:bg-slate-800/80 border border-blue-500/30 text-slate-300 hover:text-white transition-all backdrop-blur-sm hover:border-blue-400/50"
              >
                <Pause className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center flex-1 mx-8">
              <div className="text-2xl font-bold text-white tracking-wide" style={{ textShadow: '0 0 20px rgba(96, 165, 250, 0.5)' }}>
                {chart.songName}
              </div>
              <div className="text-sm text-slate-400 mt-1">
                {chart.artist}
                <span className="mx-2 text-slate-600">·</span>
                <span className="text-cyan-400 font-semibold">Lv.{chart.difficulty}</span>
              </div>
            </div>

            <div className="text-right">
              <div
                className="text-4xl font-black text-amber-400 tabular-nums tracking-tight"
                style={{ textShadow: '0 0 30px rgba(251, 191, 36, 0.6), 0 0 60px rgba(251, 191, 36, 0.3)' }}
              >
                {score.toLocaleString()}
              </div>
              <div className="text-xl text-cyan-400 font-bold tabular-nums mt-1" style={{ textShadow: '0 0 15px rgba(34, 211, 238, 0.5)' }}>
                {accuracy.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        <div className="absolute right-16 top-1/3 -translate-y-1/2 text-right">
          <div
            className="text-8xl font-black text-cyan-400 tabular-nums transition-transform duration-75"
            style={{
              textShadow: '0 0 40px rgba(34, 211, 238, 0.7), 0 0 80px rgba(34, 211, 238, 0.4), 0 0 120px rgba(34, 211, 238, 0.2)',
              transform: `scale(${comboScale})`,
              transformOrigin: 'right center',
            }}
          >
            {combo}
          </div>
          <div className="text-2xl font-bold text-cyan-300 tracking-widest mt-2" style={{ textShadow: '0 0 20px rgba(34, 211, 238, 0.5)' }}>
            COMBO
          </div>
        </div>

        {lastJudgment && (
          <div
            className="absolute right-16 top-1/3 translate-y-20 text-right"
            style={{ opacity: judgmentOpacity }}
          >
            <div
              className="text-4xl font-black tracking-wider"
              style={{
                color: JUDGMENT_COLORS[lastJudgment],
                textShadow: `0 0 30px ${JUDGMENT_COLORS[lastJudgment]}, 0 0 60px ${JUDGMENT_COLORS[lastJudgment]}80`,
              }}
            >
              {lastJudgment}
            </div>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="relative h-3 bg-slate-900/70 rounded-full overflow-hidden border border-blue-500/30 backdrop-blur-sm">
            <div
              className="absolute inset-y-0 left-0 transition-all duration-100"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #06b6d4 0%, #3b82f6 50%, #fbbf24 100%)',
                boxShadow: '0 0 20px rgba(6, 182, 212, 0.5)',
              }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full transition-all duration-100"
              style={{
                left: `calc(${progress}% - 10px)`,
                background: 'radial-gradient(circle, #fef3c7 0%, #fbbf24 50%, #f59e0b 100%)',
                boxShadow: '0 0 20px rgba(251, 191, 36, 0.8), 0 0 40px rgba(251, 191, 36, 0.4)',
              }}
            />
          </div>
          <div className="flex justify-between mt-3 text-sm text-slate-400 tabular-nums font-medium">
            <span style={{ textShadow: '0 0 10px rgba(148, 163, 184, 0.3)' }}>{formatTime(songTime)}</span>
            <span style={{ textShadow: '0 0 10px rgba(148, 163, 184, 0.3)' }}>{formatTime(maxTime)}</span>
          </div>
        </div>

        <div className="absolute right-6 bottom-24 flex flex-col gap-1.5 text-right">
          <div className="flex items-center justify-end gap-3">
            <span className="text-xs text-slate-500 font-medium tracking-wide">PERFECT+</span>
            <span className="text-lg font-bold text-amber-400 tabular-nums min-w-[3ch]" style={{ textShadow: '0 0 10px rgba(251, 191, 36, 0.5)' }}>
              {judgmentCounts['Perfect+']}
            </span>
          </div>
          <div className="flex items-center justify-end gap-3">
            <span className="text-xs text-slate-500 font-medium tracking-wide">PERFECT</span>
            <span className="text-lg font-bold text-amber-500 tabular-nums min-w-[3ch]" style={{ textShadow: '0 0 10px rgba(245, 158, 11, 0.5)' }}>
              {judgmentCounts.Perfect}
            </span>
          </div>
          <div className="flex items-center justify-end gap-3">
            <span className="text-xs text-slate-500 font-medium tracking-wide">GREAT</span>
            <span className="text-lg font-bold text-green-400 tabular-nums min-w-[3ch]" style={{ textShadow: '0 0 10px rgba(74, 222, 128, 0.5)' }}>
              {judgmentCounts.Great}
            </span>
          </div>
          <div className="flex items-center justify-end gap-3">
            <span className="text-xs text-slate-500 font-medium tracking-wide">GOOD</span>
            <span className="text-lg font-bold text-blue-400 tabular-nums min-w-[3ch]" style={{ textShadow: '0 0 10px rgba(96, 165, 250, 0.5)' }}>
              {judgmentCounts.Good}
            </span>
          </div>
          <div className="flex items-center justify-end gap-3">
            <span className="text-xs text-slate-500 font-medium tracking-wide">MISS</span>
            <span className="text-lg font-bold text-red-400 tabular-nums min-w-[3ch]" style={{ textShadow: '0 0 10px rgba(248, 113, 113, 0.5)' }}>
              {judgmentCounts.Miss}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
