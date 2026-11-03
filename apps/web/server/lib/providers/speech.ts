interface SpeechProvider {
  synthesize(text: string): Promise<{ audio: Uint8Array; mimeType: string }>;
}

