import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function askBlueAI(prompt: string, context: string = "") {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          text: `Tu es Blue AI, l'assistant intelligent de l'ERP KONTROL. 
          Ton rôle est d'aider les entrepreneurs africains à gérer leur entreprise.
          Réponds de manière professionnelle, concise et encourageante.
          
          Contexte de l'entreprise : ${context}
          
          Question de l'utilisateur : ${prompt}`
        }
      ],
      config: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
      }
    });

    return response.text || "Désolé, je n'ai pas pu générer de réponse.";
  } catch (error) {
    console.error("Blue AI Error:", error);
    return "Une erreur est survenue lors de la communication avec Blue AI.";
  }
}
