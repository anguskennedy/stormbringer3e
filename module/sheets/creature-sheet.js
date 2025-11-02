import { StormActorSheet } from "./actor-sheet.js";

export class StormCreatureSheet extends StormActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["storm", "sheet", "creature"],
      template: "systems/stormbringer3e/templates/creature-sheet.hbs",
      width: 720,
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

    const weaponData = Array.isArray(this.actor.system.creatureWeapons)
      ? this.actor.system.creatureWeapons
      : [];
    data.creatureWeapons = weaponData.map((weapon, index) => ({
      index,
      name: weapon?.name ?? "",
      attack: Number(weapon?.attack ?? 0) || 0,
      damage: weapon?.damage ?? "",
      parry: Number(weapon?.parry ?? 0) || 0
    }));

    const hp = this.actor.system.resources?.hp ?? {};
    const hpMode = hp.mode ?? "auto";
    const modeOptions = [
      { value: "auto", label: "CON + SIZ - 12" },
      { value: "con", label: "CON" },
      { value: "conPlusSix", label: "CON + 6" },
      { value: "conPlusSiz", label: "CON + SIZ" },
      { value: "custom", label: "Custom" }
    ];
    data.creatureHpModes = modeOptions.map(option => ({
      ...option,
      selected: option.value === hpMode
    }));
    data.creatureHpIsCustom = hpMode === "custom";
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    const creatureRolls = html.find(".creature-weapon-value .weapon-roll");
    creatureRolls.off("click");
    creatureRolls.on("click", ev => this._onCreatureWeaponRoll(ev));
    html.find(".creature-weapon-remove").off("click");
    html.find(".creature-weapon-remove").on("click", ev => this._removeCreatureWeapon(ev));
  }

  async _onCreatureWeaponRoll(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const index = Number(button.dataset.index);
    const rollType = button.dataset.rollType;
    if (Number.isNaN(index) || !rollType) return;

    const row = button.closest(".creature-weapon-row");
    const nameInput = row?.querySelector("input[name*='creatureWeapons'][name$='.name']");
    const attackInput = row?.querySelector("input[name*='creatureWeapons'][name$='.attack']");
    const parryInput = row?.querySelector("input[name*='creatureWeapons'][name$='.parry']");

    const name = nameInput?.value?.trim() || "Weapon";
    if (rollType === "damage") {
      const damageInput = row?.querySelector("input[name*='creatureWeapons'][name$='.damage']");
      const formula = damageInput?.value?.trim();
      if (!formula) return;
      const roll = await new Roll(formula).evaluate({ async: true });
      const flavor = `${name} Damage (${formula})`;
      await this._sendDamageRollMessage({
        roll,
        flavor,
        label: flavor
      });
    } else {
      const attackValue = Number(attackInput?.value ?? 0) || 0;
      const parryValue = Number(parryInput?.value ?? 0) || 0;
      const value = rollType === "parry" ? parryValue : attackValue;
      const roll = await new Roll("1d100").evaluate({ async: true });
      const { success, isCritical } = this._evaluateRoll(value, roll.total);
      const resultLabel = this._formatRollResult({ success, isCritical });
      const label = `${name} ${rollType === "parry" ? "Parry" : "Attack"} (${value}%)`;
      await this._sendD100RollMessage({
        roll,
        flavor: `${label} → ${resultLabel}`,
        label,
        target: value,
        resultLabel,
        allowPush: false
      });
    }
  }
}
