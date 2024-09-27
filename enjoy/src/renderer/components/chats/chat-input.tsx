import {
  ArrowUpIcon,
  CheckIcon,
  LoaderIcon,
  MicIcon,
  PauseIcon,
  PlayIcon,
  StepForwardIcon,
  TypeIcon,
  WandIcon,
  XIcon,
} from "lucide-react";
import {
  Button,
  Popover,
  PopoverArrow,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  Separator,
  Textarea,
  toast,
} from "@renderer/components/ui";
import { ReactElement, useContext, useEffect, useRef, useState } from "react";
import { LiveAudioVisualizer } from "react-audio-visualize";
import {
  AppSettingsProviderContext,
  ChatProviderContext,
  ChatSessionProviderContext,
  HotKeysSettingsProviderContext,
} from "@renderer/context";
import { t } from "i18next";
import autosize from "autosize";
import { LoaderSpin } from "@renderer/components";
import { useAiCommand } from "@renderer/hooks";
import { formatDateTime } from "@renderer/lib/utils";
import { md5 } from "js-md5";
import { useHotkeys } from "react-hotkeys-hook";

export const ChatInput = () => {
  const { currentChat } = useContext(ChatProviderContext);
  const {
    submitting,
    startRecording,
    stopRecording,
    cancelRecording,
    togglePauseResume,
    isRecording,
    mediaRecorder,
    recordingTime,
    isPaused,
    askAgent,
    onCreateMessage,
    shadowing,
  } = useContext(ChatSessionProviderContext);
  const { EnjoyApp } = useContext(AppSettingsProviderContext);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const [inputMode, setInputMode] = useState<"text" | "audio">("text");
  const [content, setContent] = useState("");
  const { currentHotkeys } = useContext(HotKeysSettingsProviderContext);

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

  useEffect(() => {
    EnjoyApp.cacheObjects
      .get(`chat-input-mode-${currentChat.id}`)
      .then((cachedInputMode) => {
        if (cachedInputMode) {
          setInputMode(cachedInputMode as typeof inputMode);
        }
      });
  }, []);

  useEffect(() => {
    EnjoyApp.cacheObjects.set(`chat-input-mode-${currentChat.id}`, inputMode);
  }, [inputMode]);

  useHotkeys(
    currentHotkeys.StartOrStopRecording,
    () => {
      if (shadowing) return;
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    },
    {
      preventDefault: true,
    }
  );

  useHotkeys(
    currentHotkeys.PlayNextSegment,
    () => {
      if (shadowing) return;
      askAgent();
    },
    {
      preventDefault: true,
    }
  );

  if (isRecording) {
    return (
      <div className="z-10 w-full flex justify-center">
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
            data-tooltip-id="chat-tooltip"
            data-tooltip-content={t("cancel")}
            onClick={cancelRecording}
            className="rounded-full shadow w-8 h-8 bg-red-500 hover:bg-red-600"
            variant="secondary"
            size="icon"
          >
            <XIcon fill="white" className="w-4 h-4 text-white" />
          </Button>
          <Button
            onClick={togglePauseResume}
            className="rounded-full shadow w-8 h-8"
            size="icon"
          >
            {isPaused ? (
              <PlayIcon
                data-tooltip-id="chat-tooltip"
                data-tooltip-content={t("continue")}
                fill="white"
                className="w-4 h-4"
              />
            ) : (
              <PauseIcon
                data-tooltip-id="chat-tooltip"
                data-tooltip-content={t("pause")}
                fill="white"
                className="w-4 h-4"
              />
            )}
          </Button>
          <Button
            data-tooltip-id="chat-tooltip"
            data-tooltip-content={t("finish")}
            onClick={stopRecording}
            className="rounded-full bg-green-500 hover:bg-green-600 shadow w-8 h-8"
            size="icon"
          >
            <CheckIcon className="w-4 h-4 text-white" />
          </Button>
        </div>
      </div>
    );
  }

  if (inputMode === "text") {
    return (
      <div className="z-10 w-full flex items-end gap-2 px-2 py-2 bg-muted mx-4 rounded-3xl shadow-lg">
        <Button
          data-tooltip-id="chat-tooltip"
          data-tooltip-content={t("audioInput")}
          disabled={submitting}
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
          className="flex-1 h-8 text-muted-foreground rounded-lg text-sm leading-7 px-0 py-1 shadow-none focus-visible:outline-0 focus-visible:ring-0 border-none min-h-[2.25rem] max-h-[70vh] scrollbar-thin !overflow-x-hidden"
        />
        <Button
          ref={submitRef}
          data-tooltip-id="chat-tooltip"
          data-tooltip-content={t("send")}
          onClick={() =>
            onCreateMessage(content, { onSuccess: () => setContent("") })
          }
          disabled={submitting || !content}
          className="rounded-full shadow w-8 h-8"
          variant="default"
          size="icon"
        >
          {submitting ? (
            <LoaderIcon className="w-6 h-6 animate-spin" />
          ) : (
            <ArrowUpIcon className="w-6 h-6" />
          )}
        </Button>
        {currentChat.config.enableChatAssistant && (
          <ChatSuggestionButton asChild>
            <Button
              data-tooltip-id="chat-tooltip"
              data-tooltip-content={t("suggestion")}
              className="rounded-full w-8 h-8"
              variant="ghost"
              size="icon"
            >
              <WandIcon className="w-6 h-6" />
            </Button>
          </ChatSuggestionButton>
        )}

        {currentChat.type === "group" && (
          <Button
            data-tooltip-id="chat-tooltip"
            data-tooltip-content={t("continue")}
            disabled={submitting}
            onClick={() => askAgent()}
            className=""
            variant="ghost"
            size="icon"
          >
            <StepForwardIcon className="w-6 h-6" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full flex items-center gap-4 justify-center relative">
      <Button
        data-tooltip-id="chat-tooltip"
        data-tooltip-content={t("textInput")}
        disabled={submitting}
        onClick={() => setInputMode("text")}
        className="rounded-full shadow-lg w-8 h-8"
        variant="secondary"
        size="icon"
      >
        <TypeIcon className="w-4 h-4" />
      </Button>
      <Button
        data-tooltip-id="chat-tooltip"
        data-tooltip-content={t("record")}
        disabled={submitting}
        onClick={startRecording}
        className="rounded-full shadow-lg w-10 h-10"
        size="icon"
      >
        {submitting ? (
          <LoaderIcon className="w-6 h-6 animate-spin" />
        ) : (
          <MicIcon className="w-6 h-6" />
        )}
      </Button>
      {currentChat.config.enableChatAssistant && <ChatSuggestionButton />}
      <Button
        data-tooltip-id="chat-tooltip"
        data-tooltip-content={t("continue")}
        disabled={submitting}
        onClick={() => askAgent()}
        className="rounded-full shadow-lg w-8 h-8"
        variant="default"
        size="icon"
      >
        <StepForwardIcon className="w-4 h-4" />
      </Button>
    </div>
  );
};

const ChatSuggestionButton = (props: {
  asChild?: boolean;
  children?: ReactElement;
}) => {
  const { currentChat } = useContext(ChatProviderContext);
  const { chatMessages, onCreateMessage } = useContext(
    ChatSessionProviderContext
  );
  const [suggestions, setSuggestions] = useState<
    { text: string; explaination: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { EnjoyApp } = useContext(AppSettingsProviderContext);

  const { chatSuggestion } = useAiCommand();

  const context = `I'm ${
    currentChat.members.find((member) => member.user)?.user?.name
  }.

  [Chat Members]
  ${currentChat.members.map((m) => {
    if (m.user) {
      return `- ${m.user.name} (${m.config.introduction})[It's me]`;
    } else if (m.agent) {
      return `- ${m.agent.name} (${m.agent.introduction})`;
    }
  })}

  [Chat History]
  ${chatMessages
    .filter((m) => m.state === "completed")
    .map(
      (message) =>
        `- ${(message.member.user || message.member.agent).name}: ${
          message.content
        }(${formatDateTime(message.createdAt)})`
    )
    .join("\n")}
  `;

  const contextCacheKey = `chat-suggestion-${md5(
    chatMessages
      .filter((m) => m.state === "completed")
      .map((m) => m.content)
      .join("\n")
  )}`;

  const suggest = async () => {
    setLoading(true);
    chatSuggestion(context, {
      cacheKey: contextCacheKey,
    })
      .then((res) => setSuggestions(res.suggestions))
      .catch((err) => {
        toast.error(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (open && !suggestions?.length) {
      suggest();
    }
  }, [open]);

  useEffect(() => {
    EnjoyApp.cacheObjects.get(contextCacheKey).then((result) => {
      if (result && result?.suggestions) {
        setSuggestions(result.suggestions as typeof suggestions);
      } else {
        setSuggestions([]);
      }
    });
  }, [contextCacheKey]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {props.asChild ? (
          { ...props.children }
        ) : (
          <Button
            data-tooltip-id="chat-tooltip"
            data-tooltip-content={t("suggestion")}
            className="rounded-full shadow-lg w-8 h-8"
            variant="secondary"
            size="icon"
          >
            <WandIcon className="w-4 h-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent side="top" className="bg-muted w-full max-w-screen-md">
        {loading || suggestions.length === 0 ? (
          <LoaderSpin />
        ) : (
          <ScrollArea className="h-72 px-3">
            <div className="select-text grid gap-6">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="grid gap-4">
                  <div className="text-sm">{suggestion.explaination}</div>
                  <div className="px-4 py-2 rounded bg-background flex items-end justify-between space-x-2">
                    <div className="font-serif">{suggestion.text}</div>
                    <div>
                      <Button
                        data-tooltip-id="global-tooltip"
                        data-tooltip-content={t("send")}
                        variant="default"
                        size="icon"
                        className="rounded-full w-6 h-6"
                        onClick={() =>
                          onCreateMessage(suggestion.text, {
                            onSuccess: () => setOpen(false),
                          })
                        }
                      >
                        <ArrowUpIcon className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <Separator />
                </div>
              ))}
              <div className="flex justify-end">
                <Button
                  disabled={loading}
                  variant="default"
                  size="sm"
                  onClick={() => suggest()}
                >
                  {t("refresh")}
                </Button>
              </div>
            </div>
          </ScrollArea>
        )}
        <PopoverArrow />
      </PopoverContent>
    </Popover>
  );
};
