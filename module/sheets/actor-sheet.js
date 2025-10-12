export class StormActorSheet extends foundry.appv1.sheets.ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["storm", "sheet", "actor"],
      template: "systems/stormbringer3e/templates/actor-sheet.hbs",
      width: 600,
      height: 480
    });
  }

getData(options) {
  const data = super.getData(options);
  const actorData = this.actor.system;

  // expose data for Handlebars
  return {
    ...data,
    actor: this.actor,
    system: actorData,
    items: this.actor.items.contents,
    config: CONFIG.STORM ?? {}
  };
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