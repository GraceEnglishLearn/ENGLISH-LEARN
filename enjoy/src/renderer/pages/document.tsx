import { t } from "i18next";
import {
  Button,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  ScrollArea,
  toast,
} from "@renderer/components/ui";
import {
  DocumentHtmlRenderer,
  DocumentEpubRenderer,
  PagePlaceholder,
  DocumentPlayer,
} from "@renderer/components";
import { useState, useContext, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AppSettingsProviderContext,
  MediaShadowProvider,
} from "@renderer/context";
import { ChevronLeftIcon } from "lucide-react";

export default () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [document, setDocument] = useState<DocumentEType | null>(null);
  const { EnjoyApp } = useContext(AppSettingsProviderContext);
  const [displayPlayer, setDisplayPlayer] = useState(false);
  const [playingMetadata, setPlayingMetadata] = useState<{
    section: number;
    paragraph: number;
    text: string;
  } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const fetchDocument = () => {
    EnjoyApp.documents
      .findOne({ id })
      .then((document) => {
        setDocument(document);
      })
      .catch((err) => {
        toast.error(err.message);
      });
  };

  const handleSpeech = (id: string, params: { section: number }) => {
    const { section } = params;
    setDisplayPlayer(true);

    const paragraph = ref.current?.querySelector(`#paragraph-${id}`);
    if (!paragraph) return;

    const text = paragraph.textContent.trim();
    if (!text) return;

    const paragraphIndex = paragraph.getAttribute("data-index") ?? "0";

    setPlayingMetadata({
      section,
      paragraph: parseInt(paragraphIndex),
      text,
    });
  };

  useEffect(() => {
    fetchDocument();
  }, [id]);

  if (!document) {
    return <PagePlaceholder placeholder={t("notFound")} />;
  }

  return (
    <MediaShadowProvider
      layout="compact"
      onCancel={() => setDisplayPlayer(false)}
    >
      <div className="h-screen flex flex-col relative">
        <div className="flex space-x-1 items-center h-12 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeftIcon className="w-5 h-5" />
          </Button>
          <span className="text-sm">{document.title}</span>
        </div>

        <ResizablePanelGroup direction="horizontal" className="p-4">
          <ResizablePanel id="document" order={0} className="">
            <ScrollArea
              ref={ref}
              className="h-full px-4 pb-6 border rounded-lg"
            >
              {document.metadata.extension === "html" && (
                <DocumentHtmlRenderer document={document} />
              )}
              {document.metadata.extension === "epub" && (
                <DocumentEpubRenderer
                  document={document}
                  onSpeech={handleSpeech}
                />
              )}
            </ScrollArea>
          </ResizablePanel>
          {displayPlayer && (
            <>
              <ResizableHandle className="mx-4" />
              <ResizablePanel id="player" order={1}>
                <DocumentPlayer document={document} {...playingMetadata} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </MediaShadowProvider>
  );
};
