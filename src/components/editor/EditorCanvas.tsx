import { useRef, useEffect, useMemo, useState, useCallback, memo, createContext, useContext } from 'react'
import { Canvas, useThree, useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { OrbitControls } from '@react-three/drei'
import { useEditorStore } from '@/store/editorStore'
import { approachTime, snapTimeToBeat, lerp } from '@/lib/chartUtils'
import { useTheme } from '@/hooks/useTheme'
import type { NoteData, Vector3 as V3, JudgeBox, ChartData, Scene, NoteType, BackgroundLayer, SceneCamera } from '../../../shared/types.js'

const NOTE_COLORS: Record<NoteType, string> = {
  Tap: '#000000',
  Catch: '#facc15',
  Kick: '#ef4444',
  Hold: '#22c55e',
  Stalid: '#a855f7',
}

const BACKGROUND_WIDTH = 40
const BACKGROUND_HEIGHT = 25

function createTextTexture(text: string, fontSize: number, fontFamily: string, fontWeight: string, color: string): { texture: THREE.Texture; aspect: number } {
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
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)
  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  return { texture, aspect: canvas.width / canvas.height }
}

const BackgroundLayerMesh = memo(function BackgroundLayerMesh({
  layer,
  songTime,
}: {
  layer: BackgroundLayer
  songTime: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [textureData, setTextureData] = useState<{ texture: THREE.Texture; aspect: number } | null>(null)

  useEffect(() => {
    if (layer.type === 'text' && layer.text) {
      const result = createTextTexture(
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

  const baseOpacity = layer.opacity ?? 1
  const animDuration = layer.animationDuration ?? 0.5
  const z = layer.z ?? -15

  let animProgress = 1
  let animPhase: 'in' | 'stable' | 'out' = 'stable'

  if (songTime < layer.startTime) {
    animProgress = 0
  } else if (songTime < layer.startTime + animDuration) {
    animProgress = (songTime - layer.startTime) / animDuration
    animPhase = 'in'
  } else if (songTime < layer.endTime - animDuration) {
    animProgress = 1
    animPhase = 'stable'
  } else if (songTime < layer.endTime) {
    animProgress = 1 - (songTime - (layer.endTime - animDuration)) / animDuration
    animPhase = 'out'
  } else {
    animProgress = 0
  }

  animProgress = Math.max(0, Math.min(1, animProgress))

  const currentAnim = animPhase === 'in' ? layer.animationIn : animPhase === 'out' ? layer.animationOut : 'none'

  let opacity = baseOpacity
  let offsetX = 0
  let offsetY = 0
  let scaleMultiplier = 1

  if (currentAnim === 'fade') {
    opacity = baseOpacity * animProgress
  } else if (currentAnim === 'slideUp') {
    const dist = 5
    if (animPhase === 'in') {
      offsetY = -dist * (1 - animProgress)
    } else {
      offsetY = dist * (1 - animProgress)
    }
    opacity = baseOpacity * animProgress
  } else if (currentAnim === 'slideDown') {
    const dist = 5
    if (animPhase === 'in') {
      offsetY = dist * (1 - animProgress)
    } else {
      offsetY = -dist * (1 - animProgress)
    }
    opacity = baseOpacity * animProgress
  } else if (currentAnim === 'slideLeft') {
    const dist = 8
    if (animPhase === 'in') {
      offsetX = dist * (1 - animProgress)
    } else {
      offsetX = -dist * (1 - animProgress)
    }
    opacity = baseOpacity * animProgress
  } else if (currentAnim === 'slideRight') {
    const dist = 8
    if (animPhase === 'in') {
      offsetX = -dist * (1 - animProgress)
    } else {
      offsetX = dist * (1 - animProgress)
    }
    opacity = baseOpacity * animProgress
  } else if (currentAnim === 'zoom') {
    if (animPhase === 'in') {
      scaleMultiplier = 0.3 + 0.7 * animProgress
    } else {
      scaleMultiplier = 0.3 + 0.7 * animProgress
    }
    opacity = baseOpacity * animProgress
  }

  const x = (layer.x - 0.5) * BACKGROUND_WIDTH + offsetX
  const y = (0.5 - layer.y) * BACKGROUND_HEIGHT + offsetY

  let planeWidth = 8
  let planeHeight = 4
  if (textureData) {
    const baseHeight = layer.type === 'text' ? 2 : 5
    const scale = (layer.scale ?? 1) * scaleMultiplier
    planeHeight = baseHeight * scale
    planeWidth = planeHeight * textureData.aspect
  }

  if (animProgress <= 0 || !textureData) return null

  return (
    <mesh ref={meshRef} position={[x, y, z]}>
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

const BackgroundLayers = memo(function BackgroundLayers({
  layers,
  songTime,
}: {
  layers: BackgroundLayer[]
  songTime: number
}) {
  return (
    <group>
      {layers.map((layer) => (
        <BackgroundLayerMesh key={layer.id} layer={layer} songTime={songTime} />
      ))}
    </group>
  )
})

interface SelectionBox {
  startX: number
  startY: number
  currentX: number
  currentY: number
}

export interface CameraControllerApi {
  getCameraState: () => SceneCamera
  setCameraState: (state: SceneCamera) => void
}

const CameraControllerContext = createContext<CameraControllerApi | null>(null)

export function useCameraController() {
  return useContext(CameraControllerContext)
}

function CameraController({
  viewMode,
  cameraMode,
  sceneCamera,
  cameraPreset,
  cameraRotationY,
}: {
  viewMode: 'perspective' | 'top'
  cameraMode: 'free' | 'player'
  sceneCamera?: SceneCamera
  cameraPreset: string
  cameraRotationY: number
}) {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)
  const cameraModeRef = useRef(cameraMode)
  const sceneCameraRef = useRef(sceneCamera)
  const presetRef = useRef(cameraPreset)
  const rotationRef = useRef(cameraRotationY)

  useEffect(() => {
    cameraModeRef.current = cameraMode
  }, [cameraMode])

  useEffect(() => {
    sceneCameraRef.current = sceneCamera
  }, [sceneCamera])

  useEffect(() => {
    presetRef.current = cameraPreset
  }, [cameraPreset])

  useEffect(() => {
    rotationRef.current = cameraRotationY
  }, [cameraRotationY])

  const applyPreset = useCallback(() => {
    if (!controlsRef.current) return

    if (viewMode === 'top') {
      camera.position.set(0, 40, 0.01)
      controlsRef.current.target.set(0, 0, 0)
      controlsRef.current.update()
      return
    }

    if (cameraMode === 'player' && sceneCamera) {
      camera.position.set(sceneCamera.position.x, sceneCamera.position.y, sceneCamera.position.z)
      controlsRef.current.target.set(sceneCamera.target.x, sceneCamera.target.y, sceneCamera.target.z)
      if (sceneCamera.fov && camera instanceof THREE.PerspectiveCamera) {
        camera.fov = sceneCamera.fov
        camera.updateProjectionMatrix()
      }
      controlsRef.current.update()
      return
    }

    const distance = 30
    const target = new THREE.Vector3(0, 0, 0)
    const rotY = rotationRef.current

    let pitch = Math.PI / 4
    let height = distance * Math.sin(pitch)
    let horizontalDist = distance * Math.cos(pitch)

    const preset = presetRef.current
    if (preset === 'top') {
      pitch = Math.PI / 2.1
      height = distance * Math.sin(pitch)
      horizontalDist = distance * Math.cos(pitch)
    } else if (preset === 'default') {
      pitch = Math.PI / 4
      height = distance * Math.sin(pitch)
      horizontalDist = distance * Math.cos(pitch)
    } else if (preset === 'low') {
      pitch = Math.PI / 6
      height = distance * Math.sin(pitch)
      horizontalDist = distance * Math.cos(pitch)
    } else if (preset === 'side') {
      pitch = Math.PI / 4
      height = distance * Math.sin(pitch)
      horizontalDist = distance * Math.cos(pitch)
    }

    const x = target.x + horizontalDist * Math.sin(rotY)
    const z = target.z + horizontalDist * Math.cos(rotY)

    camera.position.set(x, target.y + height, z)
    controlsRef.current.target.copy(target)
    controlsRef.current.update()
  }, [viewMode, cameraMode, sceneCamera, camera])

  useEffect(() => {
    applyPreset()
  }, [viewMode, cameraMode, sceneCamera, cameraPreset, cameraRotationY, applyPreset])

  const api = useMemo<CameraControllerApi>(() => ({
    getCameraState: (): SceneCamera => {
      const controls = controlsRef.current
      const target = controls?.target || new THREE.Vector3()
      return {
        position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        target: { x: target.x, y: target.y, z: target.z },
        fov: camera instanceof THREE.PerspectiveCamera ? camera.fov : undefined,
      }
    },
    setCameraState: (state: SceneCamera) => {
      camera.position.set(state.position.x, state.position.y, state.position.z)
      if (controlsRef.current) {
        controlsRef.current.target.set(state.target.x, state.target.y, state.target.z)
        controlsRef.current.update()
      }
      if (state.fov && camera instanceof THREE.PerspectiveCamera) {
        camera.fov = state.fov
        camera.updateProjectionMatrix()
      }
    },
  }), [camera])

  return (
    <CameraControllerContext.Provider value={api}>
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.1}
        rotateSpeed={0.8}
        zoomSpeed={0.8}
        panSpeed={0.8}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.ROTATE,
        }}
        makeDefault
      />
    </CameraControllerContext.Provider>
  )
}

const JudgeBoxMesh = memo(function JudgeBoxMesh({
  box,
  isSelected,
  tool,
  onSelect,
  onDrag,
}: {
  box: JudgeBox
  isSelected: boolean
  tool: string
  onSelect: (id: string) => void
  onDrag: (id: string, position: V3) => void
}) {
  const { camera, gl, controls } = useThree()
  const dragRef = useRef<{ startPoint: V3; startPosition: V3; plane: THREE.Plane; raycaster: THREE.Raycaster } | null>(null)

  const borderColor = isSelected ? '#fbbf24' : '#818cf8'
  const fillColor = isSelected ? '#fbbf24' : '#6366f1'

  const handlePointerDown = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (tool !== 'select') return
    event.stopPropagation()
    event.nativeEvent.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()
    onSelect(box.id)

    if (controls) {
      (controls as any).enabled = false
    }

    const e = event.nativeEvent as PointerEvent
    const rect = gl.domElement.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -box.position.y)
    const target = new THREE.Vector3()
    raycaster.ray.intersectPlane(plane, target)

    dragRef.current = {
      startPoint: { x: target.x, y: target.y, z: target.z },
      startPosition: { ...box.position },
      plane,
      raycaster,
    }

    const handleMove = (ev: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const r = gl.domElement.getBoundingClientRect()
      const nx = ((ev.clientX - r.left) / r.width) * 2 - 1
      const ny = -((ev.clientY - r.top) / r.height) * 2 + 1
      drag.raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera)
      const t = new THREE.Vector3()
      drag.raycaster.ray.intersectPlane(drag.plane, t)
      const dx = t.x - drag.startPoint.x
      const dz = t.z - drag.startPoint.z
      onDrag(box.id, {
        x: drag.startPosition.x + dx,
        y: drag.startPosition.y,
        z: drag.startPosition.z + dz,
      })
    }

    const handleUp = () => {
      dragRef.current = null
      if (controls) {
        (controls as any).enabled = true
      }
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }, [box, tool, camera, gl.domElement, onSelect, onDrag, controls])

  return (
    <group position={[box.position.x, box.position.y, box.position.z]}>
      <mesh onPointerDown={handlePointerDown}>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color={fillColor} transparent opacity={0.25} depthWrite={false} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(2, 2, 2)]} />
        <lineBasicMaterial color={borderColor} />
      </lineSegments>
    </group>
  )
})

