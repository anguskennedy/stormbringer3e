import { StormActorSheet } from "./actor-sheet.js";

export class StormCreatureSheet extends StormActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["storm", "sheet", "creature"],
      template: "systems/stormbringer3e/templates/creature-sheet.hbs",
      width: 820,
      height: 620
    });
  }

  getData(options) {
    const data = super.getData(options);
    data.actorType = "creature";

    const locale = game.i18n?.lang ?? "en";
    const collator = new Intl.Collator(locale, { sensitivity: "base" });
    data.creatureSkills = this.actor.items
      .filter(item => item.type === "skill")
      .sort((a, b) => collator.compare(a.name ?? "", b.name ?? ""))
      .map(item => ({
        id: item.id,
        name: item.name,
        total: Number(item.system?.base ?? 0)
      }));
    return data;
  }
}
