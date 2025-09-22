import type {
  CampaignCreate,
  CampaignExecutionRequest,
  CampaignExecutionResponse,
  CampaignPublic,
  CampaignStatus,
  CampaignType,
  CampaignUpdate,
  CampaignsPublic,
  CustomerPreviewResponse,
  TriggerCheckResponse,
} from "@/client/types.gen"
import { apiClient } from "@/lib/axios"

interface GetCampaignsParams {
  skip?: number
  limit?: number
  status?: CampaignStatus
  campaign_type?: CampaignType
  search?: string
}

export async function getCampaigns(
  params?: GetCampaignsParams,
): Promise<CampaignsPublic> {
  const response = await apiClient.get<CampaignsPublic>("/api/v1/campaigns/", {
    params,
  })
  return response.data
}

export async function getCampaign(id: string): Promise<CampaignPublic> {
  const response = await apiClient.get<CampaignPublic>(
    `/api/v1/campaigns/${id}`,
  )
  return response.data
}

export async function createCampaign(
  data: CampaignCreate,
): Promise<CampaignPublic> {
  const response = await apiClient.post<CampaignPublic>(
    "/api/v1/campaigns/",
    data,
  )
  return response.data
}

export async function updateCampaign(
  id: string,
  data: CampaignUpdate,
): Promise<CampaignPublic> {
  const response = await apiClient.put<CampaignPublic>(
    `/api/v1/campaigns/${id}`,
    data,
  )
  return response.data
}

export async function deleteCampaign(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/campaigns/${id}`)
}

export async function executeCampaign(
  id: string,
  data: CampaignExecutionRequest,
): Promise<CampaignExecutionResponse> {
  const response = await apiClient.post<CampaignExecutionResponse>(
    `/api/v1/campaigns/${id}/execute`,
    data,
  )
  return response.data
}

export async function previewCampaignRecipients(
  id: string,
): Promise<CustomerPreviewResponse> {
  const response = await apiClient.get<CustomerPreviewResponse>(
    `/api/v1/campaigns/${id}/preview`,
  )
  return response.data
}

export async function checkTriggers(): Promise<TriggerCheckResponse> {
  const response = await apiClient.post<TriggerCheckResponse>(
    "/api/v1/campaigns/check-triggers",
  )
  return response.data
}
