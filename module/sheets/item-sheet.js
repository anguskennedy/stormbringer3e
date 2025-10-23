export class StormItemSheet extends foundry.appv1.sheets.ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["storm", "sheet", "item"],
      template: "systems/stormbringer3e/templates/item-sheet.hbs",
      width: 520,
      height: 400
    });
  }

  getData(options) {
    const data = super.getData(options);
    const skillTypes = [
      { id: "agility", label: "Agility" },
      { id: "perception", label: "Perception" },
      { id: "stealth", label: "Stealth" },
      { id: "know", label: "Knowledge" },
      { id: "summoning", label: "Summoning" },
      { id: "manip", label: "Manipulation" },
      { id: "commun", label: "Communication" }
    ];

    return {
      ...data,
      config: {
        ...(data.config ?? {}),
        skillTypes
      }
    };
  }
}
