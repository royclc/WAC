'use client'

import AppShell from '@/components/AppShell'
import AvailabilityCalendar from '@/components/AvailabilityCalendar'

export default function ServerAvailabilityPage() {
  return (
    <AppShell>
      <AvailabilityCalendar assetType="server" typeName="硬體" />
    </AppShell>
  )
}
