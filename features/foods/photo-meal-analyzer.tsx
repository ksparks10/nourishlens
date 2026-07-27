"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Camera, Check, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { PortionSelector } from "@/features/foods/portion-selector";
import { localDateInputValue } from "@/lib/date/local-date";

type Candidate = {
  id: string;
  name: string;
  brand: string | null;
  servingLabel: string | null;
  servingGrams: number | null;
  dataCompleteness: number;
};
type Detection = {
  name: string;
  preparation: string;
  confidence: number;
  portionDescription: string;
  estimatedGrams: number;
  visionEstimatedGrams?: number;
  uncertaintyNotes: string;
  candidates: Candidate[];
  selectedId?: string;
};
type ModelStatus = { connected: boolean; installed: boolean; model: string };

function estimatedAnalysisProgress(seconds: number) {
  if (seconds < 10) return 12 + seconds * 2.3;
  if (seconds < 45) return 35 + (seconds - 10) * 0.9;
  if (seconds < 100) return 66.5 + (seconds - 45) * 0.45;
  return Math.min(94, 91.25 + (seconds - 100) * 0.08);
}

function analysisStage(seconds: number) {
  if (seconds < 8) return "Sending the prepared photo to local vision";
  if (seconds < 35) return "Recognizing foods and portions";
  if (seconds < 75) return "Reviewing details in the image";
  return "Finishing recognition and matching the food catalog";
}

async function normalizePhotoForVision(source: File) {
  const bitmap = await createImageBitmap(source);
  try {
    const maxDimension = 1600;
    const scale = Math.min(
      1,
      maxDimension / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Photo conversion is unavailable");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) =>
          result
            ? resolve(result)
            : reject(new Error("Photo conversion failed")),
        "image/jpeg",
        0.9,
      ),
    );
    const baseName = source.name.replace(/\.[^.]+$/, "") || "meal-photo";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}

