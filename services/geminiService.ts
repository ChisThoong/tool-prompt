
import { GoogleGenAI, Type } from "@google/genai";

// Ensure API key is available
// if (!process.env.API_KEY) {
//   throw new Error("API_KEY environment variable not set");
// }

// const apiKey = import.meta.env.VITE_API_KEY;

// if (!apiKey) {
//   throw new Error("VITE_API_KEY environment variable not set");
// }

function getApiKey(): string {
  let apiKey = localStorage.getItem("genai_api_key");

  if (!apiKey) {
    apiKey = prompt("Please enter your Google GenAI API key:");
    if (apiKey) {
      localStorage.setItem("genai_api_key", apiKey);
    } else {
      throw new Error("API key is required to continue.");
    }
  }

  return apiKey;
}

//  Lấy API key
const apiKey = getApiKey();

const ai = new GoogleGenAI({ apiKey:apiKey });

const model = "gemini-2.5-flash";

interface Character {
  description: string;
  image: string | null;
}

export const analyzeCharacterImage = async (imageDataUrl: string): Promise<string> => {
    const match = imageDataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
        throw new Error("Định dạng hình ảnh không hợp lệ.");
    }
    const mimeType = match[1];
    const data = match[2];

    const systemInstruction = `You are an expert character prompter for generative AI. Your task is to analyze the character in the provided image and generate a highly detailed and structured description in English. This description is CRITICAL for maintaining character consistency across multiple generated scenes.

The description must be a single, continuous phrase, structured as a list of key-visual features separated by commas.
Break down the character's appearance into the following categories and be as specific as possible:

1.  **Overall:** Start with a general description (e.g., "a young woman", "an elderly man", "a cartoon robot").
2.  **Face:** Describe facial features like eye color, face shape, and any notable marks (e.g., "with bright blue eyes, a round face, freckles across her nose").
3.  **Hair:** Detail the hair style, color, and length (e.g., "long, wavy blonde hair tied in a ponytail").
4.  **Clothing:** List specific articles of clothing from top to bottom, including colors and styles (e.g., "wearing a worn-out brown leather jacket over a white t-shirt, dark blue jeans, and black combat boots").
5.  **Accessories:** Mention any distinct accessories (e.g., "wearing silver hoop earrings and a small backpack").

Combine these elements into a single, comma-separated descriptive phrase. DO NOT use any preamble or introductory text like "The character is...".

**Example Output:** "a young woman with bright blue eyes and a round face, long wavy blonde hair, wearing a red jacket, blue jeans, and white sneakers"`;

    const promptContent = "Analyze the character in this image and provide a description based on your system instruction.";

    try {
        const response = await ai.models.generateContent({
            model,
            contents: {
                parts: [
                    { text: promptContent },
                    { inlineData: { mimeType, data } }
                ]
            },
            config: {
                systemInstruction,
            },
        });
        if (!response.text) {
  throw new Error("Không nhận được phản hồi từ mô hình AI.");
}
        return response.text.trim();
    } catch (error) {
        console.error("Error analyzing character image:", error);
        throw new Error("Không thể giao tiếp với AI để phân tích hình ảnh.");
    }
};


export const generateOutline = async (theme: string, detailedDescription: string, characters: Character[]): Promise<string> => {
  const systemInstruction = `You are an expert scriptwriter. Your task is to generate a detailed video outline based on the theme and description.
First, determine if the theme is factual or fictional.
- If factual, research credible sources for a structured, accurate outline.
- If fictional, create an imaginative and original narrative.
The outline should focus on visual actions and environmental sounds. DO NOT include dialogue, narration, or music suggestions.
The final output must be a well-structured outline with a clear beginning, middle, and end, formatted in markdown and written in Vietnamese.`;
  
  const characterDescriptions = characters.length > 0 && characters.some(c => c.description)
    ? characters.map((char, index) => `Character ${index + 1}: ${char.description || 'Not specified'}`).join('\n')
    : 'Not specified';

  const promptContent = `Generate a Vietnamese outline for the theme: "${theme}".\n\nDetailed Description: "${detailedDescription}"\n\nCharacter Descriptions:\n${characterDescriptions}`;


  try {
    const response = await ai.models.generateContent({
      model,
      contents: promptContent,
      config: {
        systemInstruction,
      },
    });
    if (!response.text) {
        throw new Error("Không nhận được phản hồi từ mô hình AI.");
      }
    return response.text;
  } catch (error) {
    console.error("Error generating outline:", error);
    throw new Error("Không thể giao tiếp với mô hình AI để tạo dàn ý.");
  }
};

