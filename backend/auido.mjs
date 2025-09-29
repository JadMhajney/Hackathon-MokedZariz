import fs from "fs";
import OpenAI from "openai";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function read_audio(file_path) {
  try {
    console.log('Transcribing audio file:', file_path);
    
    // Check if file exists
    if (!fs.existsSync(file_path)) {
      throw new Error(`Audio file not found: ${file_path}`);
    }
    
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(file_path),
      model: "whisper-1",
      language: "en"
    });

    console.log('Transcription successful:', transcription.text);
    return transcription.text;
  } catch (error) {
    console.error('Audio transcription error:', error);
    throw error;
  }
}