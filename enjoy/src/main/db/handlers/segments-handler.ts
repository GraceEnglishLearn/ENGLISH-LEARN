import { ipcMain, IpcMainEvent } from "electron";
import { Audio, Segment, Video } from "@main/db/models";

class SegmentsHandler {
  private async find(_event: IpcMainEvent, id: string) {
    const segment = await Segment.findByPk(id);
    return segment.toJSON();
  }

  private async findAll(
    _event: IpcMainEvent,
    params: {
      targetId: string;
      targetType: string;
      segmentIndex: number;
    }
  ) {
    const { targetId, targetType, segmentIndex } = params;
    const segments = await Segment.findAll({
      where: {
        targetId,
        targetType,
        segmentIndex,
      },
      include: [Audio, Video],
    });

    return segments.map((segment) => segment.toJSON());
  }

  private async create(
    _event: IpcMainEvent,
    params: {
      targetId: string;
      targetType: string;
      segmentIndex: number;
    }
  ) {
    const segment = await Segment.generate({
      targetId: params.targetId,
      targetType: params.targetType,
      segmentIndex: params.segmentIndex,
    });
    return segment.toJSON();
  }

  register() {
    ipcMain.handle("segments-create", this.create);
    ipcMain.handle("segments-find", this.find);
    ipcMain.handle("segments-find-all", this.findAll);
  }
}

export const segmentsHandler = new SegmentsHandler();
