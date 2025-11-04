import DashboardShellSkeleton from '@/components/skeletons/DashboardShellSkeleton'

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <DashboardShellSkeleton />
      </div>
    </div>
  )
}
