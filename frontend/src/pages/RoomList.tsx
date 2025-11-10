import { deleteRoom, getRooms } from "@/api/rooms"
import type { RoomPublic, RoomStatus } from "@/client/types.gen"
import { RoomCard } from "@/components/room/RoomCard"
import { RoomCategoryManagerModal } from "@/components/room/RoomCategoryManagerModal"
import { RoomCreateModal } from "@/components/room/RoomCreateModal"
import { RoomEditModal } from "@/components/room/RoomEditModal"
import { useLanguage } from "@/contexts/LanguageContext"
import { useConfirm } from "@/hooks/useConfirm"
import { useRole } from "@/hooks/useRole"
import { showError, showSuccess } from "@/utils/error-handling"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Building2, Filter, Plus, Search } from "lucide-react"
import type React from "react"
import { useMemo, useState } from "react"

export function RoomList() {
  const { t } = useLanguage()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<RoomPublic | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<RoomStatus | "all">("all")
  const [filterType, setFilterType] = useState<string | "all">("all")
  const [filterFloor, setFilterFloor] = useState<number | "all">("all")
  const queryClient = useQueryClient()
  const { hasAnyRole } = useRole()
  const { confirm, ConfirmDialog } = useConfirm()
  const canEdit = hasAnyRole(["admin", "manager"])

  // Fetch rooms
  const { data, isLoading, error } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => getRooms({ limit: 100 }),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] })
      showSuccess(t.room.roomDeletedSuccess)
    },
    onError: (error) => {
      showError(error, t.room.failedToDeleteRoom)
    },
  })

  // Filter and search rooms
  const filteredRooms = useMemo(() => {
    if (!data?.data) return []

    return data.data.filter((room) => {
      // Search filter
      if (
        searchTerm &&
        !room.room_number.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !room.description?.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false
      }

      // Status filter
      if (filterStatus !== "all" && room.status !== filterStatus) {
        return false
      }

      // Category filter (by id)
      if (filterType !== "all" && room.category?.id !== filterType) {
        return false
      }

      // Floor filter
      if (filterFloor !== "all" && room.floor !== filterFloor) {
        return false
      }

      return true
    })
  }, [data?.data, searchTerm, filterStatus, filterType, filterFloor])

  // Get unique floors for filter
  const uniqueFloors = useMemo(() => {
    if (!data?.data) return []
    const floors = [...new Set(data.data.map((room) => room.floor))].sort(
      (a, b) => a - b,
    )
    return floors
  }, [data?.data])

  const handleView = (room: RoomPublic) => {
    setSelectedRoom(room)
    // For now, we'll just use the edit modal in view mode
    setShowEditModal(true)
  }

  const handleEdit = (room: RoomPublic) => {
    setSelectedRoom(room)
    setShowEditModal(true)
  }

  const handleDelete = async (room: RoomPublic) => {
    const confirmed = await confirm({
      title: "Delete Room",
      message: `Are you sure you want to delete Room ${room.room_number}? This action cannot be undone.`,
      confirmText: "Delete",
      variant: "danger",
    })

    if (confirmed) {
      deleteMutation.mutate(room.id)
    }
  }

  const handleResetFilters = () => {
    setSearchTerm("")
    setFilterStatus("all")
    setFilterType("all")
    setFilterFloor("all")
  }

  // Room statistics
  const stats = useMemo(() => {
    if (!data?.data) return { total: 0, available: 0, occupied: 0 }
    return {
      total: data.data.length,
      available: data.data.filter((r) => r.status === "available").length,
      occupied: data.data.filter((r) => r.status === "occupied").length,
    }
  }, [data?.data])

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-danger-600 dark:text-danger-400">
          Failed to load rooms. Please try again.
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {t.pages.roomManagement.title}
          </h1>
          {canEdit && (
            <>
              <button
                onClick={() => setShowCategoryModal(true)}
                className="rounded-lg px-4 py-2.5 inline-flex items-center gap-2 transition bg-neutral-600 text-white hover:bg-neutral-700 text-sm font-medium shadow-sm hover:shadow-md"
              >
                <Filter className="w-4 h-4" />
                {t.pages.roomManagement.manageCategories}
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="rounded-lg px-4 py-2.5 inline-flex items-center gap-2 transition bg-primary-600 text-white hover:bg-primary-700 text-sm font-medium shadow-sm hover:shadow-md"
              >
                <Plus className="w-4 h-4" />
                {t.pages.roomManagement.addNewRoom}
              </button>
            </>
          )}
        </div>
        <p className="text-neutral-600 dark:text-neutral-400">
          {t.pages.roomManagement.description}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {t.pages.roomManagement.totalRooms}
              </p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {stats.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-600/30 text-primary-600 dark:text-primary-400 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {t.pages.roomManagement.available}
              </p>
              <p className="text-2xl font-bold text-success-600 dark:text-success-400">
                {stats.available}
              </p>
            </div>
            <div className="w-12 h-12 bg-success-100 dark:bg-success-600/30 text-success-600 dark:text-success-400 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {t.pages.roomManagement.occupied}
              </p>
              <p className="text-2xl font-bold text-danger-600 dark:text-danger-400">
                {stats.occupied}
              </p>
            </div>
            <div className="w-12 h-12 bg-danger-100 dark:bg-danger-600/30 text-danger-600 dark:text-danger-400 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-dark-2 rounded-xl shadow-sm dark:shadow-none overflow-hidden mb-6">
        <div className="border-b border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                className="bg-white dark:bg-neutral-700 h-10 w-64 pl-10 pr-4 rounded-lg border border-neutral-200 dark:border-neutral-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors"
                placeholder={t.room.searchRooms}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            </div>

            {/* Filters */}
            <div className="flex items-center flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-neutral-500" />
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  {t.pages.roomManagement.filters}:
                </span>
              </div>

              {/* Status Filter */}
              <select
                className="border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-700 dark:text-white ps-3 pe-5 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors"
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as RoomStatus | "all")
                }
              >
                <option value="all">
                  {t.common.all} {t.common.status}
                </option>
                <option value="available">
                  {t.pages.roomManagement.statusAvailable}
                </option>
                <option value="occupied">
                  {t.pages.roomManagement.statusOccupied}
                </option>
                <option value="cleaning">
                  {t.pages.roomManagement.statusCleaning}
                </option>
                <option value="maintenance">
                  {t.pages.roomManagement.statusMaintenance}
                </option>
              </select>

              {/* Category Filter */}
              <select
                className="border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-700 dark:text-white ps-3 pe-5 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors"
                value={filterType}
                onChange={(e) =>
                  setFilterType(e.target.value as string | "all")
                }
              >
                <option value="all">{t.roomList.allCategories}</option>
                {/* Category options can be populated from rooms list */}
                {Array.from(
                  new Map(
                    (data?.data || [])
                      .filter((r) => r.category?.id)
                      .map((r) => [
                        r.category!.id,
                        r.category!.name || "Unnamed",
                      ]),
                  ).entries(),
                ).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Floor Filter */}
              <select
                className="border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-700 dark:text-white ps-3 pe-5 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors"
                value={filterFloor}
                onChange={(e) => {
                  const value = e.target.value
                  setFilterFloor(value === "all" ? "all" : Number(value))
                }}
              >
                <option value="all">{t.roomList.allFloors}</option>
                {uniqueFloors.map((floor) => (
                  <option key={floor} value={floor}>
                    Floor {floor}
                  </option>
                ))}
              </select>

              {/* Reset Button */}
              <button
                onClick={handleResetFilters}
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Room Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
            <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            {t.common.loadingRooms}
          </div>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 mx-auto text-neutral-300 dark:text-neutral-600 mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400 mb-2">
            {t.common.noRoomsFound}
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-500">
            {searchTerm ||
            filterStatus !== "all" ||
            filterType !== "all" ||
            filterFloor !== "all"
              ? t.common.tryAdjustingFilters
              : canEdit
                ? t.common.addFirstRoom
                : t.common.noRoomsAddedYet}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <RoomCreateModal onClose={() => setShowCreateModal(false)} />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedRoom && (
        <RoomEditModal
          room={selectedRoom}
          onClose={() => {
            setShowEditModal(false)
            setSelectedRoom(null)
          }}
          viewOnly={!canEdit}
        />
      )}
      {/* Category Manager Modal */}
      {showCategoryModal && (
        <RoomCategoryManagerModal
          onClose={() => {
            setShowCategoryModal(false)
            queryClient.invalidateQueries({ queryKey: ["room-categories"] })
          }}
        />
      )}
      {ConfirmDialog}
    </>
  )
}
