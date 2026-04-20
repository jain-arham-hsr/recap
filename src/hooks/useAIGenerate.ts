import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

interface GenerateParams {
  syntax: string;
  category: string;
  customPrompt?: string | null;
  displayFormat: string;
  language: string;
}

interface GenerateResult {
  description: string;
  example: string;
  language: string;
}

export function useAIGenerate() {
  const { config, hasGemini } = useApp();
  const { toast } = useToast();

  const generate = async (params: GenerateParams): Promise<GenerateResult | null> => {
    if (!hasGemini) {
      toast({
        title: "AI not configured",
        description: "Please add your Gemini API key in Settings to use AI features.",
        variant: "destructive",
      });
      return null;
    }

    const { syntax, category, customPrompt, displayFormat, language } = params;

    let formatGuidance = "";
    if (displayFormat === "table" || displayFormat === "compact") {
      formatGuidance = " Keep the description very brief (under 10 words) and the example short.";
    }

    const systemPrompt = `You are a technical documentation expert. When given a syntax element (like a command, method, flag, or code snippet), provide a clear explanation in the following JSON format:

{
  "description": "A single, clear line explaining what this does (max 20 words)",
  "example": "A practical, realistic code example showing usage with context",
  "language": "detected programming language (e.g., javascript, python, java, etc.)"
}

CRITICAL: The description MUST be ONE LINE ONLY (maximum 15 words). Focus on the core purpose.
CRITICAL: The example MUST be properly formatted with real newline characters (\\n) between each statement, declaration, or logical step — never write the entire example as a single line. Format it exactly as it would appear in a real code editor, with each line on its own line. Multi-statement examples must always be multi-line.${formatGuidance}
Detect the programming language from the syntax and category context, or use the provided language: ${language || 'javascript'}${customPrompt ? `\n\nAdditional user instructions: ${customPrompt}` : ''}`;

    const userMessage = customPrompt 
      ? `${customPrompt}\n\nNow explain this ${category} syntax: ${syntax}`
      : `Explain this ${category} syntax: ${syntax}`;


  try {
    const genAI = new GoogleGenerativeAI(config.geminiApiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            description: { type: SchemaType.STRING },
            example: { type: SchemaType.STRING },
            language: { type: SchemaType.STRING },
          },
          required: ["description", "example", "language"],
        },
      },
    });

    const result = await model.generateContent(systemPrompt + "\n\n" + userMessage);
    
    const data = JSON.parse(result.response.text());

    return {
      description: data.description,
      example: data.example,
      language: data.language || "javascript",
    };

  } catch (error) {
    // Handle specific API errors
    if (error.message.includes("429")) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (error.message.includes("401") || error.message.includes("API key")) {
      throw new Error("Invalid API Key. Please check your settings.");
    }
    
    // General error fallback
    console.error("AI Generation Error:", error);
    throw new Error("Failed to generate content.");
  }
  };

  return { generate, hasGemini };
}