const SpawnLines = memo(function SpawnLines({ center, distance, isDark }: { center: V3; distance: number; isDark: boolean }) {
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

  const color = isDark ? '#64748b' : '#94a3b8'

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={8} array={points} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial color={color} opacity={0.5} transparent />
    </lineSegments>
  )
})

const BeatGridRings = memo(function BeatGridRings({ center, snap, isDark }: { center: V3; snap: number; isDark: boolean }) {
  const rings = useMemo(() => {
    const result = []
    const ringStep = 8 / snap
    const totalRings = Math.floor(16 / ringStep)
    for (let i = 1; i <= totalRings; i++) {
      const r = i * ringStep
      const isMain = i % 4 === 0
      const color = isDark
        ? (isMain ? '#475569' : '#334155')
        : (isMain ? '#94a3b8' : '#cbd5e1')
      result.push(
        <mesh key={i} position={[center.x, center.y, center.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r - 0.03, r + 0.03, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} />
        </mesh>
      )
    }
    return result
  }, [center.x, center.y, center.z, snap, isDark])

  return <>{rings}</>
})

function getNoteWorldPosition(note: NoteData, judgeBox: JudgeBox, songTime: number, difficulty: number): [number, number, number] {
  const ap = note.approachTime ?? approachTime(difficulty)
  const t = (note.hitTime - songTime) / ap
  const clampedT = Math.max(0, Math.min(1, 1 - t))
  const dx = note.position.x - judgeBox.position.x
  const dy = note.position.y - judgeBox.position.y
  const dz = note.position.z - judgeBox.position.z
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
  const extendFactor = dist > 0 ? (judgeBox.spawnDistance + 10) / dist : 1
  const startX = judgeBox.position.x + dx * extendFactor
  const startY = judgeBox.position.y + dy * extendFactor
  const startZ = judgeBox.position.z + dz * extendFactor
  return [
    lerp(startX, judgeBox.position.x, clampedT),
    lerp(startY, judgeBox.position.y, clampedT),
    lerp(startZ, judgeBox.position.z, clampedT),
  ]
}

function isNoteVisible(note: NoteData, songTime: number, difficulty: number): boolean {
  const ap = note.approachTime ?? approachTime(difficulty)
  const t = (note.hitTime - songTime) / ap
  return t >= -0.5 && t <= 1.2
}

const TapNoteMesh = memo(function TapNoteMesh({
  position, selected,
}: {
  position: [number, number, number]
  selected: boolean
}) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.4, 12, 12]} />
        <meshStandardMaterial
          color={NOTE_COLORS.Tap}
          emissive={selected ? '#ffffff' : '#000000'}
          emissiveIntensity={selected ? 0.5 : 0}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.45, 12, 12]} />
        <meshBasicMaterial color="#ffffff" wireframe />
      </mesh>
    </group>
  )
})

