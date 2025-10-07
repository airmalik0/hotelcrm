import { apiClient } from "@/lib/axios"

export type CountryOption = { code: string; name: string }
export type RegionOption = { code: string; name: string }
export type DistrictOption = { code: string; name: string }

export async function getCountries(): Promise<CountryOption[]> {
  const { data } = await apiClient.get<CountryOption[]>("/api/v1/geo/countries")
  return data
}

export async function getRegions(countryCode: string): Promise<RegionOption[]> {
  const { data } = await apiClient.get<RegionOption[]>("/api/v1/geo/regions", {
    params: { country: countryCode },
  })
  return data
}

export async function getDistricts(
  regionCode: string,
  coreOnly: boolean = true,
): Promise<DistrictOption[]> {
  const { data } = await apiClient.get<DistrictOption[]>(
    "/api/v1/geo/districts",
    { params: { region: regionCode, core: coreOnly ? 1 : 0 } },
  )
  return data
}



