import { useState, useContext, useEffect } from "react";
import { useTranscribe } from "@renderer/hooks";
import {
  AISettingsProviderContext,
  AppSettingsProviderContext,
  DbProviderContext,
} from "@renderer/context";
import { toast } from "@renderer/components/ui";
import { TimelineEntry } from "echogarden/dist/utilities/Timeline.d.js";
import { MAGIC_TOKEN_REGEX, END_OF_SENTENCE_REGEX } from "@/constants";

export const useTranscriptions = (media: AudioType | VideoType) => {
  const { whisperConfig } = useContext(AISettingsProviderContext);
  const { EnjoyApp, webApi } = useContext(AppSettingsProviderContext);
  const { addDblistener, removeDbListener } = useContext(DbProviderContext);
  const [transcription, setTranscription] = useState<TranscriptionType>(null);
  const { transcribe } = useTranscribe();
  const [transcribingProgress, setTranscribingProgress] = useState<number>(0);
  const [transcribing, setTranscribing] = useState<boolean>(false);

  const onTransactionUpdate = (event: CustomEvent) => {
    const { model, action, record } = event.detail || {};
    if (
      model === "Transcription" &&
      record.id === transcription.id &&
      action === "update"
    ) {
      setTranscription(record);
    }
  };
  const findOrCreateTranscription = async () => {
    if (!media) return;
    if (transcription) return;

    return EnjoyApp.transcriptions
      .findOrCreate({
        targetId: media.id,
        targetType: media.mediaType,
      })
      .then((t) => {
        if (t.result && !t.result["transcript"]) {
          t.result = null;
        }
        setTranscription(t);
      })
      .catch((err) => {
        toast.error(err.message);
      });
  };

  const generateTranscription = async () => {
    if (transcribing) return;
    if (!transcription) {
      await findOrCreateTranscription();
    }

    setTranscribing(true);
    setTranscribingProgress(0);
    try {
      const { engine, model, alignmentResult } = await transcribe(media.src, {
        targetId: media.id,
        targetType: media.mediaType,
      });

      let timeline: TimelineEntry[] = [];
      if (alignmentResult) {
        alignmentResult.timeline.forEach((t) => {
          if (t.type === "sentence") {
            timeline.push(t);
          } else {
            t.timeline.forEach((st) => {
              timeline.push(st);
            });
          }
        });
      }

      /*
       * Pre-process
       * Some words end with period should not be a single sentence, like Mr./Ms./Dr. etc
       */
      timeline.forEach((sentence, i) => {
        const nextSentence = timeline[i + 1];
        if (
          !sentence.text
            .replaceAll(MAGIC_TOKEN_REGEX, "")
            .match(END_OF_SENTENCE_REGEX) &&
          nextSentence?.text
        ) {
          console.log(sentence.text);
          nextSentence.text = [sentence.text, nextSentence.text].join(" ");
          nextSentence.timeline = [
            ...sentence.timeline,
            ...nextSentence.timeline,
          ];
          nextSentence.startTime = sentence.startTime;
          timeline.splice(i, 1);
        }
      });

      await EnjoyApp.transcriptions.update(transcription.id, {
        state: "finished",
        result: {
          timeline: timeline,
          transcript: alignmentResult.transcript,
        },
        engine,
        model,
      });
    } catch (err) {
      toast.error(err.message);
    }

    setTranscribing(false);
  };

  const findTranscriptionFromWebApi = async () => {
    if (!transcription) {
      await findOrCreateTranscription();
    }

    const res = await webApi.transcriptions({
      targetMd5: media.md5,
    });

    const transcript = (res?.transcriptions || []).filter((t) =>
      ["base", "small", "medium", "large", "whisper-1"].includes(t.model)
    )?.[0];

    if (!transcript) {
      return Promise.reject("Transcription not found");
    }

    if (!transcript.result["transcript"]) {
      return Promise.reject("Transcription not aligned");
    }

    return EnjoyApp.transcriptions.update(transcription.id, {
      state: "finished",
      result: transcript.result,
      engine: transcript.engine,
      model: transcript.model,
    });
  };

  const findOrGenerateTranscription = async () => {
    try {
      await findTranscriptionFromWebApi();
    } catch (err) {
      console.error(err);
      await generateTranscription();
    }
  };

  useEffect(() => {
    if (!media) return;

    findOrCreateTranscription();
  }, [media]);

  useEffect(() => {
    if (!transcription) return;

    addDblistener(onTransactionUpdate);

    if (
      transcription.state == "pending" ||
      !transcription.result?.["transcript"]
    ) {
      findOrGenerateTranscription();
    }

    if (whisperConfig.service === "local") {
      EnjoyApp.whisper.onProgress((_, p: number) => {
        if (p > 100) p = 100;
        setTranscribingProgress(p);
      });
    }

    return () => {
      removeDbListener(onTransactionUpdate);
      EnjoyApp.whisper.removeProgressListeners();
    };
  }, [transcription, media]);

  return {
    transcription,
    transcribingProgress,
    transcribing,
    generateTranscription,
  };
};
