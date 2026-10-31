import { isPageMessage, type PageBody, pageMessage } from "./messages";

declare class MediaStreamTrackGenerator extends MediaStreamTrack {
  constructor(init: { kind: "audio" | "video" });
  readonly writable: WritableStream<AudioData>;
}

const DECISION_TIMEOUT_MS = 5000;
const SAMPLE_RATE = 48_000;
const FRAME_SAMPLES = 960;
const FRAME_MICROS = (FRAME_SAMPLES / SAMPLE_RATE) * 1_000_000;
const PUMP_MS = 20;
const LEAD_MICROS = 60_000;

const post = (message: PageBody) =>
  window.postMessage(pageMessage(message), location.origin);

const realGetUserMedia = navigator.mediaDevices.getUserMedia.bind(
  navigator.mediaDevices,
);

let standIn: StandInMic | null = null;
let decide: (enabled: boolean) => void = () => {};
const decision = new Promise<boolean>((resolve) => {
  decide = resolve;
  setTimeout(() => resolve(false), DECISION_TIMEOUT_MS);
});

navigator.mediaDevices.getUserMedia = async (constraints) =>
  (await decision) && standIn
    ? standIn.stream(constraints)
    : realGetUserMedia(constraints);

const realQuery = navigator.permissions.query.bind(navigator.permissions);
const realEnumerate = navigator.mediaDevices.enumerateDevices.bind(
  navigator.mediaDevices,
);

const onStandInTab = async () => (await decision) && standIn !== null;

const grantedStatus = (name: string) =>
  Object.assign(new EventTarget(), {
    name,
    state: "granted",
    onchange: null,
  }) as unknown as PermissionStatus;

const standInDevice = (kind: MediaDeviceKind) =>
  ({
    deviceId: "stand-in",
    groupId: "stand-in",
    kind,
    label: "Stand-in",
    toJSON() {
      return this;
    },
  }) as MediaDeviceInfo;

navigator.permissions.query = async (descriptor) =>
  ["microphone", "camera"].includes(descriptor.name) && (await onStandInTab())
    ? grantedStatus(descriptor.name)
    : realQuery(descriptor);

navigator.mediaDevices.enumerateDevices = async () => {
  const devices = await realEnumerate();
  if (!(await onStandInTab())) return devices;
  return [
    ...devices.filter((device) => device.kind === "audiooutput"),
    standInDevice("audioinput"),
    standInDevice("videoinput"),
  ];
};

function nameCard() {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 360;
  const context = canvas.getContext("2d")!;
  const draw = () => {
    context.fillStyle = "#0c0c0e";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.textAlign = "center";
    context.fillStyle = "#d65fc0";
    context.font = "600 22px system-ui, sans-serif";
    context.fillText("AI STAND-IN", 320, 165);
    context.fillStyle = "#ffffff";
    context.font = "500 28px system-ui, sans-serif";
    context.fillText("Taking notes for the owner", 320, 210);
  };
  draw();
  setInterval(draw, 1000);
  return canvas.captureStream(1);
}

window.addEventListener("message", (event) => {
  if (!isPageMessage(event)) return;
  const message = event.data;
  if (message.type === "enable") {
    standIn ??= new StandInMic();
    decide(true);
  } else if (message.type === "disable") {
    decide(false);
  } else if (message.type === "say" && standIn) {
    void standIn
      .play(message.audioBase64)
      .then(() => true)
      .catch(() => false)
      .then((ok) => post({ type: "said", id: message.id, ok }));
  }
});

class StandInMic {
  private readonly track = new MediaStreamTrackGenerator({ kind: "audio" });
  private readonly writer = this.track.writable.getWriter();
  private readonly startedAt = performance.now();
  private writtenMicros = 0;
  private speech: {
    samples: Float32Array;
    position: number;
    done: () => void;
  } | null = null;

  constructor() {
    setInterval(() => this.pump(), PUMP_MS);
  }

  stream(constraints: MediaStreamConstraints = {}) {
    const audio = constraints.audio ? [this.track.clone()] : [];
    const video = constraints.video ? nameCard().getVideoTracks() : [];
    return new MediaStream([...audio, ...video]);
  }

  async play(audioBase64: string) {
    const bytes = Uint8Array.from(atob(audioBase64), (char) =>
      char.charCodeAt(0),
    );
    const buffer = await new OfflineAudioContext(
      1,
      1,
      SAMPLE_RATE,
    ).decodeAudioData(bytes.buffer);
    await new Promise<void>((done) => {
      this.speech = { samples: buffer.getChannelData(0), position: 0, done };
    });
  }

  private pump() {
    const elapsedMicros = (performance.now() - this.startedAt) * 1000;
    while (this.writtenMicros < elapsedMicros + LEAD_MICROS) {
      void this.writer.write(this.nextFrame());
      this.writtenMicros += FRAME_MICROS;
    }
  }

  private nextFrame() {
    const data = new Float32Array(FRAME_SAMPLES);
    const speech = this.speech;
    if (speech) {
      data.set(
        speech.samples.subarray(
          speech.position,
          speech.position + FRAME_SAMPLES,
        ),
      );
      speech.position += FRAME_SAMPLES;
      if (speech.position >= speech.samples.length) {
        this.speech = null;
        speech.done();
      }
    }
    return new AudioData({
      format: "f32-planar",
      sampleRate: SAMPLE_RATE,
      numberOfFrames: FRAME_SAMPLES,
      numberOfChannels: 1,
      timestamp: this.writtenMicros,
      data,
    });
  }
}
