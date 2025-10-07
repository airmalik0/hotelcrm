import { useQuery } from "@tanstack/react-query"
import { getCountries, getRegions, getDistricts } from "@/api/geo"
import { useEffect, useMemo } from "react"

export interface GeoValue {
  country_code: string | null
  region: string | null
  district: string | null
}

interface GeoSelectProps {
  label?: string
  value: GeoValue
  onChange: (value: GeoValue) => void
  required?: boolean
  error?: string
}

export function GeoSelect({ label = "Location", value, onChange, required, error }: GeoSelectProps) {
  const { data: countries = [] } = useQuery({
    queryKey: ["geo", "countries"],
    queryFn: getCountries,
    staleTime: 24 * 60 * 60 * 1000,
  })

  const { data: regions = [] } = useQuery({
    queryKey: ["geo", "regions", value.country_code],
    queryFn: () => getRegions(value.country_code || ""),
    enabled: !!value.country_code,
    staleTime: 24 * 60 * 60 * 1000,
  })

  const { data: districts = [] } = useQuery({
    queryKey: ["geo", "districts", value.region],
    queryFn: () => getDistricts(value.region || ""),
    enabled: (value.country_code === "UZ" && value.region === "TASHKENT_CITY") || false,
    staleTime: 24 * 60 * 60 * 1000,
  })

  // Ensure cascade consistency on parent change
  useEffect(() => {
    // If country is not UZ → clear region/district
    if (value.country_code && value.country_code !== "UZ" && (value.region || value.district)) {
      onChange({ country_code: value.country_code, region: null, district: null })
    }
  }, [value.country_code])

  useEffect(() => {
    // If region changed and is not TASHKENT_CITY → clear district
    if (value.region && value.region !== "TASHKENT_CITY" && value.district) {
      onChange({ ...value, district: null })
    }
  }, [value.region])

  const countryOptions = useMemo(() => countries, [countries])
  const regionOptions = useMemo(() => regions, [regions])
  const districtOptions = useMemo(() => districts, [districts])

  return (
    <div className="space-y-3">
      {label && (
        <div className="inline-block font-semibold text-neutral-600 dark:text-neutral-200 text-sm">
          {label}
          {required && <span className="text-danger-600"> *</span>}
        </div>
      )}

      {/* Country */}
      <div>
        <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
          Country
        </label>
        <select
          value={value.country_code || ""}
          onChange={(e) => {
            const country = e.target.value || null
            onChange({ country_code: country, region: null, district: null })
          }}
          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Select a country</option>
          {countryOptions.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Region (for UZ only) */}
      {value.country_code === "UZ" && (
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            Region (Uzbekistan)
          </label>
          <select
            value={value.region || ""}
            onChange={(e) => {
              const region = e.target.value || null
              onChange({ ...value, region, district: null })
            }}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select a region</option>
            {regionOptions.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* District (for TASHKENT_CITY only) */}
      {value.country_code === "UZ" && value.region === "TASHKENT_CITY" && (
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            District (Tashkent city)
          </label>
          <select
            value={value.district || ""}
            onChange={(e) => {
              const district = e.target.value || null
              onChange({ ...value, district })
            }}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select a district</option>
            {districtOptions.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <p className="text-xs text-danger-600 dark:text-danger-400">{error}</p>
      )}
    </div>
  )
}



