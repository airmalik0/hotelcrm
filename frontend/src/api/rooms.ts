import type {
  Message,
  RoomCreate,
  RoomPublic,
  RoomStatus,
  RoomUpdate,
  RoomsPublic,
} from "@/client/types.gen"
import { apiClient } from "@/lib/axios"

export interface RoomParams {
  skip?: number
  limit?: number
}

/**
 * Get list of rooms
 */
export async function getRooms(params?: RoomParams): Promise<RoomsPublic> {
  const response = await apiClient.get<RoomsPublic>("/api/v1/rooms/", {
    params: {
      skip: params?.skip || 0,
      limit: params?.limit || 100,
    },
  })
  return response.data
}

/**
 * Get available rooms only
 */
export async function getAvailableRooms(
  params?: RoomParams,
): Promise<RoomsPublic> {
  const response = await apiClient.get<RoomsPublic>("/api/v1/rooms/available", {
    params: {
      skip: params?.skip || 0,
      limit: params?.limit || 100,
    },
  })
  return response.data
}

/**
 * Get single room by ID
 */
export async function getRoom(roomId: string): Promise<RoomPublic> {
  const response = await apiClient.get<RoomPublic>(`/api/v1/rooms/${roomId}`)
  return response.data
}

/**
 * Create new room
 */
export async function createRoom(data: RoomCreate): Promise<RoomPublic> {
  const response = await apiClient.post<RoomPublic>("/api/v1/rooms/", data)
  return response.data
}

/**
 * Update existing room
 */
export async function updateRoom(
  roomId: string,
  data: RoomUpdate,
): Promise<RoomPublic> {
  const response = await apiClient.put<RoomPublic>(
    `/api/v1/rooms/${roomId}`,
    data,
  )
  return response.data
}

/**
 * Delete room
 */
export async function deleteRoom(roomId: string): Promise<Message> {
  const response = await apiClient.delete<Message>(`/api/v1/rooms/${roomId}`)
  return response.data
}

/**
 * Update room status
 */
export async function updateRoomStatus(
  roomId: string,
  status: RoomStatus,
): Promise<RoomPublic> {
  const response = await apiClient.post<RoomPublic>(
    `/api/v1/rooms/${roomId}/status`,
    null,
    { params: { status } },
  )
  return response.data
}
