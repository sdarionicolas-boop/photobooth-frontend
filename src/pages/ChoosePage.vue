<template>
  <q-page id="choose-page" class="column flex-center q-pa-md">
    <div class="choose-title text-center q-mb-xl">{{ $t('LABEL_CHOOSE_FORMAT') }}</div>

    <div class="column items-center q-gutter-xl full-width">
      <q-btn
        v-for="trigger in triggers"
        :key="`${trigger.action}-${trigger.config_index}`"
        stack
        no-caps
        rounded
        class="choose-card"
        @click="mainStore.startAction(trigger)"
      >
        <q-icon v-if="trigger.icon" :name="`sym_o_${trigger.icon}`" class="choose-card-icon" />
        <div class="choose-card-label">{{ trigger.title }}</div>
      </q-btn>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useMainStore } from '@/stores/main-store'
import { useVisibleTriggers } from '@/util/triggers'

const mainStore = useMainStore()
const triggers = useVisibleTriggers()
</script>

<style lang="sass" scoped>
.choose-title
  font-size: clamp(2rem, 7vw, 4rem)
  font-weight: 800
  letter-spacing: 0.08em
  text-shadow: 0 0 24px rgba(255, 255, 255, 0.5)

.choose-card
  width: min(78vw, 560px)
  min-height: 26vh
  border: 3px solid rgba(255, 255, 255, 0.85)
  background: rgba(255, 255, 255, 0.08) !important
  color: #fff
  box-shadow: 0 0 24px rgba(255, 255, 255, 0.25)
  &:active
    background: rgba(255, 255, 255, 0.25) !important

.choose-card-icon
  font-size: clamp(5rem, 16vw, 9rem)

.choose-card-label
  font-size: clamp(2rem, 8vw, 4rem)
  font-weight: 800
  letter-spacing: 0.2em
  text-transform: uppercase
</style>
