import { StormNPCSheet } from "./npc-sheet.js";

export class StormDemonSheet extends StormNPCSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["storm", "sheet", "npc", "demon"],
      template: "systems/stormbringer3e/templates/demon-sheet.hbs"
    });
  }

  getData(options) {
    const data = super.getData(options);
    data.actorType = "demon";
    return data;
  }
}
