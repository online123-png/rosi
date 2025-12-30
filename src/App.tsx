import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import './App.css'

type ExperienceState = 'TREE' | 'EXPLODE' | 'PHOTO'

const assetUrl = (filename: string) => `${import.meta.env.BASE_URL}${filename}`

const MUSIC_URL = assetUrl('audio.mp3')
const MEDIA_FILES = [
  'image1.webp',
  'image2.webp',
  'image3.webp',
  'image4.webp',
  'image5.webp',
  'image6.webp',
  'image7.webp',
  'image8.webp',
  'image9.webp',
  'image10.webp',
  'image13.webp',
  'video1.mp4',
  'video2.mp4',
  'video3.mp4',
  'video4.mp4',
  'video5.mp4',
  'video6.mp4',
  'video7.mp4',
  'video8.mp4',
  'video9.mp4',
  'video10.mp4',
  'video11.mp4',
  'video12.mp4',
  'video13.mp4',
  'video14.mp4',
  'video15.mp4',
  'video16.mp4',
  'video17.mp4',
  'video18.mp4',
  'video19.mp4',
  'video20.mp4',
  'video21.mp4',
  'video22.mp4',
  'video23.mp4',
].map(assetUrl)

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg'] as const

type MediaEntry =
  | {
      type: 'image'
      texture: THREE.Texture
    }
  | {
      type: 'video'
      texture: THREE.VideoTexture
      video: HTMLVideoElement
    }

const isVideoFile = (file: string) => {
  const lower = file.toLowerCase()
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

const UP_AXIS = new THREE.Vector3(0, 1, 0)

const CONFIG = {
  goldCount: 2000,
  redCount: 300,
  giftCount: 150,
  explodeRadius: 85,  // Aumentado de 65 a 85 para más espacio
  photoOrbitRadius: 30,  // Aumentado de 25 a 30
  treeHeight: 70,
  treeBaseRadius: 35,
  minDistance: 12,  // Distancia mínima entre tarjetas
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const createCustomTexture = (type: 'gold_glow' | 'red_light' | 'gift_red') => {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  const cx = 64
  const cy = 64

  if (type === 'gold_glow') {
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40)
    grd.addColorStop(0, '#FFFFFF')
    grd.addColorStop(0.2, '#FFFFE0')
    grd.addColorStop(0.5, '#FFD700')
    grd.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, 128, 128)
  } else if (type === 'red_light') {
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 50)
    grd.addColorStop(0, '#FFAAAA')
    grd.addColorStop(0.3, '#FF0000')
    grd.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, 128, 128)
  } else {
    ctx.fillStyle = '#D32F2F'
    ctx.fillRect(20, 20, 88, 88)
    ctx.fillStyle = '#FFD700'
    ctx.fillRect(54, 20, 20, 88)
    ctx.fillRect(20, 54, 88, 20)
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'
    ctx.lineWidth = 2
    ctx.strokeRect(20, 20, 88, 88)
  }

  return new THREE.CanvasTexture(canvas)
}

