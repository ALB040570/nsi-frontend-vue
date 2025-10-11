import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Реактивный флаг "мобильный" через matchMedia.
 * @param query CSS media query, по умолчанию '(max-width: 720px)'
 */
export function useIsMobile(query = '(max-width: 720px)') {
  const isMobile = ref(false)
  let mql: MediaQueryList | null = null

  const apply = (mq: MediaQueryList | MediaQueryListEvent) => {
    // у Safari старый тип события, поэтому проверяем оба варианта
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const matches = 'matches' in mq ? mq.matches : (mq as MediaQueryList).matches
    isMobile.value = !!matches
  }

  const onChange = (event: MediaQueryListEvent) => apply(event)

  onMounted(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    mql = window.matchMedia(query)
    apply(mql)
    if ('addEventListener' in mql) {
      mql.addEventListener('change', onChange as EventListener)
    } else {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      mql.addListener(onChange)
    }
  })

  onBeforeUnmount(() => {
    if (!mql) return
    if ('removeEventListener' in mql) {
      mql.removeEventListener('change', onChange as EventListener)
    } else {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      mql.removeListener(onChange)
    }
  })

  return { isMobile }
}