const CatchNoteMesh = memo(function CatchNoteMesh({
  position,
  selected,
}: {
  position: [number, number, number]
  selected: boolean
}) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.4, 12, 12]} />
      <meshStandardMaterial
        color={NOTE_COLORS.Catch}
        emissive={selected ? '#ffffff' : '#000000'}
        emissiveIntensity={selected ? 0.5 : 0}
      />
    </mesh>
  )
})

const KickNoteMesh = memo(function KickNoteMesh({
  position,
  direction,
  selected,
}: {
  position: [number, number, number]
  direction: { x: number; y: number }
  selected: boolean
}) {
  const arrowRotation = useMemo(() => {
    const angle = Math.atan2(direction.y, direction.x)
    return [0, -angle, 0] as [number, number, number]
  }, [direction.x, direction.y])

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.4, 12, 12]} />
        <meshStandardMaterial
          color={NOTE_COLORS.Kick}
          emissive={selected ? '#ffffff' : '#000000'}
          emissiveIntensity={selected ? 0.5 : 0}
        />
      </mesh>
      <group rotation={arrowRotation}>
        <mesh position={[0.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.25, 0.6, 6]} />
          <meshStandardMaterial color={NOTE_COLORS.Kick} />
        </mesh>
      </group>
    </group>
  )
})

