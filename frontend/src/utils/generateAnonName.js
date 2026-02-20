export function generateAnonName() {
  const adjectives = [
    "Neon",
    "Silent",
    "Hidden",
    "Midnight",
    "Cosmic",
    "Velvet",
    "Phantom",
    "Lunar"
  ];

  const nouns = [
    "Tiger",
    "Shadow",
    "Cipher",
    "Echo",
    "Wolf",
    "Nova",
    "Ghost",
    "Drift"
  ];

  const randomAdj =
    adjectives[Math.floor(Math.random() * adjectives.length)];

  const randomNoun =
    nouns[Math.floor(Math.random() * nouns.length)];

  const randomNumber = Math.floor(Math.random() * 100);

  return `${randomAdj}${randomNoun}${randomNumber}`;
}
