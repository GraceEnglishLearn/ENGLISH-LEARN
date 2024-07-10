import { AppSettingsProviderContext } from "@renderer/context";
import { useContext, useEffect, useRef, useState } from "react";
import {
  Button,
  Input,
  ScrollArea,
  Textarea,
  toast,
} from "@renderer/components/ui";
import { LlmMessage, LoaderSpin } from "@renderer/components";
import { t } from "i18next";
import { SendIcon } from "lucide-react";
import autosize from "autosize";

export const LlmChat = (props: {
  id?: string;
  agentType?: string;
  agentId?: string;
}) => {
  const { webApi } = useContext(AppSettingsProviderContext);
  const { id, agentType, agentId } = props;

  const [llmChat, setLlmChat] = useState<LLmChatType | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [query, setQuery] = useState("");

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  const handleSubmit = () => {};

  const resizeTextarea = () => {
    if (!inputRef?.current) return;

    inputRef.current.style.height = "auto";
    inputRef.current.style.height = inputRef.current.scrollHeight + "px";
  };

  const findOrCreateChat = async () => {
    if (id) {
      setLoading(true);
      webApi
        .llmChat(id)
        .then((chat) => {
          setLlmChat(chat);
        })
        .catch((err) => {
          toast.error(err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (agentId && agentType) {
      setLoading(true);
      webApi
        .createLlmChat({ agentId, agentType })
        .then((chat) => {
          setLlmChat(chat);
        })
        .catch((err) => {
          toast.error(err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

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
  }, [id, inputRef.current]);

  useEffect(() => {
    findOrCreateChat();
  }, [id, agentType, agentId]);

  if (loading) return <LoaderSpin />;

  if (!llmChat)
    return (
      <div className="flex items-center justify-center py-6">{t("noData")}</div>
    );

  return (
    <ScrollArea className="h-full max-w-screen-lg mx-auto p-4 pb-24 relative">
      <LlmMessage
        llmMessage={{
          response: "What can I help you with today?",
          agent: llmChat.agent,
          chat: llmChat,
        }}
      />
      <div className="bg-muted px-4 absolute w-full bottom-4 left-0 z-50">
        <div className="focus-within:bg-background pr-4 py-2 flex items-end space-x-4 rounded-lg shadow-lg border scrollbar">
          <Textarea
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("pressEnterToSend")}
            data-testid="conversation-page-input"
            className="text-base px-4 py-0 shadow-none focus-visible:outline-0 focus-visible:ring-0 border-none min-h-[1rem] max-h-[70vh] scrollbar-thin !overflow-x-hidden"
          />
          <div className="h-12 py-1">
            <Button
              type="submit"
              ref={submitRef}
              disabled={submitting || !query}
              data-testid="llm-chat-submit"
              onClick={() => handleSubmit()}
              data-tooltip-id="global-tooltip"
              data-tooltip-content={t("send")}
              className="h-10"
            >
              <SendIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};