export function PhotoMealAnalyzer() {
  const [status, setStatus] = useState<ModelStatus | null>(null),
    [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState<string | null>(null),
    [detections, setDetections] = useState<Detection[]>([]),
    [mealNotes, setMealNotes] = useState(""),
    [busy, setBusy] = useState<"prepare" | "analyze" | "log" | null>(null),
    [analysisSeconds, setAnalysisSeconds] = useState(0),
    [message, setMessage] = useState<string | null>(null),
    [mealType, setMealType] = useState("dinner"),
    [date, setDate] = useState(localDateInputValue),
    [time, setTime] = useState("18:00");
  useEffect(() => {
    fetch("/api/photo-food/analyze")
      .then((r) => r.json())
      .then((v) => setStatus(v as ModelStatus))
      .catch(() =>
        setStatus({ connected: false, installed: false, model: "gemma3:4b" }),
      );
  }, []);
  useEffect(() => {
    if (busy !== "analyze") {
      setAnalysisSeconds(0);
      return;
    }
    const startedAt = Date.now();
    const timer = window.setInterval(
      () => setAnalysisSeconds((Date.now() - startedAt) / 1000),
      500,
    );
    return () => window.clearInterval(timer);
  }, [busy]);
  const readyToLog = useMemo(
    () =>
      detections.length > 0 &&
      detections.every((item) => item.selectedId && item.estimatedGrams > 0),
    [detections],
  );
  async function chooseFile(next: File | null) {
    setFile(null);
    setPreview(null);
    setDetections([]);
    setMealNotes("");
    setMessage(null);
    if (next) {
      setBusy("prepare");
      try {
        const normalized = await normalizePhotoForVision(next);
        setFile(normalized);
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result as string);
        reader.onerror = () => {
          setFile(null);
          setMessage(
            "That photo could not be displayed. Please choose another image.",
          );
        };
        reader.readAsDataURL(normalized);
      } catch {
        setMessage(
          "That photo could not be prepared for local analysis. Try a different JPEG, PNG, or WebP image.",
        );
      } finally {
        setBusy(null);
      }
    }
  }
  async function analyze() {
    if (!file) return;
    setBusy("analyze");
    setMessage(null);
    const form = new FormData();
    form.set("image", file);
    try {
      const response = await fetch("/api/photo-food/analyze", {
          method: "POST",
          body: form,
        }),
        body = (await response.json()) as {
          data?: { foods: Detection[]; mealNotes: string };
          error?: string;
        };
      if (!response.ok || !body.data)
        throw new Error(body.error ?? "Unable to analyze photo");
      setDetections(
        body.data.foods.map((item) => {
          const first = item.candidates[0];
          return {
            ...item,
            selectedId: first?.id,
            estimatedGrams: item.estimatedGrams,
            visionEstimatedGrams: item.estimatedGrams,
          };
        }),
      );
      setMealNotes(body.data.mealNotes);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(null);
    }
  }
  function update(index: number, changes: Partial<Detection>) {
    setDetections((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item,
      ),
    );
  }
  async function logMeal() {
    if (!readyToLog) return;
    setBusy("log");
    setMessage(null);
    try {
      const response = await fetch("/api/photo-food/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: detections.map((item) => ({
              foodId: item.selectedId,
              grams: item.estimatedGrams,
            })),
            mealType,
            date,
            time,
          }),
        }),
        body = (await response.json()) as {
          data?: { added: number; date: string };
          error?: string;
        };
      if (!response.ok || !body.data)
        throw new Error(body.error ?? "Unable to log meal");
      window.location.href = `/app?date=${body.data.date}&message=${encodeURIComponent(`${body.data.added} reviewed foods logged from photo`)}`;
    } catch (error) {
      setMessage((error as Error).message);
      setBusy(null);
    }
  }
  return (
    <>
      <section className="photo-model-status card">
        <span
          className={`status-dot ${status?.connected && status.installed ? "ready" : ""}`}
        />
        <div>
          <strong>
            {!status
              ? "Checking local vision…"
              : status.connected && status.installed
                ? "Local vision is ready"
                : status.connected
                  ? "Ollama is running; vision model is not installed"
                  : "Ollama is not connected yet"}
          </strong>
          <p className="muted">
            Model: {status?.model ?? "gemma3:4b"}. Photos stay on this computer
            and are not saved after analysis.
          </p>
          {status?.connected && !status.installed && (
            <code>ollama pull {status.model}</code>
          )}
        </div>
      </section>
      <section className="photo-upload card">
        <div className="photo-dropzone">
          {preview ? (
            <Image
              src={preview}
              alt="Selected meal"
              width={900}
              height={600}
              unoptimized
            />
          ) : (
            <div>
              <Camera aria-hidden="true" size={38} />
              <strong>Take or choose a meal photo</strong>
              <p>Clear, overhead photos with separated foods work best.</p>
            </div>
          )}
        </div>
        <div className="actions">
          <label className="button photo-file-button">
            <ImagePlus aria-hidden="true" size={17} />
            Choose photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={(event) =>
                void chooseFile(event.target.files?.[0] ?? null)
              }
            />
          </label>
          <button
            className="button"
            type="button"
            disabled={!file || busy !== null || !status?.installed}
            onClick={analyze}
          >
            {busy === "prepare" ? (
              <>
                <LoaderCircle className="spin" aria-hidden="true" size={17} />
                Preparing photoâ€¦
              </>
            ) : busy === "analyze" ? (
              <>
                <LoaderCircle className="spin" aria-hidden="true" size={17} />
                Analyzing locally…
              </>
            ) : (
              "Identify foods"
            )}
          </button>
        </div>
        {busy === "analyze" && (
          <div className="photo-analysis-progress" role="status">
            <div>
              <strong>{analysisStage(analysisSeconds)}</strong>
              <span>{Math.floor(analysisSeconds)}s elapsed</span>
            </div>
            <progress
              max="100"
              value={estimatedAnalysisProgress(analysisSeconds)}
              aria-label="Estimated local photo analysis progress"
            />
            <small>
              Estimated progress â€” local analysis time varies by photo and
              computer.
            </small>
          </div>
        )}
        {message && (
          <p className="error" role="alert">
            {message}
          </p>
        )}
      </section>
      {detections.length > 0 && (
        <section className="photo-review">
          <div className="section-heading">
            <div>
              <p className="eyebrow">REVIEW REQUIRED</p>
              <h2>Confirm every detected food</h2>
            </div>
            <span>{detections.length} detected</span>
          </div>
          {mealNotes && <p className="card muted">{mealNotes}</p>}
          <div className="photo-detections">
            {detections.map((item, index) => (
              <article
                className="card photo-detection"
                key={`${item.name}-${index}`}
              >
                <div className="photo-detection-heading">
                  <div>
                    <strong>{item.name}</strong>
                    <p>
                      {item.preparation || "Preparation unclear"} ·{" "}
                      {Math.round(item.confidence * 100)}% confidence
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${item.name}`}
                    onClick={() =>
                      setDetections((items) =>
                        items.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    <Trash2 aria-hidden="true" size={17} />
                  </button>
                </div>
                <label>
                  Catalog match
                  <select
                    value={item.selectedId ?? ""}
                    onChange={(event) => {
                      const selectedId = event.target.value || undefined;
                      update(index, {
                        selectedId,
                      });
                    }}
                  >
                    <option value="">Choose a matching food</option>
                    {item.candidates.map((candidate) => (
                      <option value={candidate.id} key={candidate.id}>
                        {candidate.name}
                        {candidate.brand ? ` — ${candidate.brand}` : ""} ·{" "}
                        {candidate.dataCompleteness}% coverage
                      </option>
                    ))}
                  </select>
                </label>
                <PortionSelector
                  key={item.selectedId ?? `unmatched-${index}`}
                  servingGrams={
                    item.visionEstimatedGrams ?? item.estimatedGrams
                  }
                  servingLabel={`vision estimate: ${item.portionDescription}`}
                  onGramsChange={(grams) =>
                    update(index, { estimatedGrams: grams })
                  }
                />
                <p className="muted">
                  Vision estimate: {item.portionDescription}.{" "}
                  {item.uncertaintyNotes}
                </p>
                {!item.candidates.length && (
                  <p className="error">
                    No catalog match was found. Remove this item and add it
                    through food search.
                  </p>
                )}
              </article>
            ))}
          </div>
          <section className="card form">
            <div className="form-grid">
              <label>
                Meal
                <select
                  value={mealType}
                  onChange={(event) => setMealType(event.target.value)}
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="morning_snack">Morning snack</option>
                  <option value="lunch">Lunch</option>
                  <option value="afternoon_snack">Afternoon snack</option>
                  <option value="dinner">Dinner</option>
                  <option value="evening_snack">Evening snack</option>
                </select>
              </label>
              <label>
                Date
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </label>
              <label>
                Time
                <input
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                />
              </label>
            </div>
            <p className="muted">
              Nothing is logged until you confirm. Portion estimates can be
              wrong, especially for mixed dishes, sauces, and hidden
              ingredients.
            </p>
            <button
              className="button"
              type="button"
              disabled={!readyToLog || busy !== null}
              onClick={logMeal}
            >
              {busy === "log" ? (
                <>
                  <LoaderCircle className="spin" aria-hidden="true" size={17} />
                  Logging meal…
                </>
              ) : (
                <>
                  <Check aria-hidden="true" size={17} />
                  Confirm and log meal
                </>
              )}
            </button>
          </section>
        </section>
      )}
    </>
  );
}
