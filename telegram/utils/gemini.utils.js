import { GoogleGenAI } from '@google/genai';
const MODEL = "gemini-3.1-flash-lite"

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function extractAcademicDetails(userBio) {
  const prompt = `
Extract the student's academic information from the following text.
Return ONLY a valid JSON object matching this schema:
{
  "university": string or null,
  "major": string or null,
  "gpa": number or null,
  "extracurriculars": array of strings
}

User text: "${userBio}"
`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json'
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (error) {
    console.error('Failed to parse Gemini output:', error);
    return null;
  }
}

async function generateFormAnswers(vault, fields) {
  const prompt = `
You are an expert AI scholarship assistant.
Here is the student's Vault data: ${JSON.stringify(vault)}
Here are the fields required for the scholarship application: ${JSON.stringify(fields)}

Your task is to map the student's data to the form fields. If there is a field for an essay, personal statement, or cover letter, draft a highly compelling response using the student's background.

Return ONLY a valid JSON object where the keys are the exact field "name" attributes, and the values are the strings to be typed into those fields.
`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });

  return JSON.parse(response.text);
}

export { extractAcademicDetails, generateFormAnswers }; 