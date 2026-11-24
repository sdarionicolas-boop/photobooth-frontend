<template>
  <div v-show="showBox" id="countdown-timer-container" class="flex flex-center" style="width: 70vw; height: 70vh">
    <!-- long wait: phrases to get ready, the numbers only appear for the last seconds -->
    <!-- no leave transition on purpose: a phrase must be gone the moment the numbers start -->
    <div v-if="showPhrase" id="countdown-phrase" :key="phraseIndex" class="countdown-phrase text-center">{{ currentPhrase }}</div>

    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-show="showMessage" id="countdown-timer-message" style="position: absolute; font-size: 150px" v-html="messageText"></div>
    <div style="height: 100%">
      <!-- div-100%height fixes the max height of the svg to render the circular process not to exhaust the painting area resulting in scrollbars-->
      <q-circular-progress
        id="countdown-circular-progress"
        v-show="showCountdown"
        :show-value="!showMessage"
        style="width: 100%; height: 100%; text-shadow: #222 0 0 10px; font-weight: bold; opacity: 85%"
        :value="Math.min(remainingSeconds, numbersWindow)"
        :min="0"
        :max="numbersWindow"
        reverse
        animation-speed="100"
        font-size="0.5em"
        size="70vh"
        color="secondary"
        class="text-secondary"
        :thickness="0.16"
      >
        {{ Math.ceil(remainingSeconds - 0.001) }}
      </q-circular-progress>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const PHRASE_SECONDS = 2.5 // how long each phrase stays before the next one

let intervalTimerId: number
const remainingSeconds = ref(0)
const startDuration = ref(0)

interface Props {
  duration: number
  messageDuration?: number
  messageText?: string
  /** phrases shown one after the other until the numbers start. empty: only numbers, like before. */
  phrases?: string[]
  /** the numbers are shown for the last seconds only */
  numbersSeconds?: number
}

const props = withDefaults(defineProps<Props>(), {
  messageDuration: 0.5,
  messageText: '😃',
  phrases: () => [],
  numbersSeconds: 3,
})

// numbers window: never longer than the countdown itself, so short countdowns show numbers all the time
const numbersWindow = computed(() => Math.max(1, Math.min(props.numbersSeconds, props.duration)))

const showBox = computed(() => {
  return remainingSeconds.value > 0
})
const showCountdown = computed(() => {
  return remainingSeconds.value > 0 && remainingSeconds.value <= numbersWindow.value
})
const showPhrase = computed(() => {
  return props.phrases.length > 0 && remainingSeconds.value > numbersWindow.value
})
const showMessage = computed(() => {
  return remainingSeconds.value <= props.messageDuration
})

const phraseIndex = computed(() => {
  const elapsed = startDuration.value - remainingSeconds.value
  return Math.max(0, Math.floor(elapsed / PHRASE_SECONDS))
})
const currentPhrase = computed(() => (props.phrases.length > 0 ? props.phrases[phraseIndex.value % props.phrases.length] : ''))

onMounted(() => {
  startTimer()
})

onBeforeUnmount(() => {
  abortTimer()
})

const abortTimer = () => {
  clearInterval(intervalTimerId)
  remainingSeconds.value = 0
}
const startTimer = () => {
  startDuration.value = props.duration
  remainingSeconds.value = startDuration.value

  console.log(`starting timer, duration=${startDuration.value}`)

  intervalTimerId = window.setInterval(() => {
    remainingSeconds.value -= 0.05

    if (remainingSeconds.value <= 0) {
      clearInterval(intervalTimerId)
    }
  }, 50)
}
</script>

<style lang="css">
#countdown-timer-container {
  pointer-events: none;
  user-select: none;
}

/* phrases sit in the upper part so the guest's face stays free */
.countdown-phrase {
  position: fixed;
  top: 12vh;
  left: 5vw;
  right: 5vw;
  font-size: clamp(2rem, 8vw, 5rem);
  font-weight: 800;
  line-height: 1.15;
  color: #fff;
  text-shadow:
    0 0 24px rgba(255, 255, 255, 0.7),
    0 2px 6px rgba(0, 0, 0, 0.8);
}

/* fades in when a new phrase appears; without the animation the phrase is simply visible */
.countdown-phrase {
  animation: countdown-phrase-in 0.4s ease-out backwards;
}
@keyframes countdown-phrase-in {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
}
</style>
