import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogHeader,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Button,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  toast,
} from "@renderer/components/ui";
import { SpeechPlayer, ConversationsList } from "@renderer/components";
import { useContext, useState } from "react";
import { AppSettingsProviderContext } from "@renderer/context";
import {
  CheckCircleIcon,
  LoaderIcon,
  AlertCircleIcon,
  CopyIcon,
  CheckIcon,
  Share2Icon,
  ForwardIcon,
} from "lucide-react";
import { useCopyToClipboard } from "@uidotdev/usehooks";
import { t } from "i18next";
import { useNavigate } from "react-router-dom";
import Markdown from "react-markdown";

export const UserMessageComponent = (props: {
  message: MessageType;
  configuration?: { [key: string]: any };
  onResend?: () => void;
  onRemove?: () => void;
}) => {
  const { message, onResend, onRemove } = props;
  const speech = message.speeches?.[0];
  const { user, webApi } = useContext(AppSettingsProviderContext);
  const [_, copyToClipboard] = useCopyToClipboard();
  const [copied, setCopied] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleShare = async () => {
    if (message.role === "user") {
      const content = message.content;
      webApi
        .createPost({
          metadata: {
            type: "prompt",
            content,
          },
        })
        .then(() => {
          toast.success(t("sharedSuccessfully"), {
            description: t("sharedPrompt"),
            action: {
              label: t("view"),
              onClick: () => {
                navigate("/community");
              },
            },
            actionButtonStyle: {
              backgroundColor: "var(--primary)",
            },
          });
        })
        .catch((err) => {
          toast.error(t("shareFailed"), { description: err.message });
        });
    }
  };

  return (
    <div
      id={`message-${message.id}`}
      className="flex items-end justify-end space-x-2 pl-10"
    >
      <DropdownMenu>
        <div className="flex flex-col gap-2 px-4 py-2 bg-sky-500/30 border-sky-500 rounded-lg shadow-sm w-full">
          <Markdown className="select-text prose">{message.content}</Markdown>

          {Boolean(speech) && <SpeechPlayer speech={speech} />}

          <div className="flex items-center justify-end space-x-2">
            {message.createdAt ? (
              <CheckCircleIcon
                data-tooltip-id="global-tooltip"
                data-tooltip-content={t("sent")}
                className="w-3 h-3"
              />
            ) : message.status === "pending" ? (
              <LoaderIcon
                data-tooltip-id="global-tooltip"
                data-tooltip-content={t("sending")}
                className="w-3 h-3 animate-spin"
              />
            ) : (
              message.status === "error" && (
                <DropdownMenuTrigger>
                  <AlertCircleIcon className="w-3 h-3 text-destructive" />
                </DropdownMenuTrigger>
              )
            )}
            {copied ? (
              <CheckIcon className="w-3 h-3 text-green-500" />
            ) : (
              <CopyIcon
                data-tooltip-id="global-tooltip"
                data-tooltip-content={t("copy")}
                className="w-3 h-3 cursor-pointer"
                onClick={() => {
                  copyToClipboard(message.content);
                  setCopied(true);
                  setTimeout(() => {
                    setCopied(false);
                  }, 3000);
                }}
              />
            )}

            <Dialog>
              <DialogTrigger>
                <ForwardIcon
                  data-tooltip-id="global-tooltip"
                  data-tooltip-content={t("forward")}
                  className="w-3 h-3 cursor-pointer"
                />
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("forward")}</DialogTitle>
                </DialogHeader>
                <div className="">
                  <ConversationsList
                    prompt={message.content}
                    excludedIds={[message.conversationId]}
                  />
                </div>
              </DialogContent>
            </Dialog>

            {message.createdAt && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Share2Icon
                    data-tooltip-id="global-tooltip"
                    data-tooltip-content={t("share")}
                    className="w-3 h-3 cursor-pointer"
                  />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("sharePrompt")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("areYouSureToShareThisPromptToCommunity")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Button variant="default" onClick={handleShare}>
                        {t("share")}
                      </Button>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={onResend}>
            <span className="mr-auto capitalize">{t("resend")}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onRemove}>
            <span className="mr-auto text-destructive capitalize">
              {t("remove")}
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Avatar className="w-8 h-8 bg-background">
        <AvatarImage src={user.avatarUrl} />
        <AvatarFallback className="bg-primary text-white capitalize">
          {user.name[0]}
        </AvatarFallback>
      </Avatar>
    </div>
  );
};
