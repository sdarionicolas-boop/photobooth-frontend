<template>
  <q-page id="index-page" class="q-pa-none full-height">
    <preview-stream
      v-if="showPreviewThrottled"
      :index_device="configurationStore.configuration.cameras.index_backend_video"
      :frame-overlay="frameOverlay"
      :fixed-size="fixedSize"
      :enable-blurred-background-stream="configurationStore.configuration.uisettings.livestream_blurredbackground"
      :enable-mirror-effect-stream="configurationStore.configuration.uisettings.livestream_mirror_effect"
      :blurredbackground-high-framerate="configurationStore.configuration.uisettings.livestream_blurredbackground_high_framerate"
    ></preview-stream>

    <!-- layer display processing spinner grid to show user computer working hard -->
    <div v-if="stateStore.isStateProcessing" class="full-height full-width column justify-center content-center" style="position: absolute">
      <q-spinner-grid size="20em" />
    </div>

    <!-- layer display the countdown timer -->
    <div
      v-if="stateStore.isStateCountdown"
      id="frontpage-countdown"
      class="full-height full-width column justify-center content-center"
      style="position: absolute"
    >
      <countdown-timer
        ref="countdowntimer"
        :duration="stateStore.jobmodel.duration"
        :message-duration="configurationStore.configuration.uisettings.TAKEPIC_MSG_TIME"
        :message-text="configurationStore.configuration.uisettings.TAKEPIC_MSG_TEXT"
        :phrases="countdownPhrases"
        :numbers-seconds="configurationStore.configuration.uisettings.COUNTDOWN_NUMBERS_SECONDS"
      ></countdown-timer>
    </div>

    <!-- guided start: event title + date + COMENZAR. The format (photo / strip) is chosen on the next screen. -->
    <div v-if="stateStore.isStateIdle" id="frontpage_text">
      <div class="fixed-center text-center text-white frontpage-event">
        <template v-if="eventTitle">
          <div class="frontpage-event-title" @click="titleTapCounter++">{{ eventTitle }}</div>
          <div v-if="showDate" class="frontpage-event-date">{{ today }}</div>
          <q-btn v-if="triggers.length > 0" id="frontpage-button-start" rounded no-caps class="frontpage-start" @click="onStart">
            {{ $t('BTN_LABEL_START') }}
          </q-btn>
        </template>
        <template v-else>
          <div class="frontpage-event-title">{{ $t('LABEL_SETUP_NEEDED') }}</div>
          <q-btn rounded no-caps class="frontpage-start" @click="router.push('/setup')">{{ $t('BTN_LABEL_SETUP') }}</q-btn>
        </template>
      </div>
    </div>

    <!-- dialog for approval -->
    <div v-if="stateStore.isStateApproval && stateStore.jobmodel.approval_id">
      <MediaItemApprovalViewer
        :approval_id="stateStore.jobmodel.approval_id"
        :number_captures_taken="stateStore.jobmodel.number_captures_taken"
        :total_captures_to_take="stateStore.jobmodel.total_captures_to_take"
      >
      </MediaItemApprovalViewer>
    </div>

    <q-page-sticky position="top-left" class="q-ma-lg">
      <div v-if="stateStore.isStateIdle">
        <div class="q-gutter-md">
          <q-btn
            v-if="configurationStore.configuration.uisettings.show_gallery_on_frontpage"
            id="frontpage-button-to-gallery"
            color="primary"
            no-caps
            rounded
            to="/gallery"
            class="action-button glass-effect"
          >
            <q-icon left name="sym_o_photo_library" />
            <div class="gt-sm">{{ $t('BTN_LABEL_MAINPAGE_TO_GALLERY') }}</div>
          </q-btn>
        </div>
      </div>
    </q-page-sticky>

    <q-page-sticky position="top-right" class="q-ma-lg">
      <div v-if="stateStore.isStateIdle">
        <div class="q-gutter-md">
          <q-btn
            v-if="configurationStore.configuration.uisettings.show_admin_on_frontpage"
            id="frontpage-button-to-admin"
            rounded
            color="transparent"
            no-caps
            class="action-button action-button-admin glass-effect"
            :class="{ 'action-button-admin-invisible': adminButtonInvisible }"
            @click="onBtnAdminClick"
          >
            <q-icon left name="sym_o_admin_panel_settings" />
            <div class="gt-sm">{{ $t('BTN_LABEL_MAINPAGE_TO_ADMIN') }}</div>
          </q-btn>
        </div>
      </div>
    </q-page-sticky>

    <!-- video state controls -->
    <q-page-sticky v-if="stateStore.isStateRecording" id="frontpage-indicator-recording" position="top-right" :offset="[25, 25]" align="center">
      <q-spinner-puff color="red" size="12em" thickness="20" />
    </q-page-sticky>
    <q-page-sticky v-if="stateStore.isStateRecording" id="frontpage-indicator-stop-recording" position="bottom" :offset="[0, 25]" align="center">
      <q-btn stack rounded no-caps color="negative" class="action-button glass-effect" @click="stopRecordingVideo()">
        <q-icon name="sym_o_stop_circle" />
        <div>{{ $t('Stop recording') }}</div>
      </q-btn>
    </q-page-sticky>
  </q-page>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { watchDebounced, refThrottled } from '@vueuse/core'
import { computed, ref } from 'vue'
import { remoteProcedureCall } from '@/util/fetch_api.js'
import { useMainStore } from '@/stores/main-store'
import { useStateStore } from '@/stores/state-store'
import { useConfigurationStore } from '@/stores/configuration-store'
import CountdownTimer from '@/components/CountdownTimer.vue'
import { useToday } from '@/util/useToday'
import { useVisibleTriggers } from '@/util/triggers'
import { default as PreviewStream } from '@/components/PreviewStream.vue'
import _ from 'lodash'
import MediaItemApprovalViewer from '@/components/MediaItemApprovalViewer.vue'
import type { UiFrameOverlay } from '@/dto/generated'
import type { Size2D } from '@/util/streamRenderer.ts'
const mainStore = useMainStore()
const stateStore = useStateStore()
const configurationStore = useConfigurationStore()
const router = useRouter()
const btnAdminClickCounter = ref(0)