const HoldNoteMesh = memo(function HoldNoteMesh({
  position,
  holdDuration,
  selected,
  direction,
  note,
  judgeBox,
  songTime,
  difficulty,
}: {
  position: [number, number, number]
  holdDuration: number
  selected: boolean
  direction: [number, number, number]
  note: NoteData
  judgeBox: JudgeBox
  songTime: number
  difficulty: number
}) {
  const ap = note.approachTime ?? approachTime(difficulty)
  const headProgress = (note.hitTime - songTime) / ap
  const baseTailLength = holdDuration * 3

  const eatProgress = Math.max(0, Math.min(1, (songTime - note.hitTime) / Math.max(holdDuration, 0.001)))
  const eatenLength = baseTailLength * eatProgress
  const tailLength = Math.max(0, baseTailLength - eatenLength)
  const tailStartZ = eatenLength

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
    const segs: { width: number; opacity: number; z: number; length: number }[] = []
    const segCount = Math.max(3, Math.floor(tailLength / 0.3))
    for (let i = 0; i < segCount; i++) {
      const t = i / segCount
      const originalT = (tailStartZ / baseTailLength) + t * (tailLength / baseTailLength)
      const width = 0.4 + originalT * 0.6
      const opacity = 0.7 - originalT * 0.5
      const segLen = tailLength / segCount
      const z = tailStartZ + segLen * i + segLen / 2
      segs.push({ width, opacity, z, length: segLen })
    }
    return segs
  }, [tailLength, tailStartZ, baseTailLength])

  const showHead = headProgress > 0
  const showTailSphere = tailLength > 0.5

  return (
    <group position={position} rotation={rotation}>
      {segments.map((seg, i) => (
        <mesh key={i} position={[0, 0, seg.z]}>
          <boxGeometry args={[seg.width, seg.width, seg.length]} />
          <meshStandardMaterial
            color={NOTE_COLORS.Hold}
            emissive={NOTE_COLORS.Hold}
            emissiveIntensity={0.2}
            transparent
            opacity={seg.opacity}
            depthWrite={false}
          />
        </mesh>
      ))}
      {showTailSphere && (
        <>
          <mesh position={[0, 0, tailStartZ + tailLength]}>
            <sphereGeometry args={[0.7, 8, 8]} />
            <meshBasicMaterial color={NOTE_COLORS.Hold} transparent opacity={0.15} />
          </mesh>
          <mesh position={[0, 0, tailStartZ + tailLength]}>
            <sphereGeometry args={[0.55, 8, 8]} />
            <meshBasicMaterial color={NOTE_COLORS.Hold} transparent opacity={0.25} />
          </mesh>
        </>
      )}
      {showHead && (
        <>
          <mesh>
            <sphereGeometry args={[0.4, 12, 12]} />
            <meshStandardMaterial
              color={NOTE_COLORS.Hold}
              emissive={selected ? '#ffffff' : NOTE_COLORS.Hold}
              emissiveIntensity={selected ? 0.5 : 0.3}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.45, 12, 12]} />
            <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.5} />
          </mesh>
        </>
      )}
    </group>
  )
})

