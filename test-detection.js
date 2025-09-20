// Test detection for debugging
const { detectUniversityDiscipline } = require('./src/lib/university-courses-detector.ts');

const testMessage = "estrutura e propriedade dos materiais";
console.log(`Testing message: "${testMessage}"`);

const result = detectUniversityDiscipline(testMessage);
console.log('Detection result:', JSON.stringify(result, null, 2));

// Test individual phrases
const phrases = [
  "estrutura de dados",
  "estrutura e propriedade dos materiais",
  "ciencia dos materiais",
  "materiais"
];

phrases.forEach(phrase => {
  const result = detectUniversityDiscipline(phrase);
  console.log(`\n"${phrase}" -> ${result.discipline?.name || 'NO MATCH'} (confidence: ${result.confidence})`);
});