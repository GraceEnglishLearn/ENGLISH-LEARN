import {
  LoaderIcon,
  MicIcon,
  PauseIcon,
  PlayIcon,
  SendIcon,
  SquareIcon,
  StepForwardIcon,
  TextIcon,
} from "lucide-react";
import { Button, Textarea } from "@renderer/components/ui";
import { useContext, useEffect, useRef, useState } from "react";
import { LiveAudioVisualizer } from "react-audio-visualize";
import { ChatSessionProviderContext } from "@renderer/context";
import { t } from "i18next";
import autosize from "autosize";

export const ChatInput = () => {
  const {
    submitting,
    startRecording,
    stopRecording,
    togglePauseResume,
    isRecording,
    mediaRecorder,
    recordingTime,
    isPaused,
    askAgent,
    onCreateMessage,
  } = useContext(ChatSessionProviderContext);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const [inputMode, setInputMode] = useState<"text" | "audio">("text");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!inputRef.current) return;

    autosize(inputRef.current);

    inputRef.current.addEventListener("keypress", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submitRef.current?.click();
      }
    });

    inputRef.current.focus();

    return () => {
      inputRef.current?.removeEventListener("keypress", () => {});
      autosize.destroy(inputRef.current);
    };
  }, [inputRef.current]);

  if (submitting) {
    return (
      <div className="w-full flex justify-center">
        <LoaderIcon className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="w-full flex justify-center">
        <div className="flex items-center space-x-2">
          <LiveAudioVisualizer
            mediaRecorder={mediaRecorder}
            barWidth={2}
            gap={2}
            width={140}
            height={30}
            fftSize={512}
            maxDecibels={-10}
            minDecibels={-80}
            smoothingTimeConstant={0.4}
          />
          <span className="text-sm text-muted-foreground">
            {Math.floor(recordingTime / 60)}:
            {String(recordingTime % 60).padStart(2, "0")}
          </span>
          <Button
            onClick={togglePauseResume}
            className="rounded-full shadow w-8 h-8"
            size="icon"
          >
            {isPaused ? (
              <PlayIcon fill="white" className="w-4 h-4" />
            ) : (
              <PauseIcon fill="white" className="w-4 h-4" />
            )}
          </Button>
          <Button
            onClick={stopRecording}
            className="rounded-full bg-red-500 hover:bg-red-600 shadow w-8 h-8"
            size="icon"
          >
            <SquareIcon fill="white" className="w-4 h-4 text-white" />
          </Button>
        </div>
      </div>
    );
  }

  if (inputMode === "text") {
    return (
      <div className="w-full flex items-end gap-2 px-2">
        <Button
          onClick={() => setInputMode("audio")}
          variant="ghost"
          className=""
          size="icon"
        >
          <MicIcon className="w-6 h-6" />
        </Button>
        <Textarea
          ref={inputRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={submitting}
          placeholder={t("pressEnterToSend")}
          data-testid="chat-input"
          className="leading-6 bg-muted h-9 text-muted-foreground rounded-lg text-base px-3 py-1 shadow-none focus-visible:outline-0 focus-visible:ring-0 border-none min-h-[2.25rem] max-h-[70vh] scrollbar-thin !overflow-x-hidden"
        />
        <Button
          ref={submitRef}
          onClick={() => onCreateMessage(content)}
          disabled={submitting || !content}
          className=""
          variant="ghost"
          size="icon"
        >
          <SendIcon className="w-6 h-6" />
        </Button>
        <Button className="" variant="ghost" size="icon">
          <StepForwardIcon className="w-6 h-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full flex gap-4 justify-center">
      <Button
        onClick={() => setInputMode("text")}
        className="rounded-full shadow w-10 h-10"
        variant="secondary"
        size="sm"
      >
        <TextIcon className="w-6 h-6" />
      </Button>
      <Button
        onClick={startRecording}
        className="rounded-full shadow w-10 h-10"
        size="icon"
      >
        <MicIcon className="w-6 h-6" />
      </Button>
      <Button
        onClick={() => askAgent()}
        className="rounded-full shadow w-auto h-10"
        variant="secondary"
        size="sm"
      >
        <StepForwardIcon className="w-6 h-6 mr-2" />
        {t("continue")}
      </Button>
    </div>
  );
};