const StalidNoteMesh = memo(function StalidNoteMesh({
  position,
  pathNodes,
  selected,
}: {
  position: [number, number, number]
  pathNodes: V3[]
  selected: boolean
}) {
  const pathPoints = useMemo(() => {
    if (pathNodes.length < 2) return new Float32Array()
    const arr: number[] = []
    for (let i = 0; i < pathNodes.length; i++) {
      arr.push(pathNodes[i].x - position[0], pathNodes[i].y - position[1], pathNodes[i].z - position[2])
    }
    return new Float32Array(arr)
  }, [pathNodes, position[0], position[1], position[2]])

  return (
    <group position={position}>
      {pathNodes.length > 1 && (
        <line>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={pathNodes.length} array={pathPoints} itemSize={3} />
          </bufferGeometry>
          <lineBasicMaterial color={NOTE_COLORS.Stalid} />
        </line>
      )}
      <mesh>
        <sphereGeometry args={[0.4, 12, 12]} />
        <meshStandardMaterial
          color={NOTE_COLORS.Stalid}
          emissive={selected ? '#ffffff' : '#000000'}
          emissiveIntensity={selected ? 0.5 : 0}
        />
      </mesh>
    </group>
  )
})

const NoteMesh = memo(function NoteMesh({
  note,
  judgeBox,
  songTime,
  difficulty,
  selected,
  onSelect,
}: {
  note: NoteData
  judgeBox: JudgeBox
  songTime: number
  difficulty: number
  selected: boolean
  onSelect: (ids: string[]) => void
}) {
  const visible = isNoteVisible(note, songTime, difficulty)
  const position = getNoteWorldPosition(note, judgeBox, songTime, difficulty)

  const holdDirection = useMemo((): [number, number, number] => {
    return [
      note.position.x - judgeBox.position.x,
      note.position.y - judgeBox.position.y,
      note.position.z - judgeBox.position.z,
    ]
  }, [note.position, judgeBox.position])

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      onSelect([note.id])
    },
    [onSelect, note.id],
  )

  if (!visible) return null

  let noteContent
  switch (note.type) {
    case 'Tap':
      noteContent = <TapNoteMesh position={position} selected={selected} />
      break
    case 'Catch':
      noteContent = <CatchNoteMesh position={position} selected={selected} />
      break
    case 'Kick':
      noteContent = <KickNoteMesh position={position} direction={note.direction} selected={selected} />
      break
    case 'Hold':
      noteContent = (
        <HoldNoteMesh
          position={position}
          holdDuration={note.holdDuration}
          selected={selected}
          direction={holdDirection}
          note={note}
          judgeBox={judgeBox}
          songTime={songTime}
          difficulty={difficulty}
        />
      )
      break
    case 'Stalid':
      noteContent = <StalidNoteMesh position={position} pathNodes={note.pathNodes} selected={selected} />
      break
    default:
      return null
  }

  return (
    <group onClick={handleClick}>
      {noteContent}
    </group>
  )
})

