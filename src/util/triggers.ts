import { computed } from 'vue'
import { isEmpty } from 'lodash'
import { useConfigurationStore } from '@/stores/configuration-store'
import type { TriggerSchema } from '@/types/trigger-schema'

/** The actions (photo, strip, ...) that are configured to show a button for the guest. */
export function useVisibleTriggers() {
  const configurationStore = useConfigurationStore()

  return computed(() => {
    const result: TriggerSchema[] = []

    Object.entries(configurationStore.configuration.actions).forEach(([key, actions]) => {
      actions.forEach((action, index: number) => {
        const ui = action.trigger.ui_trigger
        if (!ui.show_button || (isEmpty(ui.title) && isEmpty(ui.icon))) return

        result.push({
          action: `actions/${key}`,
          config_index: index,
          show_button: ui.show_button,
          title: ui.title,
          icon: ui.icon,
          use_custom_color: ui.use_custom_color,
          custom_color: ui.custom_color,
        })
      })
    })

    return result
  })
}
