import OpenAI from "openai";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize the OpenAI client with your API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Function to send a message to the OpenAI API
export async function sendMessage(prompt) {
  try {
    console.log('Sending prompt to OpenAI:', prompt);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { 
          role: 'system', 
          content: 'You are an emergency response assistant. Provide concise, helpful responses.' 
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 100,
      temperature: 0.3, // Lower temperature for more consistent responses
    });

    const content = response.choices[0].message.content;
    console.log('OpenAI Response:', content);
    return content;
   
  } catch (error) {
    console.error('Error sending message to OpenAI:', error);
    throw error;
  }
}