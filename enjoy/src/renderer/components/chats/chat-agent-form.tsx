import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Avatar,
  Button,
  Form,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectItem,
  Textarea,
  toast,
} from "@renderer/components/ui";
import { t } from "i18next";

export const ChatAgentForm = (props: {
  agent?: ChatAgentType;
  onSave: (data: ChatAgentDtoType) => void;
  onCancel: () => void;
}) => {
  const { agent, onSave, onCancel } = props;

  const agentFormSchema = z.object({
    type: z.enum(["GPT", "TTS", "STT"]),
    name: z.string().min(1),
    description: z.string().min(1),
    prompt: z.string(),
  });

  const form = useForm<z.infer<typeof agentFormSchema>>({
    resolver: zodResolver(agentFormSchema),
    values: agent || {
      type: "GPT",
      name: t("models.chatAgent.namePlaceholder"),
      description: t("models.chatAgent.descriptionPlaceholder"),
      prompt: t("models.chatAgent.promptPlaceholder"),
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    const { type, name, description, ...config } = data;
    try {
      onSave({
        type,
        avatarUrl: `https://api.dicebear.com/9.x/thumbs/svg?seed=${name}`,
        name,
        description,
        config,
      });
      form.reset();
    } catch (error) {
      toast.error(error.message);
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit}>
        <div className="mb-4">{agent?.id ? t("editAgent") : t("newAgent")}</div>
        <div className="space-y-2 px-2 mb-6">
          {form.watch("name") && (
            <Avatar className="w-12 h-12 border">
              <img
                src={`https://api.dicebear.com/9.x/thumbs/svg?seed=${form.watch(
                  "name"
                )}`}
                alt={form.watch("name")}
              />
            </Avatar>
          )}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("models.chatAgent.type")}</FormLabel>
                <Select {...field}>
                  <SelectItem value="GPT">GPT</SelectItem>
                  <SelectItem value="TTS">TTS</SelectItem>
                  <SelectItem value="STT">STT</SelectItem>
                </Select>
                {form.watch("type") === "GPT" && (
                  <FormDescription>
                    {t("models.chatAgent.typeGptDescription")}
                  </FormDescription>
                )}
                {form.watch("type") === "TTS" && (
                  <FormDescription>
                    {t("models.chatAgent.typeTtsDescription")}
                  </FormDescription>
                )}
                {form.watch("type") === "STT" && (
                  <FormDescription>
                    {t("models.chatAgent.typeSttDescription")}
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("models.chatAgent.name")}</FormLabel>
                <Input
                  placeholder={t("models.chatAgent.namePlaceholder")}
                  required
                  {...field}
                />
                <FormDescription>
                  {t("models.chatAgent.nameDescription")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("models.chatAgent.description")}</FormLabel>
                <Textarea
                  placeholder={t("models.chatAgent.descriptionPlaceholder")}
                  required
                  className="max-h-36"
                  {...field}
                />
                <FormDescription>
                  {t("models.chatAgent.descriptionDescription")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="prompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("models.chatAgent.prompt")}</FormLabel>
                <Textarea
                  placeholder={t("models.chatAgent.promptPlaceholder")}
                  required
                  className="min-h-36 max-h-64"
                  {...field}
                />
                <FormDescription>
                  {t("models.chatAgent.promptDescription")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex items-center justify-end space-x-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t("cancel")}
          </Button>
          <Button type="submit" onClick={onSubmit}>
            {t("save")}
          </Button>
        </div>
      </form>
    </Form>
  );
};