function InteractionHandler({
  chart,
  scene,
  judgeBox,
  setSelectionBox,
}: {
  chart: ChartData
  scene: Scene
  judgeBox: JudgeBox
  setSelectionBox: (box: SelectionBox | null) => void
}) {
  const { camera, gl } = useThree()
  const snap = useEditorStore((s) => s.snap)
  const raycaster = useRef(new THREE.Raycaster())
  const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), -judgeBox.position.y))
  const dragRef = useRef<
    | { type: 'box'; startX: number; startY: number }
    | { type: 'hold'; noteId: string; startPoint: V3 }
    | { type: 'judgeBox'; judgeBoxId: string; startPoint: V3; startPosition: V3 }
    | null
  >(null)

  useEffect(() => {
    plane.current.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(judgeBox.position.x, judgeBox.position.y, judgeBox.position.z),
    )
  }, [judgeBox.position.x, judgeBox.position.y, judgeBox.position.z])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useEditorStore.getState().cancelStalid()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const getPointerNDC = useCallback((clientX: number, clientY: number) => {
    const rect = gl.domElement.getBoundingClientRect()
    return {
      x: ((clientX - rect.left) / rect.width) * 2 - 1,
      y: -((clientY - rect.top) / rect.height) * 2 + 1,
    }
  }, [gl.domElement])

  const raycastGround = useCallback((clientX: number, clientY: number) => {
    const { x, y } = getPointerNDC(clientX, clientY)
    raycaster.current.setFromCamera(new THREE.Vector2(x, y), camera)
    const target = new THREE.Vector3()
    if (raycaster.current.ray.intersectPlane(plane.current, target)) {
      return { x: target.x, y: target.y, z: target.z }
    }
    return null
  }, [camera, getPointerNDC])

  const snapToGrid = useCallback((groundPoint: V3): V3 => {
    const dx = groundPoint.x - judgeBox.position.x
    const dz = groundPoint.z - judgeBox.position.z
    const absX = Math.abs(dx)
    const absZ = Math.abs(dz)

    let dirX = 0
    let dirZ = 0

    if (absX > absZ) {
      dirX = dx > 0 ? 1 : -1
    } else {
      dirZ = dz > 0 ? 1 : -1
    }

    const distance = Math.sqrt(dx * dx + dz * dz)
    const ringStep = 8 / snap
    const ringIndex = Math.max(1, Math.round(distance / ringStep))
    const snappedDistance = ringIndex * ringStep

    return {
      x: judgeBox.position.x + dirX * snappedDistance,
      y: judgeBox.position.y,
      z: judgeBox.position.z + dirZ * snappedDistance,
    }
  }, [judgeBox.position, snap])

  const projectNoteToScreen = useCallback((note: NoteData) => {
    const state = useEditorStore.getState()
    const pos = getNoteWorldPosition(note, judgeBox, state.songTime, chart.difficulty)
    const p = new THREE.Vector3(pos[0], pos[1], pos[2])
    p.project(camera)
    const rect = gl.domElement.getBoundingClientRect()
    return {
      x: ((p.x + 1) / 2) * rect.width,
      y: (-(p.y - 1) / 2) * rect.height,
    }
  }, [camera, chart.difficulty, gl.domElement, judgeBox])

  const getCanvasOffset = useCallback(() => {
    const rect = gl.domElement.getBoundingClientRect()
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
  }, [gl.domElement])

  const onPointerDown = useCallback((event: ThreeEvent<PointerEvent>) => {
    const e = event.nativeEvent as PointerEvent
    if (e.button !== 0) return
    const state = useEditorStore.getState()
    const groundPoint = raycastGround(e.clientX, e.clientY)
    if (!groundPoint) return

    const offset = getCanvasOffset()
    const x = e.clientX - offset.left
    const y = e.clientY - offset.top

    if (state.tool === 'select') {
      if (e.ctrlKey || e.metaKey) {
        event.stopPropagation()
        dragRef.current = { type: 'box', startX: x, startY: y }
        setSelectionBox({ startX: x, startY: y, currentX: x, currentY: y })
      }
      return
    }

    const position = snapToGrid(groundPoint)
    const ap = approachTime(chart.difficulty)

    if (state.tool === 'tap' || state.tool === 'catch' || state.tool === 'kick') {
      const baseHit = snapTimeToBeat(state.songTime + ap, chart.bpm, chart.offset, state.snap)
      const noteType = state.tool === 'catch' ? 'Catch' : state.tool === 'kick' ? 'Kick' : 'Tap'
      const note: NoteData = {
        id: crypto.randomUUID(),
        type: noteType,
        sceneId: state.currentSceneId || undefined,
        judgeBoxId: state.currentJudgeBoxId || undefined,
        spawnTime: baseHit - ap,
        hitTime: baseHit,
        position,
        ...(state.tool === 'kick' ? { direction: { x: 0, y: 1 } } : {}),
        ...(state.tool === 'catch' ? { catchOnly: false } : {}),
      } as NoteData
      state.addNote(note)
    } else if (state.tool === 'hold') {
      const baseHit = snapTimeToBeat(state.songTime + ap, chart.bpm, chart.offset, state.snap)
      const note: NoteData = {
        id: crypto.randomUUID(),
        type: 'Hold',
        sceneId: state.currentSceneId || undefined,
        judgeBoxId: state.currentJudgeBoxId || undefined,
        spawnTime: baseHit - ap,
        hitTime: baseHit,
        position,
        holdDuration: 0,
      }
      dragRef.current = { type: 'hold', noteId: note.id, startPoint: position }
      state.startHold(note)
    } else if (state.tool === 'stalid') {
      if (e.detail === 2) {
        state.finishStalid()
      } else {
        state.addStalidNode(groundPoint)
      }
    }

    if (!dragRef.current) return

    const handleWindowMove = (ev: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const ox = getCanvasOffset()
      const cx = ev.clientX - ox.left
      const cy = ev.clientY - ox.top
      if (d.type === 'box') {
        setSelectionBox({ startX: d.startX, startY: d.startY, currentX: cx, currentY: cy })
      } else if (d.type === 'hold') {
        const gp = raycastGround(ev.clientX, ev.clientY)
        if (!gp) return
        const dx = gp.x - d.startPoint.x
        const dz = gp.z - d.startPoint.z
        const distance = Math.sqrt(dx * dx + dz * dz)
        useEditorStore.getState().updateHoldDuration(d.noteId, distance / 3)
      }
    }

    const handleWindowUp = (ev: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const ox = getCanvasOffset()
      const ex = ev.clientX - ox.left
      const ey = ev.clientY - ox.top

      if (d.type === 'box') {
        setSelectionBox(null)
        const x1 = Math.min(d.startX, ex)
        const y1 = Math.min(d.startY, ey)
        const x2 = Math.max(d.startX, ex)
        const y2 = Math.max(d.startY, ey)
        const ids: string[] = []
        scene.notes.forEach((note) => {
          const p = projectNoteToScreen(note)
          if (p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2) ids.push(note.id)
        })
        useEditorStore.getState().selectNotes(ids)
      } else if (d.type === 'hold') {
        useEditorStore.getState().finishHold()
      }

      dragRef.current = null
      window.removeEventListener('pointermove', handleWindowMove)
      window.removeEventListener('pointerup', handleWindowUp)
    }

    window.addEventListener('pointermove', handleWindowMove)
    window.addEventListener('pointerup', handleWindowUp)
  }, [chart, getCanvasOffset, raycastGround, scene.notes, setSelectionBox, snapToGrid, projectNoteToScreen])

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[judgeBox.position.x, judgeBox.position.y, judgeBox.position.z]}
      visible={false}
      onPointerDown={onPointerDown}
    >
      <planeGeometry args={[1000, 1000]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}

