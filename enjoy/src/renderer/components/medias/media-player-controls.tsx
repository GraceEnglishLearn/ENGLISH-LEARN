import { useEffect, useState, useContext } from "react";
import { type Region as RegionType } from "wavesurfer.js/dist/plugins/regions";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@renderer/components/ui";
import {
  MediaPlayerProviderContext,
  AppSettingsProviderContext,
} from "@renderer/context";
import {
  ScissorsIcon,
  PlayIcon,
  PauseIcon,
  Repeat1Icon,
  RepeatIcon,
  GaugeIcon,
  ListRestartIcon,
  SkipForwardIcon,
  SkipBackIcon,
  SaveIcon,
  UndoIcon,
  TextCursorInputIcon,
} from "lucide-react";
import { t } from "i18next";
import { Tooltip } from "react-tooltip";
import { useHotkeys } from "react-hotkeys-hook";
import cloneDeep from "lodash/cloneDeep";
import debounce from "lodash/debounce";
import { AlignmentResult } from "echogarden/dist/api/API.d.js";

const PLAYBACK_RATE_OPTIONS = [0.75, 0.8, 0.9, 1.0];
export const MediaPlayerControls = () => {
  const {
    decoded,
    wavesurfer,
    currentTime,
    currentSegmentIndex,
    setCurrentSegmentIndex,
    zoomRatio,
    setZoomRatio,
    fitZoomRatio,
    transcription,
    regions,
    activeRegion,
    setActiveRegion,
    editingRegion,
    setEditingRegion,
    transcriptionDraft,
    setTranscriptionDraft,
  } = useContext(MediaPlayerProviderContext);
  const { EnjoyApp } = useContext(AppSettingsProviderContext);
  const [playMode, setPlayMode] = useState<"loop" | "single" | "all">("single");
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isSelectingRegion, setIsSelectingRegion] = useState(false);

  const playOrPause = () => {
    if (!wavesurfer) return;

    if (wavesurfer.isPlaying()) {
      wavesurfer.pause();
    } else {
      wavesurfer.play();
    }
  };
  const debouncedPlayOrPause = debounce(playOrPause, 100);

  const onPrev = () => {
    if (!wavesurfer) return;
    const segment = transcription?.result?.timeline[currentSegmentIndex - 1];
    if (!segment) return;

    setCurrentSegmentIndex(currentSegmentIndex - 1);
  };

  const onNext = () => {
    if (!wavesurfer) return;
    const segment = transcription?.result?.timeline[currentSegmentIndex + 1];
    if (!segment) return;

    setCurrentSegmentIndex(currentSegmentIndex + 1);
  };

  /*
   * Update segmentRegion when currentSegmentIndex is updated
   * or when editingRegion is toggled.
   * It will clear all regions and add a new region for the current segment.
   */
  const updateSegmentRegion = () => {
    if (!wavesurfer) return;
    if (!regions) return;

    // Do not update segmentRegion when editing word region
    if (
      editingRegion &&
      activeRegion &&
      activeRegion.id.startsWith("word-region")
    ) {
      return;
    }

    const currentSegment =
      transcription?.result?.timeline?.[currentSegmentIndex];
    if (!currentSegment) return;

    const id = `segment-region-${currentSegmentIndex}`;
    const from = currentSegment.startTime;
    const to = currentSegment.endTime;
    const span = document.createElement("span");
    span.innerText = `#${currentSegmentIndex + 1} (${(to - from).toFixed(2)}s)`;
    span.style.padding = "1rem";
    span.style.fontSize = "0.9rem";

    regions
      .getRegions()
      .filter((r) => r.id.startsWith("segment-region"))
      .forEach((r) => r.remove());

    const region = regions.addRegion({
      id,
      start: from,
      end: to,
      color: "#fb6f9211",
      drag: false,
      resize: editingRegion,
      content: span,
    });

    /*
     * Remain active wordRegion unchanged if it's still in the segment region.
     * It happens when word region finish editing and the transcription is updated.
     */
    if (
      activeRegion &&
      activeRegion.id.startsWith("word-region") &&
      activeRegion.start >= region.start &&
      activeRegion.end <= region.end
    ) {
      return;
    }

    /*
     * Otherwise remove all word regions.
     * Set the segment region as active
     */
    regions
      .getRegions()
      .filter((r) => r.id.startsWith("word-region"))
      .forEach((r) => r.remove());
    setActiveRegion(region);
    wavesurfer.setScrollTime(region.start);
  };

  // Debounce updateSegmentRegion
  const debouncedUpdateSegmentRegion = debounce(updateSegmentRegion, 100);

  /*
   * Update segmentRegion when currentSegmentIndex is updated
   */
  useEffect(() => {
    if (!regions) return;

    // Exit editing when segment is updated
    setEditingRegion(false);
    debouncedUpdateSegmentRegion();
  }, [currentSegmentIndex, regions, transcription?.result]);

  /*
   * Update region to editable when editingRegion is toggled
   */
  useEffect(() => {
    debouncedUpdateSegmentRegion();
  }, [editingRegion]);

  /*
   * When regions are available,
   * set up event listeners for regions
   * and clean up when component is unmounted
   */
  useEffect(() => {
    if (!regions) return;
    if (!transcription?.result) return;

    let disableSelectingRegion: () => void;
    if (isSelectingRegion) {
      wavesurfer
        .getWrapper()
        .querySelectorAll(".pitch-contour")
        .forEach((el: HTMLDivElement) => {
          el.style.zIndex = "3";
        });
      disableSelectingRegion = regions.enableDragSelection({
        id: `custom-region-${Date.now()}`,
        color: "rgba(76, 201, 240, 0.2)",
        drag: false,
      });
    } else {
      regions
        .getRegions()
        .filter((r) => r.id.startsWith("custom-region"))
        .forEach((r) => r.remove());

      if (!activeRegion || activeRegion?.id.startsWith("custom-region")) {
        setActiveRegion(
          regions.getRegions().find((r) => r.id.startsWith("segment-region"))
        );
      }
    }

    const subscriptions = [
      wavesurfer.on("finish", () => {
        if (playMode !== "loop") return;

        activeRegion?.play();
      }),

      regions.on("region-updated", (region) => {
        const segmentRegion = regions
          .getRegions()
          .find((r) => r.id === `segment-region-${currentSegmentIndex}`);

        // limit the custom region always in the segment region
        if (region.id.startsWith("custom-region")) {
          if (region.start < segmentRegion.start) {
            region.setOptions({ start: segmentRegion.start });
          }
          if (region.end > segmentRegion.end) {
            region.setOptions({ start: region.start, end: segmentRegion.end });
          }
        } else if (region !== segmentRegion) {
          return;
        }

        const draft = cloneDeep(transcription.result);

        draft.timeline[currentSegmentIndex].startTime = region.start;
        draft.timeline[currentSegmentIndex].endTime = region.end;

        // ensure that the previous segment ends before the current segment
        if (
          currentSegmentIndex > 0 &&
          draft.timeline[currentSegmentIndex - 1].endTime > region.start
        ) {
          draft.timeline[currentSegmentIndex - 1].endTime = region.start;
        }

        // ensure that the next segment starts after the current segment
        if (
          currentSegmentIndex < draft.length - 1 &&
          draft.timeline[currentSegmentIndex + 1].startTime < region.end
        ) {
          draft.timeline[currentSegmentIndex + 1].startTime = region.end;
        }

        setTranscriptionDraft(draft);
      }),

      regions.on("region-created", (region: RegionType) => {
        if (region.id.startsWith("custom-region")) {
          disableSelectingRegion?.();
          setActiveRegion(region);
        }
      }),

      regions.on("region-out", (region) => {
        if (playMode === "loop") {
          wavesurfer.pause();
          setTimeout(() => {
            region.play();
          }, 500);
        } else if (playMode === "single") {
          wavesurfer.pause();
        }
      }),
    ];

    return () => {
      disableSelectingRegion?.();
      subscriptions.forEach((unsub) => unsub());
    };
  }, [
    playMode,
    regions,
    transcription,
    currentSegmentIndex,
    isSelectingRegion,
  ]);

  /*
   * Auto select the firt segment when everything is ready
   */
  useEffect(() => {
    if (!transcription?.result) return;
    if (!transcription.result["transcript"]) return;
    if (!decoded) return;
    if (!wavesurfer) return;

    setCurrentSegmentIndex(0);
    const segment = transcription.result.timeline[0];
    wavesurfer.seekTo(
      Math.floor((segment.startTime / wavesurfer.getDuration()) * 1e8) / 1e8
    );
  }, [decoded, transcription?.id, wavesurfer]);

  useEffect(() => {
    if (!wavesurfer) return;

    wavesurfer.setPlaybackRate(playbackRate);
  }, [playbackRate, wavesurfer]);

  /*
   * Update currentSegmentIndex when currentTime is updated
   */
  useEffect(() => {
    if (!transcription?.result) return;
    if (!transcription.result["transcript"]) return;

    const index = (transcription.result as AlignmentResult).timeline.findIndex(
      (t) => currentTime >= t.startTime && currentTime < t.endTime
    );
    if (index === -1) return;
    // Stay on the current segment if playMode is single
    if (["single", "loop"].includes(playMode) && index !== currentSegmentIndex)
      return;

    setCurrentSegmentIndex(index);
  }, [currentTime, transcription?.result]);

  /*
   * Always stay in the active region when playMode is single/loop
   */
  useEffect(() => {
    if (wavesurfer?.isPlaying()) return;
    if (!activeRegion) return;
    if (playMode === "all") return;

    if (currentTime < activeRegion.start || currentTime > activeRegion.end) {
      wavesurfer.setScrollTime(activeRegion.start);
      wavesurfer.seekTo(
        Math.floor((activeRegion.start / wavesurfer.getDuration()) * 1e8) / 1e8
      );
    }
  }, [wavesurfer, playMode, activeRegion, currentTime]);

  useHotkeys(
    ["Space", "p", "n", "r"],
    (keyboardEvent, hotkeyEvent) => {
      if (!wavesurfer) return;
      keyboardEvent.preventDefault();

      switch (hotkeyEvent.keys.join("")) {
        case "space":
          document.getElementById("media-play-or-pause-button").click();
          break;
        case "p":
          document.getElementById("media-play-previous-button").click();
          break;
        case "n":
          document.getElementById("media-play-next-button").click();
          break;
        case "r":
          document.getElementById("media-record-button").click();
          break;
      }
    },
    [wavesurfer]
  );

  useEffect(() => {
    if (!activeRegion) return;
    if (zoomRatio === fitZoomRatio) return;
    if (playMode === "all") return;

    if (
      activeRegion.id.startsWith("word-region") ||
      activeRegion.id.startsWith("segment-region")
    ) {
      setZoomRatio(fitZoomRatio);
    }
  }, [activeRegion, fitZoomRatio]);

  useEffect(() => {
    if (!regions) return;
    if (!activeRegion) return;

    if (activeRegion.id.startsWith("custom-region")) {
      regions
        .getRegions()
        .filter((r) => r.id.startsWith("word-region"))
        .forEach((r) => r.remove());
    } else {
      setIsSelectingRegion(false);
    }
  }, [regions, activeRegion]);

  return (
    <div className="w-full h-20 flex items-center justify-center px-6">
      <div className="flex items-center justify-center space-x-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={`${playbackRate == 1.0 ? "ghost" : "secondary"}`}
              data-tooltip-id="media-player-controls-tooltip"
              data-tooltip-content={t("playbackSpeed")}
              className="relative aspect-square p-0 h-10"
            >
              <GaugeIcon className="w-6 h-6" />
              {playbackRate != 1.0 && (
                <span className="absolute left-[1.25rem] top-6 text-[0.6rem] font-bold text-gray-400">
                  {playbackRate.toFixed(2)}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96">
            <div className="mb-4 text-center">{t("playbackRate")}</div>
            <div className="w-full rounded-full flex items-center justify-between bg-muted">
              {PLAYBACK_RATE_OPTIONS.map((rate, i) => (
                <div
                  key={i}
                  className={`cursor-pointer h-10 w-10 leading-10 rounded-full flex items-center justify-center ${
                    rate === playbackRate
                      ? "bg-primary text-white text-md"
                      : "text-black/70 text-xs"
                  }`}
                  onClick={() => {
                    setPlaybackRate(rate);
                  }}
                >
                  <span className="">{rate}</span>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              data-tooltip-id="media-player-controls-tooltip"
              data-tooltip-content={t("switchPlayMode")}
              className="aspect-square p-0 h-10"
            >
              {playMode === "single" && <RepeatIcon className="w-6 h-6" />}
              {playMode === "loop" && <Repeat1Icon className="w-6 h-6" />}
              {playMode === "all" && <ListRestartIcon className="w-6 h-6" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              className={playMode === "single" ? "bg-muted" : ""}
              onClick={() => setPlayMode("single")}
            >
              <RepeatIcon className="w-4 h-4 mr-2" />
              <span>{t("playSingleSegment")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className={playMode === "loop" ? "bg-muted" : ""}
              onClick={() => setPlayMode("loop")}
            >
              <Repeat1Icon className="w-4 h-4 mr-2" />
              <span>{t("playInLoop")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className={playMode === "all" ? "bg-muted" : ""}
              onClick={() => setPlayMode("all")}
            >
              <ListRestartIcon className="w-4 h-4 mr-2" />
              <span>{t("playAllSegments")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="lg"
          onClick={onPrev}
          id="media-play-previous-button"
          data-tooltip-id="media-player-controls-tooltip"
          data-tooltip-content={t("playPreviousSegment")}
          className="aspect-square p-0 h-10"
        >
          <SkipBackIcon className="w-6 h-6" />
        </Button>

        {wavesurfer?.isPlaying() ? (
          <Button
            variant="default"
            onClick={debouncedPlayOrPause}
            id="media-play-or-pause-button"
            data-tooltip-id="media-player-controls-tooltip"
            data-tooltip-content={t("pause")}
            className="aspect-square p-0 h-12 rounded-full"
          >
            <PauseIcon fill="white" className="w-6 h-6" />
          </Button>
        ) : (
          <Button
            variant="default"
            onClick={debouncedPlayOrPause}
            id="media-play-or-pause-button"
            data-tooltip-id="media-player-controls-tooltip"
            data-tooltip-content={t("play")}
            className="aspect-square p-0 h-12 rounded-full"
          >
            <PlayIcon fill="white" className="w-6 h-6" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="lg"
          onClick={onNext}
          id="media-play-next-button"
          data-tooltip-id="media-player-controls-tooltip"
          data-tooltip-content={t("playNextSegment")}
          className="aspect-square p-0 h-10"
        >
          <SkipForwardIcon className="w-6 h-6" />
        </Button>

        <Button
          variant={isSelectingRegion ? "secondary" : "ghost"}
          size="icon"
          data-tooltip-id="media-player-controls-tooltip"
          data-tooltip-content={t("selectRegion")}
          className="relative aspect-square p-0 h-10"
          onClick={() => setIsSelectingRegion(!isSelectingRegion)}
        >
          <TextCursorInputIcon className="w-6 h-6" />
        </Button>

        <div className="relative">
          <Button
            variant={`${editingRegion ? "secondary" : "ghost"}`}
            data-tooltip-id="media-player-controls-tooltip"
            data-tooltip-content={
              editingRegion ? t("dragRegionBorderToEdit") : t("editRegion")
            }
            className="relative aspect-square p-0 h-10"
            onClick={() => {
              setEditingRegion(!editingRegion);
            }}
          >
            <ScissorsIcon className="w-6 h-6" />
          </Button>

          {editingRegion && (
            <div className="absolute top-0 left-12 flex items-center space-x-2">
              <Button
                variant="secondary"
                className="relative aspect-square p-0 h-10"
                data-tooltip-id="media-player-controls-tooltip"
                data-tooltip-content={t("cancel")}
                onClick={() => {
                  setEditingRegion(false);
                  setTranscriptionDraft(null);
                }}
              >
                <UndoIcon className="w-6 h-6" />
              </Button>
              <Button
                variant="default"
                className="relative aspect-square p-0 h-10"
                data-tooltip-id="media-player-controls-tooltip"
                data-tooltip-content={t("save")}
                onClick={() => {
                  if (!transcriptionDraft) return;

                  EnjoyApp.transcriptions
                    .update(transcription.id, {
                      result: transcriptionDraft,
                    })
                    .then(() => {
                      setTranscriptionDraft(null);
                      setEditingRegion(false);
                    });
                }}
              >
                <SaveIcon className="w-6 h-6" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <Tooltip className="z-10" id="media-player-controls-tooltip" />
    </div>
  );
};
