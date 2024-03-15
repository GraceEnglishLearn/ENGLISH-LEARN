import { ipcMain } from "electron";
import { align } from "echogarden/dist/api/API.js";
import { AlignmentOptions } from "echogarden/dist/api/API";
import { AudioSourceParam } from "echogarden/dist/audio/AudioUtilities";
import path from "path";
import log from "@main/logger";
import url from "url";
import settings from "@main/settings";
import fs from "fs-extra";

const __filename = url.fileURLToPath(import.meta.url);
/*
 * sample files will be in /app.asar.unpacked instead of /app.asar
 */
const __dirname = path
  .dirname(__filename)
  .replace("app.asar", "app.asar.unpacked");

const logger = log.scope("echogarden");
class EchogardenWrapper {
  public align: typeof align;

  constructor() {
    this.align = align;
  }

  async check() {
    const sampleFile = path.join(__dirname, "samples", "jfk.wav");
    try {
      const result = await this.align(
        sampleFile,
        "And so my fellow Americans ask not what your country can do for you",
        {}
      );
      logger.info(result);
      fs.writeJsonSync(
        path.join(settings.cachePath(), "echogarden-check.json"),
        result,
        { spaces: 2 }
      );

      return true;
    } catch (e) {
      logger.error(e);
      return false;
    }
  }

  registerIpcHandlers() {
    ipcMain.handle(
      "echogarden-align",
      async (
        _event,
        input: AudioSourceParam,
        transcript: string,
        options: AlignmentOptions
      ) => {
        return this.align(input, transcript, options);
      }
    );

    ipcMain.handle("echogarden-check", async (_event) => {
      return this.check();
    });
  }
}

export default new EchogardenWrapper();