export const generateStoryAndPrompts = async (
  theme: string,
  detailedDescription: string,
  outline: string,
  numPrompts: number,
  characters: Character[],
  videoStyle: string
): Promise<{ story: string; prompts: string[] }> => {

    const getStyleInstruction = (style: string): string => {
        switch (style) {
            case 'ai-storytelling':
                return `
**Video Style: AI Storytelling**
- Focus on a strong narrative arc.
- Use cinematic and emotionally resonant shots.
- The visual style should be cohesive and painterly, like a digital storybook.
- Emphasize mood and atmosphere through lighting and color.
`;
            case 'ai-lip-sync':
                return `
**Video Style: AI Lip-sync / Talking Head**
- The story must contain DIALOGUE for the characters.
- Prompts will primarily feature characters speaking directly to the camera or to each other.
- Describe the character's facial expressions, emotions, and gestures in detail as they speak.
- The background should be simple to keep focus on the character.
`;
            case 'animation':
                return `
**Video Style: Animation & Generative Art**
- Prompts should specify an animation style (e.g., "2D flat animation", "3D claymation style", "Japanese anime style", "stop-motion").
- Encourage abstract and surreal visuals.
- The visual description should be imaginative and not limited by realism.
`;
            case 'simulation':
                return `
**Video Style: Simulation & Effects**
- Focus on photorealistic rendering and complex visual effects.
- Prompts should include technical terms like "fluid simulation", "particle effects", "smoke and fire VFX", "ray tracing reflections".
- Describe the physics of the scene in detail.
- The style is similar to a high-fidelity video game cutscene or a VFX demo reel.
`;
            case 'basic':
            default:
                return `
**Video Style: Basic Cinematic**
- Focus on standard but effective cinematography.
- Use clear and descriptive camera shots (e.g., establishing shot, medium shot, close-up).
- The style should be clean, realistic, and focused on telling the story visually.
`;
        }
    }

    const styleInstruction = getStyleInstruction(videoStyle);

    const systemInstruction = `You are a world-class storyteller and cinematographer. Your task is to generate a cohesive story and a series of detailed video prompts based on the provided theme, details, and character information. You will generate exactly ${numPrompts} prompts.

${styleInstruction}

**Character Consistency is PARAMOUNT:**
You have been provided with "Character Sheets" containing detailed descriptions and/or reference images. Treat these sheets as the absolute source of truth.

**Your Golden Rule:** Every time a character appears in a scene, you MUST use their full, detailed description from the Character Sheet to describe them. This is not optional. This repetition is intentional and crucial for the AI video generator to maintain consistency.

- Refer to characters as "Character 1", "Character 2", etc.
- Always adhere strictly to their provided details. The reference image is the primary source of truth for appearance.

First, write a detailed and engaging story in Vietnamese that follows the provided outline. The story should be structured to match the ${numPrompts} prompts that will be created. ${videoStyle === 'ai-lip-sync' ? 'The story MUST include dialogue for the characters.' : ''}

Second, based on the story you just wrote, create an array of exactly ${numPrompts} video prompts in English. Each prompt must describe a single, continuous 8-second scene and follow the story logically.
YOU MUST return exactly ${numPrompts} prompts.
If you return fewer or more, your output will be considered invalid.
Do not merge or split prompts. Each scene = 1 prompt = 8 seconds.

**Prompt Structure:** Each prompt MUST be a single, continuous string, structured with specific bracketed sections. Follow this format precisely for every prompt.
\`[STYLE KEYWORDS] - [MAIN CHARACTER 1: Full Description] [SCENE: Description] [LIGHTING: Description] [AUDIO: Description] [TIME/LOCATION: Description]\`

1.  **[STYLE KEYWORDS]:**
    - Start with a list of 5-10 comma-separated keywords that define the visual style and quality. Examples: "hyper-realistic textures, photorealistic rendering, naturalistic lighting, lifelike details, cinematic realism, tactile surfaces".

2.  **[MAIN CHARACTER 1: Full Description]:**
    - For EACH character present in the scene, you must include a dedicated bracketed section. Use "MAIN CHARACTER 1", "MAIN CHARACTER 2", etc., corresponding to their character sheet.
    - The bracket MUST start with \`[MAIN CHARACTER [number]:\`.
    - Inside this bracket, you MUST embed their full, detailed description from the Character Sheet. This repetition is critical for consistency.

3.  **[SCENE: Description]:**
    - Describe the camera shot (e.g., Extreme Wide Shot, Low Angle Shot), the setting, and the character actions. Be highly descriptive and cinematic. Use terms like 'Dolly In', 'Pan Left', etc.
    - Example: "[SCENE: Extreme Wide Shot of a massive, decaying cathedral... The camera slowly Dollies In...]"

4.  **[LIGHTING: Description]:**
    - Detail the lighting of the scene, including sources, mood, and color palette.
    - Example: "[LIGHTING: Dramatic lightning flashes... Cold blue moonlight... The color palette is dominated by deep blues, greys...]"

5.  **[AUDIO: Description]:**
    - Describe all sounds for the scene, including ambient sounds, sound effects, and character dialogue (if applicable).
    - Example: "[AUDIO: Thunder rumbling overhead, rain hammering on the roof... Leo's soft humming...]"
    - ${videoStyle === 'ai-lip-sync' ? 'Include character dialogue directly from the story. Dialogue can be prefixed with "voice:" for clarity.' : 'DO NOT include any narration or background music.'}

6.  **[TIME/LOCATION: Description]:**
    - Specify the time of day and the exact location.
    - Example: "[TIME/LOCATION: Midnight, abandoned cathedral interior - establishing their current home]"

**Example of a final prompt:**
\`hyper-realistic textures, photorealistic rendering, naturalistic lighting, cinematic realism - [MAIN CHARACTER 1: a 12-year-old boy with haunted emerald green eyes, unkempt chestnut brown hair, wearing a faded blue jacket over a grey t-shirt, worn jeans, and sneakers.] [MAIN CHARACTER 2: a majestic but malnourished Irish Wolfhound with intelligent amber eyes and grey and white fur.] [SCENE: Extreme Wide Shot of a massive, decaying cathedral during a thunderstorm. Rain lashes against broken stained glass windows. The camera slowly Dollies In through a hole in the roof, revealing Character 1 huddled with Character 2 in a dry corner.] [LIGHTING: Dramatic lightning flashes illuminate the vast space, casting long, moving shadows. Cold blue moonlight filters through broken windows. The color palette is dominated by deep blues and greys.] [AUDIO: Thunder rumbling, rain hammering on the roof, wind howling. The dog's deep, rhythmic breathing. The boy's soft humming.] [TIME/LOCATION: Midnight, abandoned cathedral interior]\`

You must return a JSON object with two keys: "story" (a single string with the full narrative in Vietnamese) and "prompts" (an array of strings, each following the specified format).`;

    const MAX_RETRIES = 3;
    let lastKnownError: string = 'Lỗi không xác định';

    const characterSheet = characters.filter(c => c.description).map((char, index) =>
        `// CHARACTER SHEET ${index + 1}\n` +
        `ref_name: Character ${index + 1}\n` +
        `description: "${char.description}"`
    ).join('\n\n');
    
    const textPrompt = `Video Theme: "${theme}"\nDetailed Description: "${detailedDescription}"\n\n---\n${characterSheet}\n---\n\nOUTLINE (in Vietnamese, for context):\n${outline}\n---\n\nIMPORTANT: You must return a JSON object where the "prompts" array contains exactly ${numPrompts} items. Adhere strictly to the character sheets provided.`;

    const contentParts: any[] = [];

    characters.forEach((char, index) => {
        if (char.image) {
            const match = char.image.match(/^data:(.+);base64,(.+)$/);
            if (match) {
                const mimeType = match[1];
                const data = match[2];
                contentParts.push({ text: `This is the reference image for Character ${index + 1}. Their description is "${char.description}". This image is the primary source of truth.` });
                contentParts.push({
                    inlineData: { mimeType, data },
                });
            }
        }
    });
    
    contentParts.push({ text: textPrompt });

    const requestPayload = {
      model,
      contents: { parts: contentParts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            story: {
              type: Type.STRING,
              description: `A detailed story in Vietnamese based on the outline, structured for ${numPrompts} scenes, maintaining character consistency.`,
            },
            prompts: {
              type: Type.ARRAY,
              description: `An array of exactly ${numPrompts} detailed video prompts where each prompt includes a character consistency reminder if a character is present.`,
              items: {
                type: Type.STRING,
                description: "A detailed prompt for an 8-second video scene, focusing on visuals, sound effects, and a mandatory character consistency reminder.",
              },
            },
          },
          required: ["story", "prompts"],
        },
      },
    };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent(requestPayload);
      const jsonString = response.text;
      
      if (!jsonString) {
        throw new Error("Phản hồi của AI trống.");
      }
      
      const parsed = JSON.parse(jsonString);

      if (!parsed.story || !parsed.prompts || !Array.isArray(parsed.prompts)) {
        throw new Error("Phản hồi của AI không khớp với định dạng mong đợi.");
      }

      if (parsed.prompts.length === numPrompts) {
        // Gắn số thứ tự 2 chữ số cho mỗi prompt
        const numberedPrompts = parsed.prompts.map((prompt: string, index: number) => {
          const num = (index + 1).toString().padStart(2, "0"); // 01, 02, 03...
          return `${num}. ${prompt.trim()}`;
        });
      
        return {
          story: parsed.story.trim(),
          prompts: numberedPrompts,
        };
      } else {
        lastKnownError = `AI đã tạo ${parsed.prompts.length} prompts, nhưng yêu cầu là ${numPrompts}.`;
        console.warn(`Attempt ${attempt}/${MAX_RETRIES}: ${lastKnownError} Retrying...`);
      }
    } catch (error) {
      console.error(`Error on attempt ${attempt}/${MAX_RETRIES}:`, error);
      if (error instanceof SyntaxError) {
        lastKnownError = "Không thể phân tích phản hồi JSON từ AI.";
      } else if (error instanceof Error) {
        lastKnownError = error.message;
      }
    }
  }

  // If loop finishes, all retries have failed. Throw a comprehensive error.
  throw new Error(`Tạo thất bại sau ${MAX_RETRIES} lần thử. Vấn đề: ${lastKnownError} Vui lòng thử lại với yêu cầu đơn giản hơn hoặc số lượng prompt ít hơn.`);
};
