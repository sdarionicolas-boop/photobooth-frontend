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

export const useMainStore = defineStore('main-store', {
  state: () => ({
    logrecords: [] as object[],

    information_onetime: defaultOnetimeInformation(),
    information_interval: defaultIntervalInformation(),

    lastAction: null as TriggerSchema | null,

    //   /* plugins stats */
    //   plugins: {},
    // },
  }),
  actions: {
    /** Start an action (take picture, ...). */
    startAction(trigger: TriggerSchema) {
      this.lastAction = trigger // save last action so it can be started from itempresenter directly again.

      void remoteProcedureCall(`/api/${trigger.action}/${trigger.config_index}`)
    },
  },
  getters: {},
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useMainStore, import.meta.hot))
}
