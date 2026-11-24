<template>
  <q-page id="setup-page" class="column items-center q-pa-md">
    <div class="setup-heading text-center q-mt-xl q-mb-md">{{ $t('LABEL_SETUP_HEADING') }}</div>

    <q-input
      v-model="title"
      outlined
      dark
      color="white"
      class="setup-input"
      input-class="setup-input-text text-center"
      :label="$t('LABEL_SETUP_PHRASE')"
      placeholder="MIS XV LUCIA♥"
      maxlength="40"
      counter
      :inputmode="showKeyboard ? 'none' : undefined"
      :autofocus="showKeyboard"
      @keyup.enter="save"
    >
      <template #append>
        <q-btn
          flat
          round
          dense
          :color="showKeyboard ? 'primary' : 'grey'"
          icon="sym_o_keyboard"
          :aria-label="$t('Toggle on-screen keyboard')"
          @mousedown.prevent
          @click="showKeyboard = !showKeyboard"
        />
      </template>
    </q-input>

    <!-- symbols that are hard to type -->
    <div class="row q-gutter-sm q-mt-sm justify-center">
      <q-btn v-for="symbol in symbols" :key="symbol" dense outline rounded class="symbol-btn" @click="title += symbol">{{ symbol }}</q-btn>
    </div>

    <div v-if="showKeyboard" class="setup-keyboard q-mt-md full-width">
      <on-screen-keyboard v-model="title" v-model:mode="keyboardMode" layout="qwerty" @enter="save" />
    </div>

    <q-input
      v-model="stripText"
      outlined
      dark
      color="white"
      class="setup-input q-mt-md"
      input-class="text-center"
      :label="$t('LABEL_SETUP_STRIP_TEXT')"
      :hint="$t('LABEL_SETUP_STRIP_HINT')"
      maxlength="40"
      @keyup.enter="save"
    />

    <q-toggle v-model="showDate" dark color="white" class="q-mt-md" :label="$t('LABEL_SETUP_SHOW_DATE')" />

    <!-- preview, same look as the first screen of the guests -->
    <div class="setup-preview q-mt-md text-center text-white">
      <div class="setup-preview-title">{{ title || 'MIS XV LUCIA♥' }}</div>
      <div v-if="showDate" class="setup-preview-date">{{ today }}</div>
    </div>

    <div class="row q-gutter-md q-mt-md justify-center">
      <q-btn rounded no-caps size="lg" class="setup-save" :loading="saving" :disable="!title.trim()" @click="save">
        {{ $t('BTN_LABEL_SETUP_SAVE') }}
      </q-btn>
      <q-btn rounded no-caps outline color="white" size="lg" @click="router.push('/admin')">{{ $t('BTN_LABEL_SETUP_ADMIN') }}</q-btn>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Notify, useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { useLocalStorage } from '@vueuse/core'
import { _fetch } from '@/util/fetch_api.js'
import { useToday } from '@/util/useToday'
import { useConfigurationStore } from '@/stores/configuration-store'
import OnScreenKeyboard, { type KeyboardMode } from '@/components/OnScreenKeyboard.vue'

const router = useRouter()
const $q = useQuasar()
const { t } = useI18n()
const configurationStore = useConfigurationStore()
const today = useToday()

const symbols = ['♥', '♡', '★', '✦', '&', '❀', '♪']
const title = ref(configurationStore.configuration.uisettings.FRONTPAGE_TITLE ?? '')
const showDate = ref(configurationStore.configuration.uisettings.FRONTPAGE_SHOW_DATE)
const stripText = ref(configurationStore.configuration.uisettings.STRIP_TEXT ?? '')
const saving = ref(false)

// kiosk mode has no system keyboard, so the in-app one is on by default on touch screens
const showKeyboard = useLocalStorage('setupShowOnScreenKeyboard', $q.platform.has.touch)
const keyboardMode = useLocalStorage<KeyboardMode>('setupOnScreenKeyboardMode', 'text')

const save = async () => {
  const phrase = title.value.trim()
  if (!phrase || saving.value) return

  saving.value = true
  try {
    // the admin endpoint takes the whole app config, so read it (with secrets), change two fields and write it back
    const current = await (await _fetch('/api/admin/config/app')).json()
    current.uisettings.FRONTPAGE_TITLE = phrase
    current.uisettings.FRONTPAGE_SHOW_DATE = showDate.value
    current.uisettings.STRIP_TEXT = stripText.value.trim()

    const response = await _fetch('/api/admin/config/app?reload=false', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(current),
    })
    if (!response.ok) throw new Error(`${response.status} ${await response.text()}`)

    configurationStore.configuration.uisettings.FRONTPAGE_TITLE = phrase
    configurationStore.configuration.uisettings.FRONTPAGE_SHOW_DATE = showDate.value
    configurationStore.configuration.uisettings.STRIP_TEXT = stripText.value.trim()
    router.push('/')
  } catch (error) {
    console.error('saving the event phrase failed', error)
    Notify.create({ type: 'negative', message: t('MSG_SETUP_SAVE_FAILED') })
  } finally {
    saving.value = false
  }
}
</script>

<style lang="sass" scoped>
.setup-heading
  font-size: clamp(1.6rem, 5vw, 2.6rem)
  font-weight: 800
  letter-spacing: 0.08em

.setup-input
  width: min(92vw, 820px)

:deep(.setup-input-text)
  font-size: clamp(1.6rem, 5vw, 2.6rem)
  font-weight: 800

.symbol-btn
  min-width: 3rem
  font-size: 1.4rem
  color: #fff

.setup-keyboard
  max-width: 900px

.setup-preview
  width: min(92vw, 820px)
  padding: 1.5rem 1rem
  border: 1px dashed rgba(255, 255, 255, 0.35)
  border-radius: 16px
  background: #000
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.5)

.setup-preview-title
  font-size: clamp(1.8rem, 7vw, 4rem)
  font-weight: 800
  line-height: 1.1
  overflow-wrap: anywhere

.setup-preview-date
  font-size: clamp(1.1rem, 3.5vw, 2rem)
  letter-spacing: 0.2em
  margin-top: 0.6rem
  opacity: 0.9

.setup-save
  background: #fff !important
  color: #000 !important
  font-weight: 800
  letter-spacing: 0.1em
</style>
