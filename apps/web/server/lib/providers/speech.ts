interface SpeechProvider {
  synthesize(text: string): Promise<{ audio: Uint8Array; mimeType: string }>;
}

function openRouterSpeech(): SpeechProvider {
  const apiKey = process.env.OPENROUTER_VOICE_API_KEY; // guard:allow-env-credential — deployment-owned setting, never per-user
  if (!apiKey) throw new Error("Set OPENROUTER_VOICE_API_KEY.");
  const model = process.env.TTS_MODEL ?? "deepgram/aura-2"; // guard:allow-env-credential — deployment-owned setting, never per-user
  const voice = process.env.TTS_VOICE ?? "aura-2-cora-en"; // guard:allow-env-credential — deployment-owned setting, never per-user

  return {
    async synthesize(text) {
      const response = await fetch(
        "https://openrouter.ai/api/v1/audio/speech",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            voice,
            input: text,
            response_format: "mp3",
          }),
        },
      );
      if (!response.ok) {
        throw new Error(`Speech failed (${response.status}).`);
      }
      return {
        audio: new Uint8Array(await response.arrayBuffer()),
        mimeType: "audio/mpeg",
      };
    },
  };
}

export const speechProvider = (): SpeechProvider => openRouterSpeech();
