<template>
  <q-page id="signature-page" class="column items-center justify-center q-pa-md no-wrap">
    <div class="signature-hint text-h5 q-mb-md">{{ $t('LABEL_SIGNATURE_HINT') }}</div>

    <!-- picture with a transparent canvas of the very same size on top, so strokes line up with the picture -->
    <div class="signature-stage">
      <img ref="imageEl" class="signature-image" :src="imageUrl" alt="" draggable="false" @load="onImageLoad" />
      <canvas
        ref="canvasEl"
        class="signature-canvas"
        @pointerdown.prevent="onPointerDown"
        @pointermove.prevent="onPointerMove"
        @pointerup.prevent="onPointerEnd"
        @pointercancel.prevent="onPointerEnd"
        @pointerleave.prevent="onPointerEnd"
      ></canvas>
    </div>

    <div class="row q-gutter-md q-mt-md items-center justify-center">
      <q-btn
        v-for="color in penColors"
        :key="color"
        round
        :style="{ backgroundColor: color }"
        class="pen-color"
        :class="{ 'pen-color-active': color === penColor }"
        :aria-label="color"
        @click="penColor = color"
      />
    </div>

    <div class="row q-gutter-md q-mt-md items-center justify-center">
      <q-btn stack rounded no-caps color="primary" class="action-button glass-effect" icon="sym_o_arrow_back" :label="$t('BTN_LABEL_CANCEL')" @click="goBack" />
      <q-btn stack rounded no-caps color="primary" class="action-button glass-effect" icon="sym_o_ink_eraser" :label="$t('BTN_LABEL_SIGNATURE_CLEAR')" @click="clearCanvas" />
      <q-btn
        stack
        rounded
        no-caps
        color="positive"
        class="action-button glass-effect"
        icon="sym_o_check"
        :label="$t('BTN_LABEL_SIGNATURE_SAVE')"
        :loading="saving"
        :disable="!hasStrokes"
        @click="save"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Notify } from 'quasar'
import { useI18n } from 'vue-i18n'
import { useMediacollectionStore } from '@/stores/mediacollection-store'

const MAX_CANVAS_WIDTH = 1600 // limits upload size; the backend scales the signature to the picture anyway

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const mediacollectionStore = useMediacollectionStore()

const id = computed(() => String(route.params.id))
const imageEl = ref<HTMLImageElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const penColors = ['#ffffff', '#000000', '#ff3b3b', '#ffd400', '#3bb2ff']
const penColor = ref(penColors[0])
const hasStrokes = ref(false)
const saving = ref(false)

const item = computed(() => mediacollectionStore.collection.find((i) => i.id === id.value))
const imageUrl = computed(() => `/media/full/${id.value}${item.value ? `?rev=${item.value.revision}` : ''}`)

let drawing = false
let lastPoint: { x: number; y: number } | null = null

function onImageLoad() {
  const img = imageEl.value
  const canvas = canvasEl.value
  if (!img || !canvas) return
  const scale = Math.min(1, MAX_CANVAS_WIDTH / img.naturalWidth)
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
}

function pointFromEvent(event: PointerEvent) {
  const canvas = canvasEl.value!
  const rect = canvas.getBoundingClientRect()
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  }
}

function drawSegment(from: { x: number; y: number }, to: { x: number; y: number }) {
  const canvas = canvasEl.value!
  const ctx = canvas.getContext('2d')!
  ctx.strokeStyle = penColor.value
  ctx.lineWidth = Math.max(4, canvas.width / 160)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.stroke()
}

function onPointerDown(event: PointerEvent) {
  const canvas = canvasEl.value
  if (!canvas) return
  canvas.setPointerCapture(event.pointerId)
  drawing = true
  lastPoint = pointFromEvent(event)
  drawSegment(lastPoint, lastPoint) // a tap leaves a dot
  hasStrokes.value = true
}

function onPointerMove(event: PointerEvent) {
  if (!drawing || !lastPoint) return
  const point = pointFromEvent(event)
  drawSegment(lastPoint, point)
  lastPoint = point
}

function onPointerEnd() {
  drawing = false
  lastPoint = null
}

function clearCanvas() {
  const canvas = canvasEl.value
  if (!canvas) return
  canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
  hasStrokes.value = false
}

function goBack() {
  router.replace({ name: 'itempresenter', params: { id: id.value } })
}

async function save() {
  const canvas = canvasEl.value
  if (!canvas || !hasStrokes.value) return

  saving.value = true
  try {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('canvas is empty')

    const response = await fetch(`/api/signature/${id.value}`, {
      method: 'POST',
      headers: { 'Content-Type': 'image/png' },
      body: blob,
    })
    if (!response.ok) throw new Error(`${response.status} ${await response.text()}`)

    goBack()
  } catch (error) {
    console.error('saving signature failed', error)
    Notify.create({ type: 'negative', message: t('MSG_SIGNATURE_SAVE_FAILED') })
  } finally {
    saving.value = false
  }
}
</script>

<style lang="sass" scoped>
#signature-page
  user-select: none

.signature-stage
  position: relative
  display: inline-block
  line-height: 0
  max-width: 100%

.signature-image
  max-width: 100%
  max-height: 65vh
  object-fit: contain
  border-radius: 8px

.signature-canvas
  position: absolute
  inset: 0
  width: 100%
  height: 100%
  touch-action: none
  cursor: crosshair

.pen-color
  width: 3rem
  height: 3rem
  border: 3px solid rgba(255, 255, 255, 0.4)

.pen-color-active
  border-color: white
  transform: scale(1.2)
</style>
