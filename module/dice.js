export class StormDice {
  static async roll(formula = "1d100", data = {}, options = {}) {
    const r = await (new Roll(formula, data).roll({async: true}));
    r.toMessage({ flavor: game.i18n.localize("STORM.roll") });
    return r;
  }
}