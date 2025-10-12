export class StormItemSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["storm", "sheet", "item"],
      template: "systems/stormbringer-lite/templates/item-sheet.hbs",
      width: 520,
      height: 400
    });
  }
}