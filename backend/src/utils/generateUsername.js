const adjectives = ["Neon", "Silent", "Ghost", "Hidden", "Cosmic"];
const nouns = ["Tiger", "Shadow", "Wolf", "Cipher", "Phantom"];

module.exports = function generateUsername() {
  return (
    adjectives[Math.floor(Math.random() * adjectives.length)] +
    nouns[Math.floor(Math.random() * nouns.length)] +
    Math.floor(Math.random() * 100)
  );
};
