export const validateSoil = () => {
  // fake AI logic for now
  const random = Math.random();

  if (random > 0.7) return "⚠ Suspicious Report";
  return "✅ Verified Soil Report";
};
