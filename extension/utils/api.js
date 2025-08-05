/**
 * This file contains the logic for communicating with the Gemini API.
 * It provides a function to send a screenshot to the API and receive the analysis.
 */

/**
 * Sends a screenshot to the Gemini API for analysis.
 * @param {string} screenshotUrl - The data URL of the screenshot.
 * @returns {Promise<object>} - A promise that resolves with the analysis from the API.
 */
export async function analyzeScreenshot(screenshotUrl) {
    const GEMINI_API_KEY = 'AIzaSyDf4uTbOr91S26-OfZw8_S8460i9FjTsUo'; // Your Gemini API Key
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const SYSTEM_PROMPT = `
You are an expert academic assistant that analyzes screenshots to identify and solve questions.

TASK: Analyze the provided screenshot and:
1. Identify ALL questions present (even if partially visible)
2. For each question, provide a complete solution
3. Return results in the specified JSON format

QUESTION TYPES TO HANDLE:
- Multiple Choice Questions (MCQ)
- Short Answer Questions
- Essay Questions
- Mathematical Problems
- Code/Programming Questions
- Diagram-based Questions

RESPONSE FORMAT:
{
  "questions_found": number,
  "confidence_score": 0-100,
  "questions": [
    {
      "id": "q1",
      "type": "mcq|short|essay|math|code|diagram",
      "original_text": "Exact question as it appears",
      "formatted_question": "Clean, formatted version",
      "direct_answer": "For MCQ: A/B/C/D, For others: concise answer",
      "explanation": "4-5 line clear explanation",
      "detailed_reasoning": "Step-by-step process",
      "confidence": 0-100,
      "difficulty": "easy|medium|hard",
      "subject": "math|physics|chemistry|etc",
      "keywords": ["tag1", "tag2"]
    }
  ]
}

QUALITY REQUIREMENTS:
- Accuracy over speed
- Clear, educational explanations
- Proper formatting with HTML tags when needed
- Handle edge cases gracefully
`;

    // Remove the data URL prefix (e.g., "data:image/png;base64,")
    const base64EncodedImage = screenshotUrl.split(',')[1];

    const requestBody = {
        contents: [
            {
                parts: [
                    { text: SYSTEM_PROMPT },
                    {
                        inline_data: {
                            mime_type: 'image/png', // Assuming PNG for screenshots
                            data: base64EncodedImage
                        }
                    }
                ]
            }
        ]
    };

    const MAX_RETRIES = 3;
    let retries = 0;

    while (retries < MAX_RETRIES) {
        try {
            const response = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Gemini API error:', errorData);
                throw new Error(`Gemini API error: ${response.status} - ${errorData.error.message || response.statusText}`);
            }

            const data = await response.json();
            // Assuming the response contains a 'text' field with the JSON string
            const geminiResponseText = data.candidates[0].content.parts[0].text;

            // Attempt to parse the JSON response
            try {
                return JSON.parse(geminiResponseText);
            } catch (jsonParseError) {
                console.error('Failed to parse Gemini response as JSON:', geminiResponseText, jsonParseError);
                throw new Error('Invalid JSON response from Gemini API.');
            }

        } catch (error) {
            console.error(`Attempt ${retries + 1} failed:`, error);
            retries++;
            if (retries < MAX_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries))); // Exponential backoff
            } else {
                throw new Error('Failed to analyze screenshot after multiple retries.');
            }
        }
    }
    throw new Error('Unexpected error during screenshot analysis.'); // Should not be reached
}
