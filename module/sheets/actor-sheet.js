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
    console.log("StormActorSheet listeners activated for", this.actor.name);

  html.find("[data-action='roll-attr']").on("click", async ev => {
    const attr = ev.currentTarget.dataset.attr;
    const val = Number(this.actor.system.attributes[attr] ?? 10);
    const roll = new Roll("1d100");
    await roll.evaluate();
    const success = roll.total <= val;
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      flavor: `${attr.toUpperCase()} Check (vs ${val}) → ${success ? "Success" : "Failure"}`
    });
  });

  // Handle inline item field edits (e.g., skills)
  html.find(".item-field").change(ev => {
    const input = ev.currentTarget;
    const itemId = input.dataset.itemId;
    const field = input.dataset.field;
    const value = Number(input.value);
    const item = this.actor.items.get(itemId);
    if (item) item.update({ [field]: value });
  });
  }
}