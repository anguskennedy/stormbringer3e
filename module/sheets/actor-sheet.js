export class StormActorSheet extends foundry.appv1.sheets.ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["storm", "sheet", "actor"],
      template: "systems/stormbringer3e/templates/actor-sheet.hbs",
      width: 980,
      height: 720
    });
  }

  getData(options) {
    const data = super.getData(options);
    const actorData = this.actor.system;

    const skillTypeKeys = ["agility", "percept", "stealth", "know", "summoning", "manip", "commun"];
    const skillsByType = Object.fromEntries(skillTypeKeys.map(key => [key, []]));

    const locale = game.i18n?.lang ?? "en";
    const collator = new Intl.Collator(locale, { sensitivity: "base" });

    const skillItems = this.actor.items
      .filter(item => item.type === "skill")
      .sort((a, b) => collator.compare(a.name ?? "", b.name ?? ""));

    for (const skill of skillItems) {
      const typeKey = skill.system?.type ?? "";
      if (!skillsByType[typeKey]) skillsByType[typeKey] = [];
      skillsByType[typeKey].push(skill);
    }

    const combat = actorData.combat ?? {};
    combat.damageMods ??= {};
    combat.damageMods.hand ??= "";
    combat.damageMods.projectile ??= "";

    const attackBonus = Number(combat.attackBonus ?? 0);
    const parryBonus = Number(combat.parryBonus ?? 0);
    const weaponStats = actorData.weaponStats ?? {};

    const weaponRows = this.actor.items
      .filter(item => item.type === "weapon")
      .sort((a, b) => collator.compare(a.name ?? "", b.name ?? ""))
      .map(item => {
        const system = item.system ?? {};
        const stats = weaponStats[item.id] ?? {};
        const attackBase = Number(stats.attack ?? 0);
        const parryBase = Number(stats.parry ?? 0);
        const category = system.category === "projectile" ? "projectile" : "hand";
        const dmgMod = combat.damageMods?.[category] ?? "";
        const damageBase = system.damage ?? "";

        const damageDisplayParts = [];
        const damageFormulaParts = [];

        const addDamagePart = (part) => {
          const trimmed = (part ?? "").trim();
          if (!trimmed) return;
          damageDisplayParts.push(trimmed);
          const isFirst = damageFormulaParts.length === 0;
          if (isFirst) {
            damageFormulaParts.push(trimmed);
          } else if (/^[+-]/.test(trimmed)) {
            damageFormulaParts.push(trimmed);
          } else {
            damageFormulaParts.push(`+ ${trimmed}`);
          }
        };

        addDamagePart(damageBase);
        addDamagePart(dmgMod);

        const damageDisplay = damageDisplayParts.join(" ").trim();
        const damageFormula = damageFormulaParts.join(" ").trim().replace(/\s+/g, " ");

        const attackDisplay = attackBase + attackBonus;
        const parryDisplay = parryBase + parryBonus;
        return {
          id: item.id,
          name: item.name,
          system,
          attackBase,
          parryBase,
          attackDisplay,
          parryDisplay,
          damageDisplay,
          damageFormula,
          weaponCategory: category
        };
      });

    return {
      ...data,
      actor: this.actor,
      system: actorData,
      items: this.actor.items.contents,
      config: CONFIG.STORM ?? {},
      skillsByType,
      weaponRows
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    console.log("StormActorSheet listeners activated for", this.actor.name);

  html.find("[data-action='roll-attr']").on("click", async ev => {
    const attr = ev.currentTarget.dataset.attr;
    const val = Number(this.actor.system.attributes[attr] ?? 10);
    const roll = await new Roll("1d100").evaluate({async: true});
    const success = roll.total <= val;
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      flavor: `${attr.toUpperCase()} Check (vs ${val}) → ${success ? "Success" : "Failure"}`
    });
  });

  // Handle skill rolls when clicking the skill name
  html.find("[data-action='roll-skill']").on("click", async ev => {
    const element = ev.currentTarget;
    const itemId = element.dataset.itemId;
    const skill = this.actor.items.get(itemId);
    if (!skill) return;

    const target = Number(skill.system?.base ?? 0);
    const roll = await new Roll("1d100").evaluate({async: true});
    const success = roll.total <= target;
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      flavor: `${skill.name} Check (vs ${target}%) → ${success ? "Success" : "Failure"}`
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

  html.find(".weapon-stat-input").change(ev => {
    const input = ev.currentTarget;
    const weaponId = input.dataset.weaponId;
    const stat = input.dataset.stat;
    if (!weaponId || !stat) return;
    const combat = this.actor.system?.combat ?? {};
    const bonus = stat === "attack"
      ? Number(combat.attackBonus ?? 0)
      : Number(combat.parryBonus ?? 0);
    const totalValue = Number(input.value) || 0;
    const baseValue = totalValue - bonus;
    const path = `system.weaponStats.${weaponId}.${stat}`;
    this.actor.update({ [path]: baseValue });
  });

  html.find(".weapon-roll").on("click", ev => this._rollWeapon(ev));
  html.find(".weapon-damage-roll").on("click", ev => this._rollWeaponDamage(ev));
  html.find(".weapon-row[data-item-id]").on("contextmenu", ev => this._onWeaponContextMenu(ev));
  }

  async _rollWeapon(event) {
    const button = event.currentTarget;
    const weaponId = button.dataset.weaponId;
    const rollType = button.dataset.rollType;
    if (!weaponId || !rollType) return;

    const weapon = this.actor.items.get(weaponId);
    const weaponName = weapon?.name ?? game.i18n.localize("storm.weapon");

    const stats = this.actor.system.weaponStats?.[weaponId] ?? {};
    const combat = this.actor.system.combat ?? {};
    const base = Number(stats[rollType] ?? 0);
    const bonusKey = rollType === "parry" ? "parryBonus" : "attackBonus";
    const bonus = Number(combat[bonusKey] ?? 0);
    const target = base + bonus;

    const roll = await new Roll("1d100").evaluate({async: true});
    const success = roll.total <= target;
    const label = `${weaponName} ${rollType === "parry" ? "Parry" : "Attack"} (${target}%)`;
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      flavor: `${label} → ${success ? "Success" : "Failure"}`
    });
  }

  async _rollWeaponDamage(event) {
    const button = event.currentTarget;
    const weaponId = button.dataset.weaponId;
    const formula = button.dataset.damageFormula;
    if (!weaponId || !formula) return;

    const weapon = this.actor.items.get(weaponId);
    const weaponName = weapon?.name ?? game.i18n.localize("storm.weapon");

    const roll = await new Roll(formula).evaluate({async: true});
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      flavor: `${weaponName} Damage (${formula})`
    });
  }

  async _onWeaponContextMenu(event) {
    event.preventDefault();
    const row = event.currentTarget;
    const weaponId = row.dataset.itemId;
    if (!weaponId) return;
    const weapon = this.actor.items.get(weaponId);
    if (!weapon) return;

    await Dialog.confirm({
      title: "Delete Weapon",
      content: `<p>Are you sure you want to delete <strong>${weapon.name}</strong>?</p>`,
      yes: () => weapon.delete(),
      options: { jQuery: false }
    });
  }
}
