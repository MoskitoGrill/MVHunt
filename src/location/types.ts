/** Kontrakt měření; E1 GPS nespouští. Časy jsou Unix ms, přesnost v metrech. */
export interface PositionMeasurement {
  latitude: number
  longitude: number
  accuracy: number
  measuredAt: number
}
