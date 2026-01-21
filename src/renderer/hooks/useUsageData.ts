import { useState, useEffect, useCallback } from 'react'
import type { UsageUpdate } from '../../types'

interface UseUsageDataReturn {
  data: UsageUpdate | null
  isLoading: boolean
  pollStartTime: number
}

export function useUsageData(pollIntervalMs: number): UseUsageDataReturn {
  const [data, setData] = useState<UsageUpdate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pollStartTime, setPollStartTime] = useState(Date.now)

  const handleUpdate = useCallback((newData: UsageUpdate) => {
    setData(newData)
    setIsLoading(false)
    setPollStartTime(Date.now())
  }, [])

  useEffect(() => {
    if (!window.electronAPI?.usage) {
      setIsLoading(false)
      return
    }

    const unsubscribe = window.electronAPI.usage.onUpdate(handleUpdate)

    window.electronAPI.usage.getUsage()
      .then(handleUpdate)
      .catch((error: Error) => {
        console.error('Failed to get initial usage:', error)
        setIsLoading(false)
      })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [handleUpdate])

  useEffect(() => {
    setPollStartTime(Date.now())
  }, [pollIntervalMs])

  return { data, isLoading, pollStartTime }
}
