import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  FaCheckCircle,
  FaClipboardList,
  FaCloudUploadAlt,
  FaFilePdf,
  FaTrash,
  FaVideo,
} from "react-icons/fa";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { normalizePhase } from "../lib/workflow";
import { MAX_VIDEO_MINUTES, validateVideoFile } from "../lib/uploads";
import RichTextContent from "../components/RichTextContent";

function nextPhaseStatus(status) {
  const phase = normalizePhase(status);
  if (phase === "awaiting_upload") return "Awaiting Upload";
  if (phase === "ready_for_review") return "Ready For Coach Review";
  return "Reviewed";
}

function allowedTypes(submission) {
  const raw = submission?.allowedUploadTypes?.length
    ? submission.allowedUploadTypes
    : submission?.requiredUploadTypes?.length
      ? submission.requiredUploadTypes
      : ["video"];
  return [...new Set(raw.map((x) => String(x).toLowerCase()).filter((x) => ["video", "pdf"].includes(x)))];
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

export default function SubmissionDetail() {
  const { id } = useParams();
  const location = useLocation();
  const requestedPhase = useMemo(() => new URLSearchParams(location.search).get("phase") || "", [location.search]);
  const { token } = useAuth();
  const { push } = useToast();

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");
  const [videoDurationSeconds, setVideoDurationSeconds] = useState(0);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setError("");
    try {
      const result = await api.get(`/videos/submissions/${id}`, token);
      if (!result?.submission) throw new Error("Submission not found.");
      const livePhase = normalizePhase(requestedPhase || result.submission.phase || result.submission.status);
      setData({ ...result, submission: { ...result.submission, phase: livePhase, status: result.submission.status || livePhase } });
    } catch (err) {
      setError(err.message || "Submission could not be loaded.");
      setData(null);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token, requestedPhase]);

  const chooseVideo = async (file) => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    if (!file) {
      setSelectedVideo(null);
      setVideoPreviewUrl("");
      setVideoDurationSeconds(0);
      return;
    }

    try {
      const durationSeconds = await validateVideoFile(file);
      setSelectedVideo(file);
      setVideoDurationSeconds(durationSeconds);
      setVideoPreviewUrl(URL.createObjectURL(file));
      push("Video selected and passed the 15-minute limit.", "success");
    } catch (err) {
      setSelectedVideo(null);
      setVideoPreviewUrl("");
      setVideoDurationSeconds(0);
      push(err.message || "Please choose a different video.", "error");
    }
  };

  const choosePdf = (file) => {
    if (!file) {
      setSelectedPdf(null);
      return;
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setSelectedPdf(null);
      return push("Choose a PDF file.", "error");
    }

    if (file.size > 10 * 1024 * 1024) {
      setSelectedPdf(null);
      return push("PDF must be 10MB or smaller.", "error");
    }

    setSelectedPdf(file);
    push("PDF selected.", "success");
  };

  const uploadVideo = async () => {
    if (!selectedVideo) return push("Choose a video file first.", "error");

    setBusy(true);
    try {
      const result = await api.post(`/videos/submissions/${id}/upload-url`, {}, token);
      if (result.provider !== "cloudflare" || !result.uploadUrl) throw new Error("Video uploads are temporarily unavailable.");

      const formData = new FormData();
      formData.append("file", selectedVideo);
      const uploadResponse = await fetch(result.uploadUrl, { method: "POST", body: formData });
      if (!uploadResponse.ok) throw new Error("Video upload failed. Please try again.");

      const row = await api.put(
        `/videos/submissions/${id}/video`,
        { assetId: result.uploadId, playbackId: result.uploadId, durationSeconds: videoDurationSeconds },
        token
      );

      setData((d) => ({ ...d, submission: { ...row, phase: normalizePhase(row.status) } }));
      push(row.status === "ready_for_review" ? "Video uploaded and submission is ready for coach review." : "Video uploaded. Add the remaining required file.", "success");
      setSelectedVideo(null);
      setVideoDurationSeconds(0);
    } catch (err) {
      push(err.message || "Video could not be uploaded.", "error");
    } finally {
      setBusy(false);
    }
  };

  const uploadPdf = async () => {
    if (!selectedPdf) return push("Choose a PDF file first.", "error");

    setBusy(true);
    try {
      const dataUrl = await fileToDataUrl(selectedPdf);
      const row = await api.put(
        `/videos/submissions/${id}/document`,
        {
          file: {
            name: selectedPdf.name,
            mimeType: "application/pdf",
            sizeBytes: selectedPdf.size,
            dataUrl,
          },
        },
        token
      );

      setData((d) => ({ ...d, submission: { ...row, phase: normalizePhase(row.status) } }));
      setSelectedPdf(null);
      push(row.status === "ready_for_review" ? "PDF uploaded and submission is ready for coach review." : "PDF uploaded. Add the remaining required file.", "success");
    } catch (err) {
      push(err.message || "PDF could not be uploaded.", "error");
    } finally {
      setBusy(false);
    }
  };

  const deletePdf = async (documentId) => {
    setBusy(true);
    try {
      const row = await api.delete(`/videos/submissions/${id}/document/${documentId}`, token);
      setData((d) => ({ ...d, submission: { ...row, phase: normalizePhase(row.status) } }));
      push("PDF removed.", "success");
    } catch (err) {
      push(err.message || "PDF could not be removed.", "error");
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <div className="text-[#5f746c]">{error || "Loading training submission..."}</div>;

  const { submission, review } = data;
  const phase = normalizePhase(requestedPhase || submission.phase || submission.status);
  const videoSrc = submission.videoUrl || (submission.playbackId ? `https://iframe.videodelivery.net/${submission.playbackId}` : "");
  const types = allowedTypes(submission);

  return (
    <div className="space-y-6">
      {error && <div className="rounded-2xl border border-[#ffd166]/50 bg-[#fff1c7]/75 p-4 text-sm font-bold text-[#5f746c]">{error}</div>}
      <WorkflowStepper phase={phase} />

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <Link to="/dashboard/submissions" className="text-sm font-black text-[#087f73] hover:underline">← Back to Training + Reviews</Link>
          <div className="mt-3 inline-flex rounded-full bg-[#fff1c7] px-3 py-1 text-xs font-black text-[#5f746c]">
            Required upload: {types.includes("video") && types.includes("pdf") ? "Video + PDF" : types.includes("pdf") ? "PDF" : "Video"}
          </div>
          <h1 className="mt-3 text-3xl font-black text-[#12372a]">{submission.title}</h1>
          <p className="mt-1 text-[#5f746c]">{submission.packageId?.title || "Custom coaching quote"} with {submission.coachId?.displayName || "Coach"}</p>
        </div>
        <span className="rounded-full bg-[#c6ff4a] px-4 py-2 text-sm font-black text-[#12372a]">{nextPhaseStatus(phase)}</span>
      </div>

      {phase === "awaiting_upload" && (
        <AwaitingUploadPage
          submission={submission}
          selectedVideo={selectedVideo}
          videoPreviewUrl={videoPreviewUrl}
          videoDurationSeconds={videoDurationSeconds}
          selectedPdf={selectedPdf}
          busy={busy}
          chooseVideo={chooseVideo}
          choosePdf={choosePdf}
          uploadVideo={uploadVideo}
          uploadPdf={uploadPdf}
          deletePdf={deletePdf}
        />
      )}

      {phase === "ready_for_review" && <ReadyForReviewPage submission={submission} videoSrc={videoSrc} deletePdf={deletePdf} busy={busy} />}
      {phase === "reviewed" && <ReviewedPage submission={submission} review={review} videoSrc={videoSrc} />}
    </div>
  );
}

function WorkflowStepper({ phase }) {
  const steps = [
    { key: "awaiting_upload", label: "1. Awaiting Upload", icon: <FaCloudUploadAlt /> },
    { key: "ready_for_review", label: "2. Ready For Review", icon: <FaClipboardList /> },
    { key: "reviewed", label: "3. Reviewed", icon: <FaCheckCircle /> },
  ];
  const index = steps.findIndex((s) => s.key === phase);

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {steps.map((step, i) => (
        <div key={step.key} className={`rounded-3xl border p-4 shadow-sm ${i === index ? "border-[#00a896]/25 bg-[#d9f7fb]/75" : i < index ? "border-[#c6ff4a]/40 bg-[#fff1c7]/65" : "border-[#12372a]/10 bg-white/65"}`}>
          <div className="mb-2 text-2xl text-[#00a896]">{step.icon}</div>
          <div className="font-black text-[#12372a]">{step.label}</div>
          <div className="mt-1 text-xs leading-5 text-[#5f746c]">
            {step.key === "awaiting_upload" && "Player uploads the required video and/or PDF."}
            {step.key === "ready_for_review" && "Coach watches/reads and writes feedback."}
            {step.key === "reviewed" && "Player views completed feedback and drills."}
          </div>
        </div>
      ))}
    </div>
  );
}

