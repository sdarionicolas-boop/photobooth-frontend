<template>
  <q-dialog v-model="open" maximized transition-show="fade" transition-hide="fade">
    <q-card id="background-picker" class="column no-wrap items-center bg-black text-white">
      <div class="text-h4 text-center q-pa-md">{{ $t('LABEL_BACKGROUND_HINT') }}</div>

      <div class="col full-width scroll q-pa-md">
        <div class="row justify-center q-gutter-md">
          <!-- as captured: no background replaced -->
          <q-card class="background-card no-shadow" :class="{ disabled: busy }" @click="choose(null)">
            <div class="background-original flex flex-center">
              <q-icon name="sym_o_hide_image" size="4rem" />
            </div>
            <div class="background-label text-center">{{ $t('LABEL_BACKGROUND_ORIGINAL') }}</div>
          </q-card>

          <q-card v-for="background in backgrounds" :key="background.file" class="background-card no-shadow" :class="{ disabled: busy }" @click="choose(background.file)">
            <q-img :src="background.url" :ratio="4 / 3" loading="lazy" />
            <div class="background-label text-center">{{ background.name }}</div>
          </q-card>
        </div>

        <div v-if="loaded && backgrounds.length === 0" class="text-center q-mt-lg text-h6">{{ $t('LABEL_BACKGROUND_NONE') }}</div>
      </div>

      <div class="q-pa-md">
        <q-btn rounded no-caps color="primary" class="action-button glass-effect" icon="sym_o_arrow_back" :label="$t('BTN_LABEL_BACK')" :disable="busy" @click="open = false" />
      </div>

      <!-- picture is processed (ai background removal) which takes a few seconds -->
      <q-inner-loading :showing="busy" color="white" size="6rem" :label="$t('LABEL_BACKGROUND_WORKING')" label-class="text-white text-h5" />
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Notify } from 'quasar'
import { useI18n } from 'vue-i18n'

interface Background {
  name: string
  file: string
  url: string
}

const props = defineProps<{ id: string }>()
const open = defineModel<boolean>({ default: false })

const { t } = useI18n()
const backgrounds = ref<Background[]>([])
const loaded = ref(false)
const busy = ref(false)

async function loadBackgrounds() {
  try {
    const response = await fetch('/api/background/')
    if (!response.ok) throw new Error(`${response.status}`)
    backgrounds.value = await response.json()
  } catch (error) {
    console.error('loading backgrounds failed', error)
    backgrounds.value = []
  } finally {
    loaded.value = true
  }
}

watch(open, (isOpen) => {
  if (isOpen) loadBackgrounds()
})

async function choose(file: string | null) {
  if (busy.value) return
  busy.value = true
  try {
    const query = file ? `?file=${encodeURIComponent(file)}` : ''
    const response = await fetch(`/api/background/${props.id}${query}`, { method: 'PATCH' })
    if (!response.ok) throw new Error(`${response.status} ${await response.text()}`)
    open.value = false // the updated picture arrives via the sse update of the media collection
  } catch (error) {
    console.error('applying background failed', error)
    Notify.create({ type: 'negative', message: t('MSG_BACKGROUND_FAILED') })
  } finally {
    busy.value = false
  }
}
</script>

<style lang="sass" scoped>
.background-card
  width: min(44vw, 320px)
  cursor: pointer
  border-radius: 12px
  overflow: hidden
  background: #111
  border: 3px solid rgba(255, 255, 255, 0.35)
  &:active
    border-color: white
  &.disabled
    pointer-events: none
    opacity: 0.5

.background-original
  aspect-ratio: 4 / 3
  background: #222

.background-label
  padding: 6px
  font-size: 1.1rem
  color: white
</style>
