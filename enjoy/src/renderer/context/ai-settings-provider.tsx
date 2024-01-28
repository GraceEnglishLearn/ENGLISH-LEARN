import { createContext, useEffect, useState, useContext } from "react";
import { AppSettingsProviderContext } from "@renderer/context";

type AISettingsProviderState = {
  openai?: LlmProviderType;
  setOpenai?: (config: LlmProviderType) => void;
  googleGenerativeAi?: LlmProviderType;
  setGoogleGenerativeAi?: (config: LlmProviderType) => void;
  defaultEngine?: string;
  setDefaultEngine?: (engine: string) => void;
  currentEngine?: LlmProviderType;
};

const initialState: AISettingsProviderState = {};

export const AISettingsProviderContext =
  createContext<AISettingsProviderState>(initialState);

export const AISettingsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [defaultEngine, setDefaultEngine] = useState<string>(null);
  const [openai, setOpenai] = useState<LlmProviderType>(null);
  const [googleGenerativeAi, setGoogleGenerativeAi] =
    useState<LlmProviderType>(null);
  const { EnjoyApp, apiUrl, user } = useContext(AppSettingsProviderContext);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const _openai = await EnjoyApp.settings.getLlm("openai");
    if (_openai) setOpenai(_openai);

    const _googleGenerativeAi = await EnjoyApp.settings.getLlm(
      "googleGenerativeAi"
    );
    if (_googleGenerativeAi) setGoogleGenerativeAi(_googleGenerativeAi);

    const _defaultEngine = await EnjoyApp.settings.getDefaultEngine();
    if (_defaultEngine) {
      setDefaultEngine(_defaultEngine);
    } else if (_openai.key) {
      EnjoyApp.settings.setDefaultEngine("openai").then(() => {
        setDefaultEngine("openai");
      });
    } else {
      EnjoyApp.settings.setDefaultEngine("enjoyai").then(() => {
        setDefaultEngine("enjoyai");
      });
    }
  };

  const handleSetLlm = async (
    name: SupportedLlmProviderType,
    config: LlmProviderType
  ) => {
    await EnjoyApp.settings.setLlm(name, config);
    const _config = await EnjoyApp.settings.getLlm(name);

    switch (name) {
      case "openai":
        setOpenai(_config);
        break;
      case "googleGenerativeAi":
        setGoogleGenerativeAi(_config);
        break;
    }
  };

  return (
    <AISettingsProviderContext.Provider
      value={{
        defaultEngine,
        setDefaultEngine: (engine: "openai" | "enjoyai") => {
          EnjoyApp.settings.setDefaultEngine(engine).then(() => {
            setDefaultEngine(engine);
          });
        },
        currentEngine: {
          openai: openai,
          enjoyai: {
            key: user.accessToken,
            baseUrl: `${apiUrl}/api/ai`,
          },
        }[defaultEngine],
        openai,
        setOpenai: (config: LlmProviderType) => handleSetLlm("openai", config),
        googleGenerativeAi,
        setGoogleGenerativeAi: (config: LlmProviderType) =>
          handleSetLlm("googleGenerativeAi", config),
      }}
    >
      {children}
    </AISettingsProviderContext.Provider>
  );
};
