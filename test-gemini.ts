import { GoogleGenAI } from '@google/genai';
import { ENV } from './src/config';

async function test() {
  console.log('Testing Gemini API key...');
  console.log('API Key length:', ENV.GEMINI_API_KEY?.length);
  console.log('API Key starts with:', ENV.GEMINI_API_KEY?.substring(0, 7));

  try {
    const ai = new GoogleGenAI({ apiKey: ENV.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Hello, reply with "success" if you can hear me.'
    });
    console.log('Success! Response:', response.text);
  } catch (error: any) {
    console.error('Error during Gemini API call:', error);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

test();
