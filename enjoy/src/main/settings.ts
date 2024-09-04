import settings from "electron-settings";
import { LIBRARY_PATH_SUFFIX, DATABASE_NAME, WEB_API_URL } from "@/constants";
import { ipcMain, app } from "electron";
import path from "path";
import fs from "fs-extra";
import * as i18n from "i18next";

if (process.env.SETTINGS_PATH) {
  settings.configure({
    dir: process.env.SETTINGS_PATH,
    prettify: true,
  });
}

const libraryPath = () => {
  const _library = settings.getSync("library");

  if (!_library || typeof _library !== "string") {
    settings.setSync(
      "library",
      process.env.LIBRARY_PATH ||
        path.join(app.getPath("documents"), LIBRARY_PATH_SUFFIX)
    );
  } else if (path.parse(_library).base !== LIBRARY_PATH_SUFFIX) {
    settings.setSync("library", path.join(_library, LIBRARY_PATH_SUFFIX));
  }

  const library = settings.getSync("library") as string;
  fs.ensureDirSync(library);

  return library;
};

const cachePath = () => {
  const tmpDir = path.join(libraryPath(), "cache");
  fs.ensureDirSync(tmpDir);

  return tmpDir;
};

const dbPath = () => {
  const dbName = app.isPackaged
    ? `${DATABASE_NAME}.sqlite`
    : `${DATABASE_NAME}_dev.sqlite`;
  return path.join(userDataPath(), dbName);
};

const whisperConfig = (): WhisperConfigType => {
  const model = settings.getSync("whisper.model") as string;

  let service = settings.getSync(
    "whisper.service"
  ) as WhisperConfigType["service"];

  if (!service) {
    settings.setSync("whisper.service", "azure");
    service = "azure";
  }

  return {
    service,
    availableModels: settings.getSync(
      "whisper.availableModels"
    ) as WhisperConfigType["availableModels"],
    modelsPath: settings.getSync("whisper.modelsPath") as string,
    model,
  };
};

const userDataPath = () => {
  const userData = path.join(
    libraryPath(),
    settings.getSync("user.id").toString()
  );
  fs.ensureDirSync(userData);

  return userData;
};

const apiUrl = () => {
  const url: string = settings.getSync("apiUrl") as string;
  return process.env.WEB_API_URL || url || WEB_API_URL;
};

export default {
  registerIpcHandlers: () => {
    ipcMain.handle("settings-get", (_event, key) => {
      return settings.getSync(key);
    });

    ipcMain.handle("settings-set", (_event, key, value) => {
      settings.setSync(key, value);
    });

    ipcMain.handle("settings-get-library", (_event) => {
      libraryPath();
      return settings.getSync("library");
    });

    ipcMain.handle("settings-set-library", (_event, library) => {
      if (path.parse(library).base === LIBRARY_PATH_SUFFIX) {
        settings.setSync("library", library);
      } else {
        const dir = path.join(library, LIBRARY_PATH_SUFFIX);
        fs.ensureDirSync(dir);
        settings.setSync("library", dir);
      }
    });

    ipcMain.handle("settings-get-user", (_event) => {
      return settings.getSync("user");
    });

    ipcMain.handle("settings-set-user", (_event, user) => {
      settings.setSync("user", user);
    });

    ipcMain.handle("settings-get-whisper-model", (_event) => {
      return settings.getSync("whisper.model");
    });

    ipcMain.handle("settings-set-whisper-model", (_event, model) => {
      settings.setSync("whisper.model", model);
    });

    ipcMain.handle("settings-get-user-data-path", (_event) => {
      return userDataPath();
    });

    ipcMain.handle("settings-get-api-url", (_event) => {
      return settings.getSync("apiUrl");
    });

    ipcMain.handle("settings-set-api-url", (_event, url) => {
      return settings.setSync("apiUrl", url);
    });
  },
  cachePath,
  libraryPath,
  userDataPath,
  dbPath,
  whisperConfig,
  apiUrl,
  ...settings,
};