function AwaitingUploadPage({ submission, selectedVideo, videoPreviewUrl, videoDurationSeconds, selectedPdf, busy, chooseVideo, choosePdf, uploadVideo, uploadPdf, deletePdf }) {
  const types = allowedTypes(submission);
  const needsVideo = types.includes("video");
  const needsPdf = types.includes("pdf");
  const hasPdf = Array.isArray(submission.documents) && submission.documents.length > 0;

  return (
    <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-[2rem] border border-[#12372a]/10 bg-white/82 p-6 shadow-sm">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#d9f7fb] text-3xl text-[#00a896]"><FaCloudUploadAlt /></div>
        <h2 className="mt-5 text-2xl font-black text-[#12372a]">Upload required files before coach review</h2>
        <div className="mt-3 leading-7 text-[#5f746c]">
          <RichTextContent
            value={submission.uploadInstructions}
            empty="Upload the file type required by your personalized quote. The coach can begin once every required item is submitted."
          />
        </div>

        {needsVideo && (
          <div className="mt-6 rounded-2xl border border-dashed border-[#00a896]/30 bg-[#d9f7fb]/60 p-5">
            <h3 className="font-black text-[#12372a]"><FaVideo className="mr-2 inline" />Upload your video file</h3>
            <p className="mt-1 text-sm font-bold leading-6 text-[#12372a]">Choose a video from your device. Videos must be {MAX_VIDEO_MINUTES} minutes or shorter.</p>
            <input type="file" accept="video/*" onChange={(e) => chooseVideo(e.target.files?.[0])} className="mt-5 w-full rounded-xl border border-[#12372a]/10 bg-white p-3 text-sm text-[#12372a] file:mr-4 file:rounded-full file:border-0 file:bg-[#c6ff4a] file:px-4 file:py-2 file:font-black file:text-[#12372a]" />
            {selectedVideo && <div className="mt-4 rounded-2xl border border-[#087f73]/20 bg-white p-4 text-sm font-bold text-[#12372a]">Selected: {selectedVideo.name} • {(videoDurationSeconds / 60).toFixed(1)} minutes</div>}
            {videoPreviewUrl && <video src={videoPreviewUrl} controls className="mt-4 aspect-video w-full rounded-2xl bg-black" />}
            <button onClick={uploadVideo} disabled={busy || !selectedVideo} className="pp-btn-primary mt-5 px-5 py-3 disabled:opacity-60"><FaCloudUploadAlt className="mr-2" /> {busy ? "Uploading..." : "Upload Video"}</button>
          </div>
        )}

        {needsPdf && (
          <div className="mt-6 rounded-2xl border border-dashed border-[#b94024]/25 bg-[#fff8e7] p-5">
            <h3 className="font-black text-[#12372a]"><FaFilePdf className="mr-2 inline text-[#b94024]" />Upload your PDF/document</h3>
            <p className="mt-1 text-sm font-bold leading-6 text-[#12372a]">PDFs must be 10MB or smaller.</p>
            <input type="file" accept="application/pdf,.pdf" onChange={(e) => choosePdf(e.target.files?.[0])} className="mt-5 w-full rounded-xl border border-[#12372a]/10 bg-white p-3 text-sm text-[#12372a] file:mr-4 file:rounded-full file:border-0 file:bg-[#c6ff4a] file:px-4 file:py-2 file:font-black file:text-[#12372a]" />
            {selectedPdf && <div className="mt-4 rounded-2xl border border-[#087f73]/20 bg-white p-4 text-sm font-bold text-[#12372a]">Selected: {selectedPdf.name}</div>}
            <button onClick={uploadPdf} disabled={busy || !selectedPdf} className="pp-btn-primary mt-5 px-5 py-3 disabled:opacity-60"><FaCloudUploadAlt className="mr-2" /> {busy ? "Uploading..." : "Upload PDF"}</button>
            {hasPdf && <DocumentList documents={submission.documents} canDelete deletePdf={deletePdf} busy={busy} />}
          </div>
        )}
      </section>

      <section className="rounded-[2rem] border border-[#12372a]/10 bg-white/82 p-6 shadow-sm">
        <h2 className="text-2xl font-black text-[#12372a]">What you need to submit</h2>
        <div className="mt-5 grid gap-3">
          {needsVideo && <ChecklistItem>Upload pickleball match/drill video footage.</ChecklistItem>}
          {needsPdf && <ChecklistItem>Upload the requested PDF/document notes or plan.</ChecklistItem>}
          <ChecklistItem>Make sure uploads match what the coach quoted.</ChecklistItem>
          <ChecklistItem>Once all required files are uploaded, the coach can start the review.</ChecklistItem>
        </div>
        <div className="mt-5 rounded-2xl bg-[#fff1c7]/70 p-4 text-sm leading-6 text-[#5f746c]">
          <b className="text-[#12372a]">Coaching goal:</b>
          <RichTextContent value={submission.goals || submission.description} className="mt-1" />
        </div>
      </section>
    </div>
  );
}

function ReadyForReviewPage({ submission, videoSrc, deletePdf, busy }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[2rem] border border-[#12372a]/10 bg-white/82 p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-black text-[#12372a]"><FaVideo className="text-[#00a896]" /> Ready for coach review</h2>
        {videoSrc ? <VideoViewer videoSrc={videoSrc} /> : <div className="rounded-2xl border border-dashed border-[#00a896]/30 bg-[#d9f7fb]/45 p-8 text-center text-[#5f746c]"><FaFilePdf className="mx-auto mb-4 text-4xl text-[#b94024]" />No video required for this request.</div>}
        {Array.isArray(submission.documents) && submission.documents.length > 0 && <DocumentList documents={submission.documents} canDelete deletePdf={deletePdf} busy={busy} />}
        <div className="mt-5 rounded-2xl bg-[#fff1c7]/70 p-4 text-sm leading-6 text-[#5f746c]">
          <b className="text-[#12372a]">Player goal:</b>
          <RichTextContent value={submission.goals || submission.description} className="mt-1" />
        </div>
      </section>

      <section className="rounded-[2rem] border border-[#12372a]/10 bg-white/82 p-6 shadow-sm">
        <h2 className="text-2xl font-black text-[#12372a]">Coach review checklist</h2>
        <div className="mt-5 grid gap-3">
          <ChecklistItem>Review the uploaded video and/or PDF.</ChecklistItem>
          <ChecklistItem>Create feedback, timestamp notes, and next-step drills.</ChecklistItem>
          <ChecklistItem>Mark the review complete when feedback is ready.</ChecklistItem>
        </div>
      </section>
    </div>
  );
}

function ReviewedPage({ submission, review, videoSrc }) {
  return (
    <div className="rounded-[2rem] border border-[#12372a]/10 bg-white/82 p-6 shadow-sm">
      <h2 className="text-2xl font-black text-[#12372a]">Completed review</h2>
      {videoSrc && <div className="mt-5"><VideoViewer videoSrc={videoSrc} /></div>}
      {Array.isArray(submission.documents) && submission.documents.length > 0 && <DocumentList documents={submission.documents} />}
      <div className="mt-5 rounded-2xl bg-[#eaf9f7] p-5 text-[#40584f]">
        {review ? <RichTextContent value={review.summary || review.notes} empty="Review completed." /> : "Your coach has completed this review."}
      </div>
    </div>
  );
}

function DocumentList({ documents = [], canDelete = false, deletePdf, busy }) {
  if (!documents.length) return null;

  return (
    <div className="mt-4 rounded-2xl bg-white p-4">
      <h4 className="font-black text-[#12372a]">Uploaded PDF documents</h4>
      <div className="mt-3 grid gap-2">
        {documents.map((doc) => (
          <div key={doc._id || doc.name} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#fff8e7] p-3 text-sm font-bold text-[#40584f]">
            <span><FaFilePdf className="mr-2 inline text-[#b94024]" />{doc.name}</span>
            <div className="flex gap-2">
              {doc.dataUrl && <a href={doc.dataUrl} download={doc.name} className="rounded-full bg-[#eaf9f7] px-3 py-1 text-xs font-black text-[#087f73]">Download</a>}
              {canDelete && <button onClick={() => deletePdf(doc._id)} disabled={busy} className="rounded-full bg-[#ffebe5] px-3 py-1 text-xs font-black text-[#7a2b18]"><FaTrash className="mr-1 inline" />Remove</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChecklistItem({ children }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-[#fff8e7] p-4 text-sm leading-6 text-[#5f746c]">
      <FaCheckCircle className="mt-1 shrink-0 text-[#00a896]" />
      <span>{children}</span>
    </div>
  );
}

function VideoViewer({ videoSrc }) {
  if (videoSrc.includes("iframe.videodelivery.net")) {
    return <iframe src={videoSrc} title="Uploaded video" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" allowFullScreen className="aspect-video w-full rounded-2xl bg-black" />;
  }

  return <video src={videoSrc} controls className="aspect-video w-full rounded-2xl bg-black" />;
}
