export function haversineMiles(latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number) {
  const radians = (degrees: number) => degrees * Math.PI / 180
  const deltaLatitude = radians(latitudeB - latitudeA)
  const deltaLongitude = radians(longitudeB - longitudeA)
  const value = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(radians(latitudeA)) * Math.cos(radians(latitudeB)) * Math.sin(deltaLongitude / 2) ** 2
  return 3958.7613 * 2 * Math.asin(Math.sqrt(value))
}