const round = (value: number, places = 1) => {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};
export const centimetersToInches = (value: number) => round(value / 2.54);
export const inchesToCentimeters = (value: number) => round(value * 2.54, 2);
export function centimetersToFeetInches(value: number) {
  const totalInches = centimetersToInches(value);
  const feet = Math.floor(totalInches / 12);
  return { feet, inches: round(totalInches - feet * 12) };
}
export const feetInchesToCentimeters = (feet: number, inches: number) =>
  inchesToCentimeters(feet * 12 + inches);
export const kilogramsToPounds = (value: number) => round(value * 2.2046226218);
export const poundsToKilograms = (value: number) =>
  round(value / 2.2046226218, 2);
