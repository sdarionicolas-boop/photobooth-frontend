import { defineStore, acceptHMRUpdate } from 'pinia'
import type { SseEventIntervalInformationRecord, SseEventOnetimeInformationRecord } from '@/dto/generated'
import type { TriggerSchema } from '@/types/trigger-schema'
import { remoteProcedureCall } from '@/util/fetch_api.js'

function defaultOnetimeInformation(): SseEventOnetimeInformationRecord {
  return {
    version: '',
    platform_system: '',
    platform_release: '',
    platform_machine: '',
    platform_python_version: '',
    platform_node: '',
    platform_cpu_count: null,
    model: '',
    data_directory: '',
    python_executable: '',
    disk: {},
  }
}

function defaultIntervalInformation(): SseEventIntervalInformationRecord {
  return {
    cpu_percent: 0,
    memory: {},
    cma: {},
    backends: {},
    stats_counter: [],
    limits_counter: [],
    battery_percent: null,
    temperatures: {},
    mediacollection: {},
    plugins: [],
    pi_throttled_flags: {},
  }
}

// actions where the guest chooses the background before the capture
const BACKGROUND_ACTIONS = ['actions/image', 'actions/collage']

async function hasBackgrounds(): Promise<boolean> {
  try {
    const response = await fetch('/api/background/')
    return response.ok && (await response.json()).length > 0
  } catch {
    return false
  }
}

export const useMainStore = defineStore('main-store', {
  state: () => ({
    logrecords: [] as object[],

    information_onetime: defaultOnetimeInformation(),
    information_interval: defaultIntervalInformation(),

    lastAction: null as TriggerSchema | null,

    // single image action waiting for the guest to choose a background (see startAction)
    pendingBackgroundTrigger: null as TriggerSchema | null,

    //   /* plugins stats */
    //   plugins: {},
    // },
  }),
  actions: {
    /**
     * Start an action (take picture, ...). For single images and collages the guest picks the background first,
     * if there are backgrounds to choose from. Other actions start right away.
     */
    async startAction(trigger: TriggerSchema) {
      this.lastAction = trigger // save last action so it can be started from itempresenter directly again.

      if (BACKGROUND_ACTIONS.includes(trigger.action) && (await hasBackgrounds())) {
        this.pendingBackgroundTrigger = trigger
        return
      }
      void remoteProcedureCall(`/api/${trigger.action}/${trigger.config_index}`)
    },

    /** Continue a pending image or collage action with the background the guest chose (null = no background). */
    startPendingActionWithBackground(file: string | null) {
      const trigger = this.pendingBackgroundTrigger
      this.pendingBackgroundTrigger = null
      if (!trigger) return

      void remoteProcedureCall(`/api/${trigger.action}/${trigger.config_index}?background=${encodeURIComponent(file ?? '')}`)
    },

    cancelPendingAction() {
      this.pendingBackgroundTrigger = null
    },
  },
  getters: {},
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useMainStore, import.meta.hot))
}