function CameraStateSaver() {
  const cameraController = useCameraController()
  const currentSceneId = useEditorStore((s) => s.currentSceneId)
  const saveCameraTrigger = useEditorStore((s) => s.saveCameraTrigger)
  const updateScene = useEditorStore((s) => s.updateScene)

  useEffect(() => {
    if (saveCameraTrigger === 0 || !cameraController || !currentSceneId) return
    const state = cameraController.getCameraState()
    updateScene(currentSceneId, { camera: state })
  }, [saveCameraTrigger, cameraController, currentSceneId, updateScene])

  return null
}

export default function EditorCanvas() {
  const chart = useEditorStore((s) => s.chart)
  const currentSceneId = useEditorStore((s) => s.currentSceneId)
  const currentJudgeBoxId = useEditorStore((s) => s.currentJudgeBoxId)
  const songTime = useEditorStore((s) => s.songTime)
  const snap = useEditorStore((s) => s.snap)
  const viewMode = useEditorStore((s) => s.viewMode)
  const cameraMode = useEditorStore((s) => s.cameraMode)
  const cameraPreset = useEditorStore((s) => s.cameraPreset)
  const cameraRotationY = useEditorStore((s) => s.cameraRotationY)
  const selectedNoteIds = useEditorStore((s) => s.selectedNoteIds)
  const selectNotes = useEditorStore((s) => s.selectNotes)
  const setCurrentJudgeBox = useEditorStore((s) => s.setCurrentJudgeBox)
  const updateJudgeBox = useEditorStore((s) => s.updateJudgeBox)
  const tool = useEditorStore((s) => s.tool)
  const stalidDraft = useEditorStore((s) => s.stalidDraft)
  const { isDark } = useTheme()

  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null)

  const scene = chart?.scenes.find((s) => s.id === currentSceneId)
  const judgeBox = scene?.judgeBoxes.find((b) => b.id === currentJudgeBoxId)

  const visibleNotes = useMemo(() => {
    if (!scene || !chart) return []
    const ap = approachTime(chart.difficulty)
    const minTime = songTime - 1
    const maxTime = songTime + ap + 2
    return scene.notes.filter((n) => n.hitTime >= minTime && n.hitTime <= maxTime)
  }, [scene, songTime, chart?.difficulty])

  const getJudgeBoxForNote = useCallback((note: NoteData): JudgeBox => {
    if (!scene) return { id: '', name: '', position: { x: 0, y: 0, z: 0 }, spawnDistance: 10 }
    const box = scene.judgeBoxes.find((b) => b.id === note.judgeBoxId)
    return box || scene.judgeBoxes[0] || { id: '', name: '', position: { x: 0, y: 0, z: 0 }, spawnDistance: 10 }
  }, [scene])

  const handleJudgeBoxSelect = useCallback((id: string) => {
    setCurrentJudgeBox(id)
    selectNotes([])
  }, [setCurrentJudgeBox, selectNotes])

  const handleJudgeBoxDrag = useCallback((id: string, position: V3) => {
    updateJudgeBox(id, { position })
  }, [updateJudgeBox])

  if (!chart || !currentSceneId || !currentJudgeBoxId) return null
  if (!scene || !judgeBox) return null

  const backgroundLayers = chart.backgroundLayers || []

  const bgColor = isDark ? '#0f172a' : '#f8fafc'
  const gridColor1 = isDark ? '#334155' : '#e2e8f0'
  const gridColor2 = isDark ? '#1e293b' : '#f1f5f9'
  const ambientIntensity = isDark ? 0.5 : 0.8
  const directionalIntensity = isDark ? 0.8 : 1

  return (
    <div className="relative w-full h-full">
      <Canvas camera={{ position: [20, 20, 20], fov: 50 }}>
        <color attach="background" args={[bgColor]} />
        <ambientLight intensity={ambientIntensity} />
        <directionalLight position={[10, 20, 10]} intensity={directionalIntensity} />
        <CameraController
          viewMode={viewMode}
          cameraMode={cameraMode}
          sceneCamera={scene?.camera}
          cameraPreset={cameraPreset}
          cameraRotationY={cameraRotationY}
        />
        <CameraStateSaver />
        <BackgroundLayers layers={backgroundLayers} songTime={songTime} />
        <gridHelper
          args={[60, 60, gridColor1, gridColor2]}
          position={[judgeBox.position.x, judgeBox.position.y, judgeBox.position.z]}
        />
        {scene.judgeBoxes.map((box) => (
          <group key={box.id}>
            {box.id === currentJudgeBoxId && (
              <>
                <BeatGridRings center={box.position} snap={snap} isDark={isDark} />
                <SpawnLines center={box.position} distance={box.spawnDistance} isDark={isDark} />
              </>
            )}
            <JudgeBoxMesh
              box={box}
              isSelected={box.id === currentJudgeBoxId}
              tool={tool}
              onSelect={handleJudgeBoxSelect}
              onDrag={handleJudgeBoxDrag}
            />
          </group>
        ))}
        {visibleNotes.map((note) => (
          <NoteMesh
            key={note.id}
            note={note}
            judgeBox={getJudgeBoxForNote(note)}
            songTime={songTime}
            difficulty={chart.difficulty}
            selected={selectedNoteIds.includes(note.id)}
            onSelect={selectNotes}
          />
        ))}
        {stalidDraft && stalidDraft.length > 0 && (
          <group>
            {stalidDraft.length > 1 && (
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    count={stalidDraft.length}
                    array={new Float32Array(stalidDraft.flatMap((p) => [p.x, p.y, p.z]))}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial color="#a855f7" linewidth={2} />
              </line>
            )}
            {stalidDraft.map((p, i) => (
              <mesh key={i} position={[p.x, p.y, p.z]}>
                <sphereGeometry args={[0.2, 6, 6]} />
                <meshBasicMaterial color="#c084fc" />
              </mesh>
            ))}
          </group>
        )}
        <InteractionHandler chart={chart} scene={scene} judgeBox={judgeBox} setSelectionBox={setSelectionBox} />
      </Canvas>

      {selectionBox && (
        <div
          className="absolute pointer-events-none border border-indigo-500 bg-indigo-500/10"
          style={{
            left: Math.min(selectionBox.startX, selectionBox.currentX),
            top: Math.min(selectionBox.startY, selectionBox.currentY),
            width: Math.abs(selectionBox.currentX - selectionBox.startX),
            height: Math.abs(selectionBox.currentY - selectionBox.startY),
          }}
        />
      )}
    </div>
  )
}
