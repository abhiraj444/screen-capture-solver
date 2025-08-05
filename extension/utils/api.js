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
    const GEMINI_API_KEY = 'AIzaSyDf4uTbOr91S26-OfZw8_S8460i9FjTsUo';

    // Get model preference from storage
    const useAdvancedModel = await new Promise(resolve => {
        chrome.storage.local.get(['useAdvancedModel'], (result) => {
            resolve(!!result.useAdvancedModel);
        });
    });

    const GEMINI_API_URL = useAdvancedModel
        ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`
        : `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const SYSTEM_PROMPT = `
You are an expert academic assistant that analyzes screenshots to identify and solve questions.

TASK: Analyze the provided screenshot and:
1. Identify ALL questions present (even if partially visible)
2. For each question, provide a complete solution
3. Return results in the specified JSON format

IMPORTANT FORMATTING INSTRUCTIONS:
- If any part of the question, options, or answer contains code, ALWAYS format code using HTML <pre><code class="language-xxx">...</code></pre> blocks (not Markdown triple backticks).
- Do NOT use Markdown code blocks (i.e., do NOT use \`\`\`).
- Preserve code indentation and syntax highlighting by specifying the correct language in the class attribute (e.g., language-java, language-python).
- For MCQ questions, include all options as an array in the "options" field, preserving their exact text and order as shown in the screenshot.
- In the "direct_answer" field for MCQ, specify both the option label (e.g., "A", "B", "C", "D") and the exact option text, formatted as: Answer (option X): exact option text.
- For other question types, provide concise answers as usual.

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
      "formatted_question": "Exact question and exact options as it appears in the screenshot, with code always in <pre><code> blocks",
      "options": ["Option A text", "Option B text", ...], // For MCQ only
      "direct_answer": "For MCQ: If question is asking to choose multiple option then Answer (option X/Y/Z/W) along with text of the option, otherwise if it looks like single answer then Answer (option X): exact option text. For others: concise answer, with code always in <pre><code> blocks if present.",
      "explanation": "4-5 line clear explanation, with code always in <pre><code> blocks if present.",
      "detailed_reasoning": "Step-by-step process, with code always in <pre><code> blocks if present.",
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

IMPORTANT: For any code, always use HTML <pre><code class="language-xxx">...</code></pre> blocks, never Markdown code blocks.
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

            // Extract JSON from Markdown code block if present
            const jsonMatch = geminiResponseText.match(/```json\n([\s\S]*?)\n```/);
            const jsonString = jsonMatch ? jsonMatch[1] : geminiResponseText;

            // Attempt to parse the JSON response
            try {
                return JSON.parse(jsonString);
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

/**
 * Sends selected text to the Gemini API for analysis and question filtering.
 * @param {string} selectedText - The text selected by the user.
 * @returns {Promise<object>} - A promise that resolves with the analysis from the API.
 */
export async function analyzeSelectedText(selectedText) {
    const GEMINI_API_KEY = 'AIzaSyDf4uTbOr91S26-OfZw8_S8460i9FjTsUo';

    // Get model preference from storage
    const useAdvancedModel = await new Promise(resolve => {
        chrome.storage.local.get(['useAdvancedModel'], (result) => {
            resolve(!!result.useAdvancedModel);
        });
    });

    const GEMINI_API_URL = useAdvancedModel
        ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`
        : `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const SYSTEM_PROMPT = `
You are an expert academic assistant that analyzes selected text to identify and solve questions.

TASK: Analyze the provided text and:
1. Identify ALL questions present in the text (filter out any irrelevant content)
2. Extract clean, well-formatted questions from potentially mixed-up or messy text
3. For each question identified, provide a complete solution
4. Return results in the specified JSON format

IMPORTANT FILTERING INSTRUCTIONS:
- The provided text may contain mixed content including navigation menus, advertisements, headers/footers, or other irrelevant text
- Focus ONLY on identifying actual questions or problems that need solving
- Clean up and properly format questions that may have formatting issues
- Ignore any non-question content like page headers, navigation, advertisements, etc.
- If the text contains multiple questions, extract and solve each one separately

FORMATTING INSTRUCTIONS:
- If any part of the question, options, or answer contains code, ALWAYS format code using HTML <pre><code class="language-xxx">...</code></pre> blocks (not Markdown triple backticks).
- Do NOT use Markdown code blocks (i.e., do NOT use \`\`\`).
- Preserve code indentation and syntax highlighting by specifying the correct language in the class attribute (e.g., language-java, language-python).
- For MCQ questions, include all options as an array in the "options" field, preserving their exact text and order.
- In the "direct_answer" field for MCQ, specify both the option label (e.g., "A", "B", "C", "D") and the exact option text, formatted as: Answer (option X): exact option text.
- For other question types, provide concise answers as usual.

QUESTION TYPES TO HANDLE:
- Multiple Choice Questions (MCQ)
- Short Answer Questions
- Essay Questions
- Mathematical Problems
- Code/Programming Questions
- Conceptual Questions
- True/False Questions

RESPONSE FORMAT:
{
  "questions_found": number,
  "confidence_score": 0-100,
  "questions": [
    {
      "id": "q1",
      "type": "mcq|short|essay|math|code|concept|truefalse",
      "original_text": "Exact question as it appears in the selected text",
      "formatted_question": "Clean, well-formatted version of the question with code in <pre><code> blocks if present",
      "options": ["Option A text", "Option B text", ...], // For MCQ only
      "direct_answer": "For MCQ: Answer (option X): exact option text. For others: concise answer, with code in <pre><code> blocks if present.",
      "explanation": "4-5 line clear explanation, with code in <pre><code> blocks if present.",
      "detailed_reasoning": "Step-by-step process, with code in <pre><code> blocks if present.",
      "confidence": 0-100,
      "difficulty": "easy|medium|hard",
      "subject": "math|physics|chemistry|programming|etc",
      "keywords": ["tag1", "tag2"]
    }
  ]
}

QUALITY REQUIREMENTS:
- Accuracy over speed
- Clear, educational explanations
- Proper filtering of irrelevant content
- Handle mixed/messy text gracefully
- Extract clean questions from noisy text

IMPORTANT: For any code, always use HTML <pre><code class="language-xxx">...</code></pre> blocks, never Markdown code blocks.
`;

    const requestBody = {
        contents: [
            {
                parts: [
                    { text: SYSTEM_PROMPT },
                    { text: `\n\nSELECTED TEXT TO ANALYZE:\n${selectedText}` }
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

            // Extract JSON from Markdown code block if present
            const jsonMatch = geminiResponseText.match(/```json\n([\s\S]*?)\n```/);
            const jsonString = jsonMatch ? jsonMatch[1] : geminiResponseText;

            // Attempt to parse the JSON response
            try {
                return JSON.parse(jsonString);
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
                throw new Error('Failed to analyze selected text after multiple retries.');
            }
        }
    }
    throw new Error('Unexpected error during text analysis.'); // Should not be reached
}
