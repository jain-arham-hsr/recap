import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";

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
The example should be a real-world usage scenario that shows the syntax in context.${formatGuidance}
Detect the programming language from the syntax and category context, or use the provided language: ${language || 'javascript'}${customPrompt ? `\n\nAdditional user instructions: ${customPrompt}` : ''}`;

    const userMessage = customPrompt 
      ? `${customPrompt}\n\nNow explain this ${category} syntax: ${syntax}`
      : `Explain this ${category} syntax: ${syntax}`;

    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + config.geminiApiKey, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemPrompt + "\n\n" + userMessage }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        }
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Parse the JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          description: parsed.description || "",
          example: parsed.example || "",
          language: parsed.language || language || "javascript",
        };
      }

      // Fallback
      return {
        description: content,
        example: "",
        language: language || "javascript",
      };
    } catch (error: any) {
      toast({
        title: "AI Error",
        description: error.message || "Failed to generate content",
        variant: "destructive",
      });
      return null;
    }
  };

  return { generate, hasGemini };
}