function App() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const stateRef = useRef<ExperienceState>('TREE')
  const selectedIndexRef = useRef(0)
  const videoEntriesRef = useRef<HTMLVideoElement[]>([])

  const [hasStarted, setHasStarted] = useState(false)
  const [currentState, setCurrentState] = useState<ExperienceState>('TREE')

  const setSceneState = useCallback((nextState: ExperienceState) => {
    stateRef.current = nextState
    setCurrentState(nextState)
  }, [])

  useEffect(() => {
    if (!hasStarted || !containerRef.current) {
      return
    }

    const container = containerRef.current
    container.innerHTML = ''

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    const isMobile = window.innerWidth <= 768
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 1)
    container.appendChild(renderer.domElement)
    container.style.cursor = 'grab'

    videoEntriesRef.current = []

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x000000, 0.002)

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)

    const orbit = {
      radius: 100,
      polar: Math.PI / 2.4,
      azimuth: 0,
    }

    const updateCamera = () => {
      const x = orbit.radius * Math.sin(orbit.polar) * Math.sin(orbit.azimuth)
      const y = orbit.radius * Math.cos(orbit.polar)
      const z = orbit.radius * Math.sin(orbit.polar) * Math.cos(orbit.azimuth)
      camera.position.set(x, y, z)
      camera.lookAt(0, 0, 0)
    }
    updateCamera()

    const textureLoader = new THREE.TextureLoader()
    const mediaEntries: MediaEntry[] = MEDIA_FILES.map((file: string) => {
      if (isVideoFile(file)) {
        const video = document.createElement('video')
        video.src = file
        video.muted = true
        video.loop = true
        video.playsInline = true
        video.preload = 'metadata'
        video.crossOrigin = 'anonymous'
        video.load()

        const texture = new THREE.VideoTexture(video)
        texture.needsUpdate = true
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter
        texture.format = THREE.RGBAFormat

        videoEntriesRef.current.push(video)

        return { type: 'video', texture, video }
      }

      const texture = textureLoader.load(file)
      texture.needsUpdate = true
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter

      return { type: 'image', texture }
    })

    const videoEntries = mediaEntries.filter((entry): entry is Extract<MediaEntry, { type: 'video' }> => entry.type === 'video')

    const setVideoPlayback = (entry: MediaEntry | undefined, shouldPlay: boolean) => {
      if (!entry || entry.type !== 'video') {
        return
      }
      if (shouldPlay) {
        if (entry.video.paused) {
          entry.video.play().catch((error: unknown) => {
            console.warn('No se pudo reproducir un video automáticamente.', error)
          })
        }
      } else if (!entry.video.paused) {
        entry.video.pause()
      }
    }

    const textures = {
      gold: createCustomTexture('gold_glow'),
      red: createCustomTexture('red_light'),
      gift: createCustomTexture('gift_red'),
    }

    const createParticleSystem = (type: 'gold' | 'red' | 'gift', count: number, size: number) => {
      const positions: number[] = []
      const explodeTargets: number[] = []
      const treeTargets: number[] = []

      for (let i = 0; i < count; i++) {
        const h = Math.random() * CONFIG.treeHeight
        const y = h - CONFIG.treeHeight / 2
        const radiusRatio = type === 'gold' ? Math.sqrt(Math.random()) : 0.9 + Math.random() * 0.1
        const maxR = (1 - h / CONFIG.treeHeight) * CONFIG.treeBaseRadius
        const r = maxR * radiusRatio
        const theta = Math.random() * Math.PI * 2

        const tx = r * Math.cos(theta)
        const tz = r * Math.sin(theta)
        treeTargets.push(tx, y, tz)

        const u = Math.random()
        const v = Math.random()
        const phi = Math.acos(2 * v - 1)
        const lam = 2 * Math.PI * u
        const radMult = type === 'gift' ? 1.2 : 1.0
        const rad = CONFIG.explodeRadius * Math.cbrt(Math.random()) * radMult

        const ex = rad * Math.sin(phi) * Math.cos(lam)
        const ey = rad * Math.sin(phi) * Math.sin(lam)
        const ez = rad * Math.cos(phi)
        explodeTargets.push(ex, ey, ez)

        positions.push(tx, y, tz)
      }

      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      geometry.userData = { tree: treeTargets, explode: explodeTargets }

      const material = new THREE.PointsMaterial({
        size,
        map: textures[type],
        transparent: true,
        opacity: 1.0,
        blending: type === 'gift' ? THREE.NormalBlending : THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      })

      const points = new THREE.Points(geometry, material)
      scene.add(points)
      return points
    }

    const createMediaPlanes = (): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] => {
      const meshes: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = []
      const photoGeo = new THREE.PlaneGeometry(8, 8)
      const borderGeo = new THREE.PlaneGeometry(9, 9)
      const borderMat = new THREE.MeshBasicMaterial({ color: 0xFFD700 })

      // Función para verificar colisiones
      const isPositionValid = (pos: THREE.Vector3, existingPositions: THREE.Vector3[]) => {
        return !existingPositions.some(p => p.distanceTo(pos) < CONFIG.minDistance)
      }

      const existingPositions: THREE.Vector3[] = []

      mediaEntries.forEach((entry, index) => {
        const material = new THREE.MeshBasicMaterial({ map: entry.texture, side: THREE.DoubleSide })
        const mesh = new THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>(photoGeo.clone(), material)
        const border = new THREE.Mesh(borderGeo.clone(), borderMat)
        border.position.z = -0.1
        mesh.add(border)
        mesh.visible = false
        mesh.scale.set(0, 0, 0)
        mesh.userData.entry = entry

        // Intentar encontrar una posición sin colisiones
        let baseTarget: THREE.Vector3
        let attempts = 0
        const maxAttempts = 50
        
        do {
          const randomAngle = Math.random() * Math.PI * 2
          // Usamos un radio más grande para distribuir mejor
          const radiusMultiplier = 0.8 + Math.random() * 0.8  // Ajustado para más espacio
          const radialDistance = CONFIG.photoOrbitRadius * radiusMultiplier
          // Distribución más uniforme en altura pero empezando más abajo
          const height = -CONFIG.treeHeight * 0.3 + (index / mediaEntries.length) * CONFIG.treeHeight * 0.7
          
          baseTarget = new THREE.Vector3(
            Math.cos(randomAngle) * radialDistance,
            height,
            Math.sin(randomAngle) * radialDistance,
          )
          attempts++
          
          // Si no encontramos una posición válida después de varios intentos, usar esta de todos modos
          if (attempts >= maxAttempts) break
          
        } while (!isPositionValid(baseTarget, existingPositions))
        
        existingPositions.push(baseTarget.clone())
        mesh.userData.baseTarget = baseTarget
        mesh.userData.floatSpeed = 0.6 + Math.random() * 1.4
        mesh.userData.floatPhase = Math.random() * Math.PI * 2 + index

        scene.add(mesh)
        meshes.push(mesh)
      })

      return meshes
    }

    const createDecorations = () => {
      const titleCanvas = document.createElement('canvas')
      titleCanvas.width = 1400  // Aumentado de 1024 a 1400 para más espacio
      titleCanvas.height = 300  // Aumentado ligeramente la altura
      const titleCtx = titleCanvas.getContext('2d')!
      titleCtx.font = 'bold italic 70px "Times New Roman"'  // Reducido el tamaño de fuente de 90px a 70px
      titleCtx.fillStyle = '#FFD700'
      titleCtx.textAlign = 'center'
      titleCtx.shadowColor = '#FF0000'
      titleCtx.shadowBlur = 40
      // Ajustado para centrar en el nuevo ancho (1400/2 = 700) y posición vertical ligeramente más abajo
      titleCtx.fillText('Felices Fiestas RosiPoderosi ♥️', 700, 150)

      const titleTexture = new THREE.CanvasTexture(titleCanvas)
      const titleMaterial = new THREE.MeshBasicMaterial({ 
        map: titleTexture, 
        transparent: true, 
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      })
      const title = new THREE.Mesh(new THREE.PlaneGeometry(60, 15), titleMaterial)
      title.position.set(0, CONFIG.treeHeight / 2 + 10, 0)
      scene.add(title)

      const starCanvas = document.createElement('canvas')
      starCanvas.width = 128
      starCanvas.height = 128
      const sCtx = starCanvas.getContext('2d')!
      sCtx.fillStyle = '#FFFF00'
      sCtx.shadowColor = '#FFFFFF'
      sCtx.shadowBlur = 20
      sCtx.beginPath()
      const cx = 64
      const cy = 64
      const outer = 50
      const inner = 20
      for (let i = 0; i < 5; i++) {
        sCtx.lineTo(cx + Math.cos(((18 + i * 72) / 180) * Math.PI) * outer, cy - Math.sin(((18 + i * 72) / 180) * Math.PI) * outer)
        sCtx.lineTo(cx + Math.cos(((54 + i * 72) / 180) * Math.PI) * inner, cy - Math.sin(((54 + i * 72) / 180) * Math.PI) * inner)
      }
      sCtx.closePath()
      sCtx.fill()
      const starTexture = new THREE.CanvasTexture(starCanvas)
      const starMaterial = new THREE.MeshBasicMaterial({ 
        map: starTexture, 
        transparent: true, 
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      })
      const star = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), starMaterial)
      star.position.set(0, CONFIG.treeHeight / 2 + 2, 0)
      scene.add(star)

      return { title, star, titleTexture, starTexture }
    }

    const updateParticleGroup = (
      group: THREE.Points,
      targetState: ExperienceState,
      speed: number,
      time: number,
      blinking: boolean,
    ) => {
      const positions = group.geometry.getAttribute('position') as THREE.BufferAttribute
      const arr = positions.array as Float32Array
      const targets = group.geometry.userData[targetState === 'TREE' ? 'tree' : 'explode'] as number[]

      for (let i = 0; i < arr.length; i++) {
        arr[i] += (targets[i] - arr[i]) * speed
      }
      positions.needsUpdate = true

      if (targetState === 'TREE') {
        group.rotation.y += 0.003
        if (blinking) {
          const scale = 1 + Math.sin(time * 5) * 0.2
          group.scale.set(scale, scale, scale)
        } else {
          group.scale.set(1, 1, 1)
        }
      } else if (targetState === 'EXPLODE') {
        group.rotation.y += 0.01
        group.scale.set(1, 1, 1)
      } else {
        group.rotation.y += 0.008
        group.scale.set(1, 1, 1)
      }
    }

    const groupGold = createParticleSystem('gold', CONFIG.goldCount, 2.0)
    const groupRed = createParticleSystem('red', CONFIG.redCount, 3.5)
    const groupGift = createParticleSystem('gift', CONFIG.giftCount, 3.0)
    const mediaMeshes = createMediaPlanes()
    const { title, star, titleTexture, starTexture } = createDecorations()

    selectedIndexRef.current = mediaMeshes.length > 0 ? 0 : -1

    const pressedKeys = new Set<string>()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        return
      }

      if (event.code === 'Digit1') {
        setSceneState('TREE')
      } else if (event.code === 'Digit2') {
        setSceneState('EXPLODE')
      } else if (event.code === 'Digit3') {
        setSceneState('PHOTO')
      } else if (event.code === 'ArrowLeft' && stateRef.current === 'PHOTO' && mediaMeshes.length > 0 && selectedIndexRef.current !== -1) {
        selectedIndexRef.current = (selectedIndexRef.current + mediaMeshes.length - 1) % mediaMeshes.length
      } else if (event.code === 'ArrowRight' && stateRef.current === 'PHOTO' && mediaMeshes.length > 0 && selectedIndexRef.current !== -1) {
        selectedIndexRef.current = (selectedIndexRef.current + 1) % mediaMeshes.length
      }

      pressedKeys.add(event.code)
    }

    const onKeyUp = (event: KeyboardEvent) => {
      pressedKeys.delete(event.code)
    }

    const pointer = { dragging: false, moved: false, x: 0, y: 0 }
    const raycaster = new THREE.Raycaster()
    const pointerNDC = new THREE.Vector2()

    const onPointerDown = (event: PointerEvent) => {
      pointer.dragging = true
      pointer.moved = false
      pointer.x = event.clientX
      pointer.y = event.clientY
      container.style.cursor = 'grabbing'
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!pointer.dragging) {
        return
      }
      const dx = event.clientX - pointer.x
      const dy = event.clientY - pointer.y
      pointer.x = event.clientX
      pointer.y = event.clientY
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        pointer.moved = true
      }

      if (stateRef.current === 'PHOTO') {
        // En modo PHOTO, invertimos la dirección vertical (dy) para que sea más intuitivo
        // Movimiento horizontal normal pero con menor sensibilidad
        orbit.azimuth -= dx * 0.002
        // Invertimos la dirección vertical para que sea más natural (arriba = mirar arriba, abajo = mirar abajo)
        orbit.polar = clamp(orbit.polar - dy * 0.002, 0.3, Math.PI - 0.3)
      } else {
        // Comportamiento original para otros modos
        orbit.azimuth -= dx * 0.005
        orbit.polar = clamp(orbit.polar + dy * 0.005, 0.2, Math.PI - 0.2)
      }
    }

    const onPointerUp = (event: PointerEvent) => {
      pointer.dragging = false
      container.style.cursor = 'grab'

      if (!pointer.moved) {
        const rect = renderer.domElement.getBoundingClientRect()
        pointerNDC.set(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1,
        )
        raycaster.setFromCamera(pointerNDC, camera)
        const intersections = raycaster.intersectObjects(mediaMeshes, true)
        if (intersections.length > 0) {
          const targetMesh = intersections[0].object instanceof THREE.Mesh
            ? intersections[0].object
            : intersections[0].object.parent instanceof THREE.Mesh
              ? intersections[0].object.parent
              : null

          if (targetMesh) {
            const meshIndex = mediaMeshes.indexOf(targetMesh as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>)
            if (meshIndex >= 0) {
              selectedIndexRef.current = meshIndex
              setSceneState('PHOTO')
            }
          }
        }
      }
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      orbit.radius = clamp(orbit.radius + event.deltaY * 0.05, 40, 200)
    }

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('resize', onResize)

    let animationId = 0

    const animate = () => {
      animationId = requestAnimationFrame(animate)

      if (pressedKeys.has('KeyA')) {
        orbit.azimuth += 0.02
      }
      if (pressedKeys.has('KeyD')) {
        orbit.azimuth -= 0.02
      }
      if (pressedKeys.has('KeyW')) {
        orbit.polar = clamp(orbit.polar - 0.02, 0.2, Math.PI - 0.2)
      }
      if (pressedKeys.has('KeyS')) {
        orbit.polar = clamp(orbit.polar + 0.02, 0.2, Math.PI - 0.2)
      }
      if (pressedKeys.has('KeyQ')) {
        orbit.radius = clamp(orbit.radius - 0.8, 40, 200)
      }
      if (pressedKeys.has('KeyE')) {
        orbit.radius = clamp(orbit.radius + 0.8, 40, 200)
      }

      updateCamera()

      const time = performance.now() * 0.001
      const state = stateRef.current

      updateParticleGroup(groupGold, state, 0.06, time, false)
      updateParticleGroup(groupRed, state, 0.065, time, true)
      updateParticleGroup(groupGift, state, 0.055, time, false)

      videoEntries.forEach((entry) => {
        if (!entry.video.paused) {
          entry.texture.needsUpdate = true
        }
      })

      if (state === 'TREE') {
        title.visible = true
        star.visible = true
        title.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1)
        star.rotation.z -= 0.02
        mediaMeshes.forEach((mesh) => {
          mesh.scale.lerp(new THREE.Vector3(0, 0, 0), 0.1)
          mesh.visible = false
          setVideoPlayback(mesh.userData.entry as MediaEntry | undefined, false)
        })
      } else if (state === 'EXPLODE') {
        title.visible = false
        star.visible = false
        let bestIdx = 0
        let bestDistance = Infinity

        mediaMeshes.forEach((mesh, i) => {
          mesh.visible = true
          const baseTarget: THREE.Vector3 | undefined = mesh.userData.baseTarget
          const floatSpeed: number = mesh.userData.floatSpeed ?? 1
          const floatPhase: number = mesh.userData.floatPhase ?? 0
          const floatOffset = Math.sin(time * floatSpeed + floatPhase) * 2.5
          let orbitTarget: THREE.Vector3
          if (baseTarget) {
            orbitTarget = baseTarget.clone().applyAxisAngle(UP_AXIS, groupGold.rotation.y)
            orbitTarget.y += floatOffset
          } else {
            orbitTarget = new THREE.Vector3(0, floatOffset, 0)
          }

          mesh.position.lerp(orbitTarget, 0.08)
          mesh.lookAt(camera.position)

          const distanceToCamera = mesh.position.distanceTo(camera.position)
          if (distanceToCamera < bestDistance) {
            bestDistance = distanceToCamera
            bestIdx = i
          }

          const scaleFactor = THREE.MathUtils.clamp(120 / distanceToCamera, 0.6, 1.6)
          mesh.scale.lerp(new THREE.Vector3(scaleFactor, scaleFactor, scaleFactor), 0.1)
          setVideoPlayback(mesh.userData.entry as MediaEntry | undefined, false)
        })

        if (mediaMeshes.length > 0) {
          selectedIndexRef.current = bestIdx
        }

        const selectedMesh = mediaMeshes[selectedIndexRef.current]
        if (selectedMesh) {
          setVideoPlayback(selectedMesh.userData.entry as MediaEntry | undefined, true)
        }
      } else {
        title.visible = false
        star.visible = false

        mediaMeshes.forEach((mesh, i) => {
          if (i === selectedIndexRef.current && selectedIndexRef.current !== -1) {
            mesh.visible = true
            mesh.position.lerp(new THREE.Vector3(0, 0, 60), 0.1)
            mesh.scale.lerp(new THREE.Vector3(5, 5, 5), 0.1)
            mesh.lookAt(camera.position)
            mesh.rotation.z = 0
            setVideoPlayback(mesh.userData.entry as MediaEntry | undefined, true)
          } else {
            mesh.scale.lerp(new THREE.Vector3(0, 0, 0), 0.1)
            if (mesh.scale.x < 0.05) {
              mesh.visible = false
            }
            setVideoPlayback(mesh.userData.entry as MediaEntry | undefined, false)
          }
        })
      }

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationId)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('resize', onResize)

      container.style.cursor = 'auto'
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()

      groupGold.geometry.dispose()
      groupRed.geometry.dispose()
      groupGift.geometry.dispose()
      ;(groupGold.material as THREE.Material).dispose()
      ;(groupRed.material as THREE.Material).dispose()
      ;(groupGift.material as THREE.Material).dispose()
      textures.gold.dispose()
      textures.red.dispose()
      textures.gift.dispose()
      mediaMeshes.forEach((mesh) => {
        mesh.geometry.dispose()
        mesh.material.dispose()
      })
      mediaEntries.forEach((entry) => {
        if (entry.type === 'video') {
          entry.texture.dispose()
          entry.video.pause()
          entry.video.removeAttribute('src')
          entry.video.load()
        } else {
          entry.texture.dispose()
        }
      })
      title.geometry.dispose()
      star.geometry.dispose()
      title.material.dispose()
      star.material.dispose()
      titleTexture.dispose()
      starTexture.dispose()
    }
  }, [hasStarted, setSceneState])

  const handleStart = useCallback(async () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(MUSIC_URL)
      audioRef.current.loop = true
      audioRef.current.volume = 1
    }
    try {
      await audioRef.current.play()
    } catch (error) {
      console.warn('No se pudo reproducir el audio automáticamente.', error)
    }
    setSceneState('TREE')
    setHasStarted(true)
  }, [setSceneState])

  return (
    <div className="app-root">
      <div id="canvas-container" ref={containerRef}></div>
      <div id="ui-layer">
        <div className="guide">
          Ratón: arrastra para orbitar, rueda para acercar. WASD/QE ajustan la cámara. 1/2/3 o los botones cambian de modo.
        </div>
        <div className="controls">
          <div className="controls__title">Modos</div>
          <div className="controls__list">
            <button
              type="button"
              className={`controls__button${currentState === 'TREE' ? ' controls__button--active' : ''}`}
              onClick={() => setSceneState('TREE')}
            >
              Árbol
            </button>
            <button
              type="button"
              className={`controls__button${currentState === 'EXPLODE' ? ' controls__button--active' : ''}`}
              onClick={() => setSceneState('EXPLODE')}
            >
              Explosión
            </button>
            <button
              type="button"
              className={`controls__button${currentState === 'PHOTO' ? ' controls__button--active' : ''}`}
              onClick={() => setSceneState('PHOTO')}
            >
              Galería
            </button>
          </div>
        </div>
        {!hasStarted && (
          <button id="btnStart" type="button" onClick={handleStart}>
            INICIAR
          </button>
        )}
      </div>
    </div>
  )
}

export default App
