"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { postCommunityMessageAction, type ActionState } from "@/app/actions";

type Kind = "text" | "image" | "voice" | "file";

type Attachment = { name: string; mime: string; size: number; dataUrl: string };

const LIMITS: Record<Exclude<Kind, "text">, number> = {
  image: 300_000,
  voice: 250_000,
  file: 150_000,
};

const KIND_META: Record<Kind, { label: string; icon: string }> = {
  text: { label: "Text", icon: "✍️" },
  image: { label: "Photo", icon: "🖼️" },
  voice: { label: "Voice", icon: "🎙️" },
  file: { label: "File", icon: "📎" },
};

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readAsDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(file);
  });
}

/** Downscales a photo before it reaches the JSON document; keeps rooms small. */
async function compressImage(file: File): Promise<Attachment> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("image"));
      element.src = objectUrl;
    });
    const maxSide = 1000;
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    const size = Math.round((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75);
    return {
      name: `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`,
      mime: "image/jpeg",
      size,
      dataUrl,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function CommunityComposer({
  aiId,
  aiName,
  roomId,
  kinds,
  maxLength,
}: {
  aiId: string;
  aiName: string;
  /** set for an admin-created room; omitted for the AI's default room */
  roomId?: string | null;
  kinds: Kind[];
  maxLength: number;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(postCommunityMessageAction, { ok: false });
  const router = useRouter();
  const available = kinds.length ? kinds : (["text"] as Kind[]);
  const [kind, setKind] = useState<Kind>(available.includes("text") ? "text" : available[0]);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimer = useRef<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!state.ok) return;
    setAttachment(null);
    setLocalError(null);
    formRef.current?.reset();
    router.refresh();
  }, [state, router]);

  // Keeps the room fresh while it is open; no popup and no extra infrastructure.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 20000);
    return () => window.clearInterval(timer);
  }, [router]);

  useEffect(() => {
    return () => {
      if (stopTimer.current) window.clearTimeout(stopTimer.current);
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function resetAttachment() {
    setAttachment(null);
    setLocalError(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function switchKind(next: Kind) {
    if (next === kind) return;
    if (recording) stopRecording();
    resetAttachment();
    setKind(next);
  }

  async function pickImage(file: File | undefined) {
    if (!file) return;
    setLocalError(null);
    try {
      const result = await compressImage(file);
      if (result.size > LIMITS.image) {
        setLocalError(`That photo is still too large (${humanSize(result.size)}). Keep it under ${humanSize(LIMITS.image)}.`);
        return;
      }
      setAttachment(result);
    } catch {
      setLocalError("That image could not be read. Try a JPEG or PNG photo.");
    }
  }

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setLocalError(null);
    if (file.size > LIMITS.file) {
      setLocalError(`That file is too large (${humanSize(file.size)}). Keep it under ${humanSize(LIMITS.file)}.`);
      return;
    }
    if (/^(text\/html|image\/svg|application\/javascript)/i.test(file.type)) {
      setLocalError("This file type cannot be shared in the community.");
      return;
    }
    try {
      const dataUrl = await readAsDataUrl(file);
      setAttachment({ name: file.name.slice(0, 120) || "attachment", mime: file.type || "application/octet-stream", size: file.size, dataUrl });
    } catch {
      setLocalError("That file could not be read. Try a smaller file.");
    }
  }

  async function startRecording() {
    setLocalError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setLocalError("Voice notes are not supported in this browser. Try Chrome, Edge or Safari.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        if (stopTimer.current) window.clearTimeout(stopTimer.current);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size === 0) return;
        if (blob.size > LIMITS.voice) {
          setLocalError(`That voice note is too long (${humanSize(blob.size)}). Keep it under ${humanSize(LIMITS.voice)}.`);
          return;
        }
        try {
          const dataUrl = await readAsDataUrl(blob);
          const extension = (recorder.mimeType || "audio/webm").includes("mp4") ? "m4a" : "webm";
          setAttachment({ name: `voice-note.${extension}`, mime: blob.type || "audio/webm", size: blob.size, dataUrl });
        } catch {
          setLocalError("The voice note could not be saved. Please record it again.");
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      // Hard stop keeps a single clip small enough for the JSON document.
      stopTimer.current = window.setTimeout(() => recorderRef.current?.stop(), 45000);
    } catch {
      setLocalError("Microphone access was blocked. Allow it in your browser and try again.");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  const needsAttachment = kind !== "text";
  const error = localError ?? state.error;
  const message = state.ok ? state.message : undefined;
  const imageInputId = `community-image-${aiId}`;
  const fileInputId = `community-file-${aiId}`;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <form ref={formRef} action={formAction}>
        <input type="hidden" name="aiId" value={aiId} />
        {roomId ? <input type="hidden" name="roomId" value={roomId} /> : null}
        <input type="hidden" name="kind" value={kind} />
        {attachment ? (
          <>
            <input type="hidden" name="attachmentData" value={attachment.dataUrl} />
            <input type="hidden" name="attachmentName" value={attachment.name} />
            <input type="hidden" name="attachmentMime" value={attachment.mime} />
            <input type="hidden" name="attachmentSize" value={attachment.size} />
          </>
        ) : null}

        {available.length > 1 ? (
          <div className="mb-1.5 flex items-center gap-1">
            {available.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => switchKind(option)}
                aria-pressed={kind === option}
                aria-label={`Attach ${KIND_META[option].label.toLowerCase()}`}
                title={KIND_META[option].label}
                className={`grid h-8 w-8 place-items-center rounded-full border text-sm transition ${
                  kind === option
                    ? "border-[#00a884] bg-[#d9fdd3] text-[#075e54]"
                    : "border-[#d1d7db] bg-white text-[#54656f] hover:border-[#00a884]/50"
                }`}
              >
                <span aria-hidden>{KIND_META[option].icon}</span>
              </button>
            ))}
            <span className="ml-auto hidden text-[10px] text-[#667781] sm:inline">Free · please be respectful</span>
          </div>
        ) : null}

        {kind === "image" ? (
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <label
              htmlFor={imageInputId}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#d1d7db] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#075e54] shadow-sm transition hover:border-[#00a884]/60"
            >
              🖼️ {attachment ? "Change photo" : "Choose photo"}
            </label>
            <input
              ref={imageInputRef}
              id={imageInputId}
              type="file"
              accept="image/*"
              onChange={(event) => void pickImage(event.target.files?.[0])}
              className="sr-only"
            />
            <span className="text-[10px] text-[#667781]">Auto-compressed · max {humanSize(LIMITS.image)}</span>
          </div>
        ) : null}

        {kind === "file" ? (
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <label
              htmlFor={fileInputId}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#d1d7db] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#075e54] shadow-sm transition hover:border-[#00a884]/60"
            >
              📎 {attachment ? "Change file" : "Choose file"}
            </label>
            <input
              ref={fileInputRef}
              id={fileInputId}
              type="file"
              onChange={(event) => void pickFile(event.target.files?.[0])}
              className="sr-only"
            />
            <span className="text-[10px] text-[#667781]">Max {humanSize(LIMITS.file)}</span>
          </div>
        ) : null}

        {kind === "voice" ? (
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            {recording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-rose-600"
              >
                <span className="live-dot" aria-hidden /> Stop recording
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void startRecording()}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#d1d7db] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#075e54] shadow-sm transition hover:border-[#00a884]/60"
              >
                🎙️ Record voice note
              </button>
            )}
            <span className="text-[10px] text-[#667781]">Up to 45 seconds · max {humanSize(LIMITS.voice)}</span>
          </div>
        ) : null}

        {attachment ? (
          <div className="mb-1.5 flex items-center gap-2 rounded-xl border border-[#d1d7db] bg-white p-1.5 shadow-sm">
            {kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={attachment.dataUrl} alt={attachment.name} className="h-11 w-11 rounded-lg object-cover" />
            ) : null}
            {kind === "voice" ? <audio controls src={attachment.dataUrl} className="h-8 max-w-[55%]" /> : null}
            <span className="min-w-0 flex-1 truncate text-[11px] text-[#54656f]">
              {attachment.name} · {humanSize(attachment.size)}
            </span>
            <button
              type="button"
              onClick={resetAttachment}
              aria-label="Remove attachment"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[#667781] transition hover:bg-rose-50 hover:text-rose-600"
            >
              ✕
            </button>
          </div>
        ) : null}

        <div className="flex items-end gap-1.5">
          <div className="min-w-0 flex-1 rounded-[1.35rem] bg-white px-3 py-1 shadow-sm">
            <label className="sr-only" htmlFor={`community-body-${aiId}`}>
              Message
            </label>
            <textarea
              id={`community-body-${aiId}`}
              name="body"
              rows={1}
              maxLength={maxLength}
              placeholder={
                needsAttachment
                  ? `Add a caption for your ${KIND_META[kind].label.toLowerCase()} (optional)…`
                  : `Message ${aiName}…`
              }
              className="field-sizing-content max-h-28 min-h-[26px] w-full resize-none border-0 bg-transparent py-1.5 text-[13.5px] leading-relaxed text-[#111b21] outline-none placeholder:text-[#8696a0]"
            />
          </div>
          <button
            type="submit"
            disabled={pending || recording || (needsAttachment && !attachment)}
            aria-label={pending ? "Posting message" : "Send message"}
            title="Send message"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#00a884] text-white shadow-sm transition hover:bg-[#008f72] disabled:cursor-not-allowed disabled:bg-[#9fb3ad]"
          >
            {pending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
            ) : (
              <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path d="M2.2 9.3l14.6-6.8c.6-.3 1.2.3.9.9l-6.8 14.6c-.3.6-1.2.5-1.3-.2l-.8-5.4-5.4-.8c-.7-.1-.8-1-.2-1.3z" fill="currentColor" />
              </svg>
            )}
          </button>
        </div>

        {needsAttachment && !attachment ? (
          <p className="mt-1 text-[10px] text-[#667781]">Choose a {KIND_META[kind].label.toLowerCase()} to post.</p>
        ) : null}
      </form>

      {error ? <p className="mt-1.5 text-[11px] font-medium text-rose-600">{error}</p> : null}
      {message ? <p className="mt-1.5 text-[11px] font-medium text-emerald-700">{message}</p> : null}
    </div>
  );
}