const today = useToday()
const triggers = useVisibleTriggers()
// before the first photo other phrases than before the second and following ones ("pose for the next photo")
const countdownPhrases = computed(() => {
  const ui = configurationStore.configuration.uisettings
  return stateStore.jobmodel.number_captures_taken > 0 ? ui.COUNTDOWN_PHRASES_NEXT : ui.COUNTDOWN_PHRASES_FIRST
})
const eventTitle = computed(() => configurationStore.configuration.uisettings.FRONTPAGE_TITLE?.trim() ?? '')
const showDate = computed(() => configurationStore.configuration.uisettings.FRONTPAGE_SHOW_DATE)

// five quick taps on the title open the setup screen where the operator types the event phrase
const titleTapCounter = ref(0)
watchDebounced(
  titleTapCounter,
  () => {
    if (titleTapCounter.value >= 5) {
      router.push('/setup')
    }
    titleTapCounter.value = 0
  },
  { debounce: 500 }
)

// one visible action: start it right away, otherwise let the guest choose (photo or strip)
const onStart = () => {
  if (triggers.value.length === 1) {
    mainStore.startAction(triggers.value[0]!)
  } else {
    router.push('/choose')
  }
}

watchDebounced(
  btnAdminClickCounter,
  () => {
    if (btnAdminClickCounter.value >= 5) {
      router.push('/admin')
    }
    btnAdminClickCounter.value = 0
  },
  { debounce: 500 }
)
const adminButtonInvisible = computed(() => {
  return configurationStore.configuration.uisettings.admin_button_invisible
})

const showPreview = computed(() => {
  const enabledWhenIdle = configurationStore.configuration.uisettings.enable_livestream_when_idle
  const enabledWhenActive = configurationStore.configuration.uisettings.enable_livestream_when_active
  const machineIdle = stateStore.isStateIdle
  const machineRecord = stateStore.isStateRecording
  const machineCounting = stateStore.isStateCountdown
  const machineCapture = stateStore.isStateCapture

  // allow user to choose if shown during idle or process only. during record it cannot be disabled because video useful to show while recording
  return (machineIdle && enabledWhenIdle) || ((machineCounting || machineCapture) && enabledWhenActive) || machineRecord
})
// following is to avoid short time preview requested. there is a race condition when the state machine finishes and short time target is present.
// right after present it changes to finished and so the route is changed to presenter + the preview component is enabled which causes issues because
// just a moment later it's disabled again.
const showPreviewThrottled = refThrottled(showPreview, 500)

const fixedSize = computed((): Size2D | null => {
  console.log('fixedSize determined:')
  console.info(stateStore.jobmodel)
  const captureDefinition = stateStore.jobmodel.captures_definition

  if (captureDefinition) {
    return {
      width: captureDefinition.width,
      height: captureDefinition.height,
    }
  } else {
    return null
  }
})
const frameOverlay = computed((): UiFrameOverlay | null => {
  const idleFrameOverlay = configurationStore.configuration.uisettings.livestream_frameoverlay
  const actionFrameOverlay = stateStore.jobmodel.frame_overlay

  if (stateStore.isStateCountdown && actionFrameOverlay) {
    //during countdown the action frame is priorized if the action has this feature...
    return actionFrameOverlay
  } else if (stateStore.isStateIdle && idleFrameOverlay.enable && idleFrameOverlay.image) {
    // the live frame is shown in idle only
    return idleFrameOverlay as UiFrameOverlay
  } else {
    return null
  }
})

const onBtnAdminClick = () => {
  if (adminButtonInvisible.value) {
    btnAdminClickCounter.value++
  } else {
    router.push('/admin')
  }
}
const stopRecordingVideo = () => {
  remoteProcedureCall('/api/processing/next')
}
</script>

<style lang="sass">
// if button shall be invisible, set it to transparent and on mouseover use default cursor, no pointer
.action-button-admin-invisible
  opacity: 0.0
  cursor: default

// event title on the first screen
.frontpage-event
  width: 92vw
  text-shadow: 0 0 24px rgba(255, 255, 255, 0.6)

.frontpage-event-title
  font-size: clamp(2.5rem, 10vw, 7rem)
  font-weight: 800
  line-height: 1.1
  overflow-wrap: anywhere
  pointer-events: auto // #frontpage_text itself ignores the pointer; the title counts taps to open the setup

.frontpage-event-date
  font-size: clamp(1.5rem, 5vw, 3.5rem)
  letter-spacing: 0.2em
  margin-top: 1.5rem
  opacity: 0.9

// big call to action, bright so it shows through the mirror glass
.frontpage-start
  pointer-events: auto
  margin-top: 4rem
  padding: 1rem 3.5rem
  font-size: clamp(1.8rem, 6vw, 3rem)
  font-weight: 800
  letter-spacing: 0.25em
  background: #fff !important
  color: #000 !important
  box-shadow: 0 0 30px rgba(255, 255, 255, 0.7)
  animation: frontpage-start-pulse 2.2s ease-in-out infinite

@keyframes frontpage-start-pulse
  0%, 100%
    box-shadow: 0 0 18px rgba(255, 255, 255, 0.45)
    transform: scale(1)
  50%
    box-shadow: 0 0 46px rgba(255, 255, 255, 0.9)
    transform: scale(1.04)
</style>
