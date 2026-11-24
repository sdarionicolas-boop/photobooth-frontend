import { onBeforeUnmount, onMounted, ref } from 'vue'

/** Today's date as dd/mm/yyyy. */
export const formatToday = () => new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

/** Reactive today's date, refreshed every minute so a kiosk left running shows the right day after midnight. */
export function useToday() {
  const today = ref(formatToday())
  let timer: number | undefined

  onMounted(() => {
    timer = window.setInterval(() => (today.value = formatToday()), 60 * 1000)
  })
  onBeforeUnmount(() => window.clearInterval(timer))

  return today
}
