import { useEffect, useState, useContext, useRef } from "react";
import { AppSettingsProviderContext } from "@renderer/context";
import { Button } from "@renderer/components/ui";
import {
  MediaPlayer,
  MediaProvider,
  type MediaPlayerInstance,
} from "@vidstack/react";
import {
  DefaultAudioLayout,
  defaultLayoutIcons,
} from "@vidstack/react/player/layouts/default";
import { STORAGE_WORKER_ENDPOINTS } from "@/constants";
import { TimelineEntry } from "echogarden/dist/utilities/Timeline.d.js";
import { t } from "i18next";
import { XCircleIcon } from "lucide-react";
import { WavesurferPlayer } from "../misc";
import { v4 as uuidv4 } from "uuid";

export const PostAudio = (props: {
  audio: Partial<MediumType>;
  height?: number;
}) => {
  const { audio, height = 80 } = props;
  const [currentTime, setCurrentTime] = useState<number>(0);
  const { webApi } = useContext(AppSettingsProviderContext);
  const [transcription, setTranscription] = useState<TranscriptionType>();
  const [error, setError] = useState<string>(null);
  const [uuid, setUuid] = useState<string>();

  const currentTranscription = transcription?.result["transcript"]
    ? (transcription.result?.timeline || []).find(
        (s: TimelineEntry) =>
          currentTime >= s.startTime && currentTime <= s.endTime
      )
    : (transcription?.result || []).find(
        (s: TranscriptionResultSegmentType) =>
          currentTime >= s.offsets.from / 1000.0 &&
          currentTime <= s.offsets.to / 1000.0
      );

  const mediaPlayer = useRef<MediaPlayerInstance>(null);
  useEffect(() => {
    webApi
      .transcriptions({
        targetMd5: audio.md5,
      })
      .then((response) => {
        const transcription = response?.transcriptions?.[0];
        if (transcription.targetMd5 !== audio.md5) return;
        setTranscription(response?.transcriptions?.[0]);
      });

    setUuid(uuidv4());
  }, [audio.md5]);

  useEffect(() => {
    if (!mediaPlayer.current) return;

    const onOtherPlayerPlay = (event: CustomEvent) => {
      if (event.detail.uuid !== uuid) {
        mediaPlayer.current!.pause();
      }
    };

    document.addEventListener("play", onOtherPlayerPlay);

    return () => {
      document.removeEventListener("play", onOtherPlayerPlay);
    };
  }, [uuid, mediaPlayer.current]);

  if (error) {
    return (
      <div className="w-full rounded-lg p-4 border">
        <div className="flex items-center justify-center mb-2">
          <XCircleIcon className="w-4 h-4 text-destructive" />
        </div>
        <div className="select-text break-all text-center text-sm text-muted-foreground mb-4">
          {error}
        </div>
        <div className="flex items-center justify-center">
          <Button onClick={() => setError(null)}>{t("retry")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {audio.sourceUrl.match(
        new RegExp("^(" + STORAGE_WORKER_ENDPOINTS.join("|") + ")")
      ) ? (
        <WavesurferPlayer
          currentTime={currentTime}
          setCurrentTime={setCurrentTime}
          id={audio.id}
          src={audio.sourceUrl}
          height={height}
          onError={(err) => setError(err.message)}
        />
      ) : (
        <MediaPlayer
          ref={mediaPlayer}
          onTimeUpdate={({ currentTime: _currentTime }) => {
            setCurrentTime(_currentTime);
          }}
          src={audio.sourceUrl}
          onError={(err) => setError(err.message)}
          onPlay={() => {
            const event = new CustomEvent("play", {
              detail: { uuid },
            });
            document.dispatchEvent(event);
          }}
        >
          <MediaProvider />
          <DefaultAudioLayout icons={defaultLayoutIcons} />
        </MediaPlayer>
      )}

      {currentTranscription && (
        <div className="mt-2 bg-muted px-4 py-2 rounded">
          <div className="text-muted-foreground text-center font-serif">
            {currentTranscription.text}
          </div>
        </div>
      )}

      {audio.coverUrl && (
        <div className="mt-2">
          <img src={audio.coverUrl} className="w-full rounded" />
        </div>
      )}
    </div>
  );
};
