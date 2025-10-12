export class StormActorSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["storm", "sheet", "actor"],
      template: "systems/stormbringer-lite/templates/actor-sheet.hbs",
      width: 600,
      height: 480
    });
  }

  getData(options) {
    const context = super.getData(options);
    context.config = CONFIG.STORM ?? {};
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("button[data-action='roll-attr']").on("click", ev => {
      const attr = ev.currentTarget.dataset.attr;
      const val = Number(this.actor.system.attributes[attr] ?? 10);
      game.storm.roll(`${val}d1`); // demo roll showing chat output
    });
  }
}